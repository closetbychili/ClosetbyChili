"""
Closet by Chilli — Concurrency-Safe Coupon Redemption Service.

Complies with 04-backend-architecture.md, 06-domain-model.md, and Sprint A5.3.
Manages durable coupon reservations and redemptions with strict concurrency safety:
- Atomic database transactions.
- Row-level locking on coupons via select_for_update().
- Idempotency protection for repeated requests.
- Reservation expiration TTL and capacity restoration.
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from apps.orders.coupon_eligibility_service import (
    CouponEligibilityReasonCode,
    CouponEligibilityResult,
    evaluate_coupon_eligibility,
    get_active_coupon_usage_count,
    get_customer_coupon_usage_count,
)
from apps.orders.models import Coupon, CouponRedemption, Order

if TYPE_CHECKING:
    from apps.accounts.models import User


class CouponRedemptionError(ValidationError):
    """Base exception for coupon redemption failures."""

    def __init__(self, message: str, code: str | None = None, result: CouponEligibilityResult | None = None):
        super().__init__(message, code=code)
        self.result = result


class CouponNotEligibleError(CouponRedemptionError):
    """Raised when a coupon cannot be reserved or redeemed due to failed eligibility."""

    def __init__(self, result: CouponEligibilityResult):
        super().__init__(
            message=result.message,
            code=result.reason_code,
            result=result,
        )


def reserve_coupon_redemption(
    coupon_id: uuid.UUID | Coupon,
    customer: User,
    order: Order | None = None,
    idempotency_key: str | None = None,
    ttl_seconds: int = 900,  # 15 minutes default TTL
    subtotal: Decimal | None = None,
    items: Any = None,
) -> CouponRedemption:
    """
    Safely reserves capacity for a coupon under atomic transaction and row-level lock.

    Guarantees:
    - Atomically locks the Coupon row with select_for_update() to prevent race conditions.
    - Idempotency: Returns existing active reservation if the same idempotency key or order is reused.
    - Checks eligibility and remaining capacity inside the locked transaction.
    - Creates a CouponRedemption in RESERVED state with expiration TTL.
    """
    raw_coupon_id = coupon_id.id if isinstance(coupon_id, Coupon) else coupon_id
    now = timezone.now()
    expires_at = now + timedelta(seconds=ttl_seconds)

    with transaction.atomic():
        # 1. Acquire row lock on Coupon
        try:
            coupon = Coupon.objects.select_for_update().get(id=raw_coupon_id)
        except Coupon.DoesNotExist:
            raise CouponRedemptionError("Coupon does not exist.", code="COUPON_NOT_FOUND")

        # 2. Check Idempotency Key
        if idempotency_key:
            existing = CouponRedemption.objects.filter(
                customer=customer,
                idempotency_key=idempotency_key,
            ).first()
            if existing:
                if existing.state == CouponRedemption.State.REDEEMED:
                    return existing
                if existing.state == CouponRedemption.State.RESERVED and existing.is_reservation_active(now):
                    return existing
                # If expired or released, we allow re-reservation using new record or updating if needed

        # 3. Check Order duplicate
        if order is not None:
            existing_for_order = CouponRedemption.objects.filter(
                coupon=coupon,
                order=order,
            ).first()
            if existing_for_order:
                if existing_for_order.state in (CouponRedemption.State.RESERVED, CouponRedemption.State.REDEEMED):
                    return existing_for_order

        # 4. Evaluate eligibility under row lock
        eligibility = evaluate_coupon_eligibility(
            coupon=coupon,
            customer=customer,
            subtotal=subtotal,
            items=items,
            now=now,
        )
        if not eligibility.eligible:
            raise CouponNotEligibleError(eligibility)

        # 5. Create reservation record
        redemption = CouponRedemption.objects.create(
            coupon=coupon,
            customer=customer,
            order=order,
            state=CouponRedemption.State.RESERVED,
            idempotency_key=idempotency_key,
            reserved_at=now,
            expires_at=expires_at,
        )
        return redemption


def finalize_coupon_redemption(
    redemption: CouponRedemption | uuid.UUID,
    order: Order | None = None,
    discount_amount: Decimal = Decimal("0.00"),
    currency: str = "INR",
) -> CouponRedemption:
    """
    Finalizes a coupon redemption upon successful checkout and payment.

    Guarantees:
    - Atomically locks the CouponRedemption row.
    - Idempotent: If already REDEEMED, safely returns the existing finalized record.
    - Prevents finalization of RELEASED records.
    - If reservation expired, re-checks capacity under Coupon lock before granting finalization.
    - Transitions state to REDEEMED and takes an immutable snapshot of discount_amount.
    """
    redemption_id = redemption.id if isinstance(redemption, CouponRedemption) else redemption
    now = timezone.now()

    with transaction.atomic():
        try:
            locked_redemption = (
                CouponRedemption.objects.select_for_update()
                .select_related("coupon", "customer")
                .get(id=redemption_id)
            )
        except CouponRedemption.DoesNotExist:
            raise CouponRedemptionError("Coupon redemption record does not exist.", code="REDEMPTION_NOT_FOUND")

        # 1. Idempotency: If already finalized, return immediately
        if locked_redemption.state == CouponRedemption.State.REDEEMED:
            return locked_redemption

        # 2. Prevent finalized of cancelled/released redemptions
        if locked_redemption.state == CouponRedemption.State.RELEASED:
            raise CouponRedemptionError("Cannot finalize an already released redemption.", code="ALREADY_RELEASED")

        coupon = Coupon.objects.select_for_update().get(id=locked_redemption.coupon_id)

        # 3. Check if reservation was expired
        if locked_redemption.expires_at and locked_redemption.expires_at <= now:
            # Re-verify global capacity hasn't been exhausted while expired
            if coupon.usage_limit is not None:
                current_usage = get_active_coupon_usage_count(coupon, now=now)
                if current_usage >= coupon.usage_limit:
                    raise CouponNotEligibleError(
                        CouponEligibilityResult(
                            eligible=False,
                            reason_code=CouponEligibilityReasonCode.GLOBAL_USAGE_LIMIT_REACHED,
                            message="Reservation expired and coupon usage limit has now been reached.",
                        )
                    )

        # 4. Finalize
        if order is not None:
            locked_redemption.order = order

        locked_redemption.state = CouponRedemption.State.REDEEMED
        locked_redemption.discount_amount = max(Decimal("0.00"), discount_amount)
        locked_redemption.currency = (currency or "INR").upper()
        locked_redemption.finalized_at = now
        locked_redemption.save(
            update_fields=["order", "state", "discount_amount", "currency", "finalized_at", "updated_at"]
        )
        return locked_redemption


def release_coupon_redemption(
    redemption: CouponRedemption | uuid.UUID,
    reason: str = "",
) -> CouponRedemption:
    """
    Releases a reservation or cancels a redemption (e.g. order cancelled, checkout abandoned).
    Restores usage capacity immediately.
    """
    redemption_id = redemption.id if isinstance(redemption, CouponRedemption) else redemption
    now = timezone.now()

    with transaction.atomic():
        try:
            locked_redemption = CouponRedemption.objects.select_for_update().get(id=redemption_id)
        except CouponRedemption.DoesNotExist:
            raise CouponRedemptionError("Coupon redemption record does not exist.", code="REDEMPTION_NOT_FOUND")

        if locked_redemption.state == CouponRedemption.State.RELEASED:
            return locked_redemption

        locked_redemption.state = CouponRedemption.State.RELEASED
        locked_redemption.released_at = now
        locked_redemption.release_reason = reason
        locked_redemption.save(update_fields=["state", "released_at", "release_reason", "updated_at"])
        return locked_redemption


def direct_redeem_coupon(
    coupon_id: uuid.UUID | Coupon,
    customer: User,
    order: Order,
    discount_amount: Decimal,
    currency: str = "INR",
    idempotency_key: str | None = None,
    subtotal: Decimal | None = None,
    items: Any = None,
) -> CouponRedemption:
    """
    Atomically checks eligibility, enforces usage limits, and finalizes a redemption in a single step.
    Useful for non-reservation workflows.
    """
    raw_coupon_id = coupon_id.id if isinstance(coupon_id, Coupon) else coupon_id
    now = timezone.now()

    with transaction.atomic():
        # 1. Lock coupon
        try:
            coupon = Coupon.objects.select_for_update().get(id=raw_coupon_id)
        except Coupon.DoesNotExist:
            raise CouponRedemptionError("Coupon does not exist.", code="COUPON_NOT_FOUND")

        # 2. Check duplicate for this order
        if order is not None:
            existing_for_order = CouponRedemption.objects.filter(
                coupon=coupon,
                order=order,
            ).first()
            if existing_for_order:
                if existing_for_order.state == CouponRedemption.State.REDEEMED:
                    return existing_for_order

        # 3. Check idempotency key
        if idempotency_key:
            existing = CouponRedemption.objects.filter(
                customer=customer,
                idempotency_key=idempotency_key,
            ).first()
            if existing and existing.state == CouponRedemption.State.REDEEMED:
                return existing

        # 4. Check eligibility
        eligibility = evaluate_coupon_eligibility(
            coupon=coupon,
            customer=customer,
            subtotal=subtotal,
            items=items,
            now=now,
        )
        if not eligibility.eligible:
            raise CouponNotEligibleError(eligibility)

        # 5. Create finalized redemption
        redemption = CouponRedemption.objects.create(
            coupon=coupon,
            customer=customer,
            order=order,
            state=CouponRedemption.State.REDEEMED,
            discount_amount=max(Decimal("0.00"), discount_amount),
            currency=(currency or "INR").upper(),
            idempotency_key=idempotency_key,
            reserved_at=now,
            finalized_at=now,
        )
        return redemption
