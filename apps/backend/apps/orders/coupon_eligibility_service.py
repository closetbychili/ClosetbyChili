"""
Closet by Chilli — Coupon Eligibility Service.

Complies with 04-backend-architecture.md, 06-domain-model.md, and Sprint A5.3.
Provides pure, reusable business logic to evaluate whether a customer, order subtotal,
and target catalog items satisfy a coupon's eligibility requirements.

Eligibility checks are read-only and never mutate database state or increment counters.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Iterable

from django.db.models import Q
from django.utils import timezone

from apps.orders.coupon_targeting_service import product_matches_coupon_target
from apps.orders.models import Coupon, CouponRedemption, Order

if TYPE_CHECKING:
    from apps.accounts.models import User


class CouponEligibilityReasonCode:
    """Stable reason codes for coupon eligibility evaluations."""

    COUPON_INACTIVE = "COUPON_INACTIVE"
    COUPON_NOT_STARTED = "COUPON_NOT_STARTED"
    COUPON_EXPIRED = "COUPON_EXPIRED"
    GLOBAL_USAGE_LIMIT_REACHED = "GLOBAL_USAGE_LIMIT_REACHED"
    CUSTOMER_USAGE_LIMIT_REACHED = "CUSTOMER_USAGE_LIMIT_REACHED"
    FIRST_ORDER_ONLY = "FIRST_ORDER_ONLY"
    MIN_SUBTOTAL_NOT_MET = "MIN_SUBTOTAL_NOT_MET"
    INVALID_TARGETING = "INVALID_TARGETING"


@dataclass(frozen=True)
class CouponEligibilityResult:
    """
    Structured outcome of a coupon eligibility evaluation.
    """

    eligible: bool
    reason_code: str | None = None
    message: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "eligible": self.eligible,
            "reason_code": self.reason_code,
            "message": self.message,
        }


def has_customer_completed_first_order(customer: User | None) -> bool:
    """
    Determines whether a customer has already completed their first order.

    Closet by Chilli Lifecycle Rule:
    - Counts qualifying successful purchases:
      1. Any Order with payment_status == PAID, or
      2. Any Order with status in [CONFIRMED, PROCESSING, SHIPPED, DELIVERED], or
      3. Any finalized CouponRedemption with state == REDEEMED.
    - Abandoned checkouts (status == PENDING, payment_status == PENDING) and
      cancelled orders (status == CANCELLED without PAID payment_status) do NOT
      count as a completed first order.
    """
    if not customer or not getattr(customer, "is_authenticated", False):
        return False

    # Check for any finalized successful redemptions
    if CouponRedemption.objects.filter(
        customer=customer,
        state=CouponRedemption.State.REDEEMED,
    ).exists():
        return True

    # Check for qualifying completed/paid orders
    has_paid_or_confirmed_order = Order.objects.filter(
        user=customer,
    ).filter(
        Q(payment_status=Order.PaymentStatus.PAID)
        | Q(
            status__in=[
                Order.Status.CONFIRMED,
                Order.Status.PROCESSING,
                Order.Status.SHIPPED,
                Order.Status.DELIVERED,
            ]
        )
    ).exists()

    return has_paid_or_confirmed_order


def get_active_coupon_usage_count(coupon: Coupon, now: timezone.datetime | None = None) -> int:
    """
    Calculates current capacity consumed for a coupon:
    Includes all finalized REDEEMED records plus active non-expired RESERVED records.
    """
    current_time = now or timezone.now()
    return (
        CouponRedemption.objects.filter(coupon=coupon)
        .filter(
            Q(state=CouponRedemption.State.REDEEMED)
            | (
                Q(state=CouponRedemption.State.RESERVED)
                & (Q(expires_at__isnull=True) | Q(expires_at__gt=current_time))
            )
        )
        .count()
    )


def get_customer_coupon_usage_count(
    coupon: Coupon,
    customer: User,
    now: timezone.datetime | None = None,
) -> int:
    """
    Calculates redemptions consumed by a specific customer:
    Includes finalized REDEEMED records plus their active non-expired RESERVED records.
    """
    current_time = now or timezone.now()
    return (
        CouponRedemption.objects.filter(coupon=coupon, customer=customer)
        .filter(
            Q(state=CouponRedemption.State.REDEEMED)
            | (
                Q(state=CouponRedemption.State.RESERVED)
                & (Q(expires_at__isnull=True) | Q(expires_at__gt=current_time))
            )
        )
        .count()
    )


def evaluate_coupon_eligibility(
    coupon: Coupon,
    customer: User | None = None,
    subtotal: Decimal | None = None,
    items: Iterable[Any] | None = None,
    now: timezone.datetime | None = None,
) -> CouponEligibilityResult:
    """
    Evaluates whether a coupon satisfies all eligibility criteria for the given
    context (customer, subtotal, and cart/order items).

    Evaluation order:
    1. Active status check
    2. Start date window (not started yet)
    3. Expiration date window (expired)
    4. Global usage limit
    5. Customer-specific usage limit
    6. First-order-only restriction
    7. Minimum order subtotal
    8. Catalog targeting rules
    """
    current_time = now or timezone.now()

    # 1. Active status check
    if not coupon.is_active:
        return CouponEligibilityResult(
            eligible=False,
            reason_code=CouponEligibilityReasonCode.COUPON_INACTIVE,
            message="This coupon is inactive.",
        )

    # 2. Validity window: start date
    if coupon.start_date and coupon.start_date > current_time:
        return CouponEligibilityResult(
            eligible=False,
            reason_code=CouponEligibilityReasonCode.COUPON_NOT_STARTED,
            message="This coupon is not yet valid.",
        )

    # 3. Validity window: end date
    if coupon.end_date and coupon.end_date < current_time:
        return CouponEligibilityResult(
            eligible=False,
            reason_code=CouponEligibilityReasonCode.COUPON_EXPIRED,
            message="This coupon has expired.",
        )

    # 4. Global usage limit
    if coupon.usage_limit is not None:
        total_active_usage = get_active_coupon_usage_count(coupon, now=current_time)
        if total_active_usage >= coupon.usage_limit:
            return CouponEligibilityResult(
                eligible=False,
                reason_code=CouponEligibilityReasonCode.GLOBAL_USAGE_LIMIT_REACHED,
                message="This coupon has reached its total usage limit.",
            )

    # 5. Customer-specific usage limit
    if coupon.per_customer_limit is not None and customer and getattr(customer, "is_authenticated", False):
        cust_usage = get_customer_coupon_usage_count(coupon, customer, now=current_time)
        if cust_usage >= coupon.per_customer_limit:
            return CouponEligibilityResult(
                eligible=False,
                reason_code=CouponEligibilityReasonCode.CUSTOMER_USAGE_LIMIT_REACHED,
                message="You have reached the maximum number of redemptions for this coupon.",
            )

    # 6. First-order-only restriction
    if coupon.is_first_order_only:
        if customer and getattr(customer, "is_authenticated", False):
            if has_customer_completed_first_order(customer):
                return CouponEligibilityResult(
                    eligible=False,
                    reason_code=CouponEligibilityReasonCode.FIRST_ORDER_ONLY,
                    message="This coupon is only valid for your first order.",
                )

    # 7. Minimum order subtotal
    if subtotal is not None and coupon.min_order_subtotal is not None:
        if subtotal < coupon.min_order_subtotal:
            return CouponEligibilityResult(
                eligible=False,
                reason_code=CouponEligibilityReasonCode.MIN_SUBTOTAL_NOT_MET,
                message=(
                    f"Order subtotal of {subtotal} does not meet the minimum "
                    f"requirement of {coupon.min_order_subtotal}."
                ),
            )

    # 8. Catalog targeting rules
    mode = coupon.targeting_mode
    if mode != Coupon.TargetingMode.ALL_PRODUCTS:
        # Check if targeting configuration has at least one configured target
        has_targets = (
            coupon.applicable_products.filter(is_active=True).exists()
            or coupon.applicable_categories.filter(is_active=True).exists()
            or coupon.applicable_collections.filter(is_active=True).exists()
        )
        if not has_targets:
            return CouponEligibilityResult(
                eligible=False,
                reason_code=CouponEligibilityReasonCode.INVALID_TARGETING,
                message="This coupon has no valid active targeting targets configured.",
            )

    # If items are provided, verify that at least one item matches the coupon target
    if items is not None:
        items_list = list(items)
        if items_list:
            any_match = any(product_matches_coupon_target(coupon, item) for item in items_list)
            if not any_match:
                return CouponEligibilityResult(
                    eligible=False,
                    reason_code=CouponEligibilityReasonCode.INVALID_TARGETING,
                    message="None of the items in your cart or order qualify for this coupon.",
                )

    # All checks passed
    return CouponEligibilityResult(
        eligible=True,
        reason_code=None,
        message="Coupon is eligible for application.",
    )
