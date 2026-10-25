"""
Closet by Chilli — Payment Discrepancy Detection & Authoritative Reconciliation Service.

Sprint A4.4.
Enforces:
- Authoritative discrepancy findings: MATCHED, AMOUNT_MISMATCH, CURRENCY_MISMATCH,
  STATUS_CONFLICT, DUPLICATE_ATTEMPT, NEEDS_REVIEW.
- Clear distinction between persisted DB evidence and live provider state.
- Safe reconciliation workflow: contacts Razorpay via authenticated server client,
  validates captured payment amount and currency, transitions payment_status to PAID,
  transitions order status to CONFIRMED, finalizes inventory, and writes durable OrderAuditLog.
- Strict rejection of manual "Mark as Paid" or "Mark as Refunded" shortcuts.
- Idempotency and row-level locking via select_for_update().
"""

from __future__ import annotations

from decimal import Decimal
import logging
from typing import Any, Dict, List, Optional, Tuple

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.orders.models import Order, OrderAuditLog
from apps.payments.exceptions import PaymentError
from apps.payments.services import convert_inr_to_paise, get_razorpay_client

logger = logging.getLogger(__name__)


class DiscrepancyStatus:
    MATCHED = "MATCHED"
    AMOUNT_MISMATCH = "AMOUNT_MISMATCH"
    CURRENCY_MISMATCH = "CURRENCY_MISMATCH"
    STATUS_CONFLICT = "STATUS_CONFLICT"
    DUPLICATE_ATTEMPT = "DUPLICATE_ATTEMPT"
    NEEDS_REVIEW = "NEEDS_REVIEW"


def evaluate_order_payment_discrepancy(
    order: Order,
    check_duplicates: bool = True,
) -> Tuple[str, List[str]]:
    """
    Perform a read-only discrepancy assessment comparing persisted DB records.
    Returns:
        (discrepancy_status: str, findings: List[str])

    Evaluates:
    - Payment amount vs expected order amount
    - Payment currency vs order currency
    - Local payment status vs recorded provider state
    - Duplicate or conflicting payment attempts
    - Missing or inconsistent order/payment relationships
    """
    findings: List[str] = []

    # 1. Currency validation
    if order.currency != "INR":
        findings.append(f"Currency '{order.currency}' is unsupported; expected 'INR'.")
        return DiscrepancyStatus.CURRENCY_MISMATCH, findings

    # 2. Amount validation
    if order.total is None or order.total <= Decimal("0.00"):
        findings.append(f"Invalid order total: '{order.total}'. Order amount must be greater than zero.")
        return DiscrepancyStatus.AMOUNT_MISMATCH, findings

    # Check items subtotal integrity
    items = list(order.items.all())
    if items:
        items_total = sum((item.line_total for item in items), Decimal("0.00"))
        if order.subtotal is not None and abs(items_total - order.subtotal) > Decimal("0.01"):
            findings.append(
                f"Items line_total sum ({items_total}) differs from recorded order subtotal ({order.subtotal})."
            )
            return DiscrepancyStatus.AMOUNT_MISMATCH, findings

    # 3. Duplicate or conflicting attempt detection
    if check_duplicates:
        if order.razorpay_payment_id:
            duplicate_payment = (
                Order.objects.filter(razorpay_payment_id=order.razorpay_payment_id)
                .exclude(id=order.id)
                .first()
            )
            if duplicate_payment:
                findings.append(
                    f"Conflicting duplicate payment ID '{order.razorpay_payment_id}' "
                    f"also recorded on order {duplicate_payment.order_number}."
                )
                return DiscrepancyStatus.DUPLICATE_ATTEMPT, findings

        if order.razorpay_order_id:
            duplicate_rzp_order = (
                Order.objects.filter(razorpay_order_id=order.razorpay_order_id)
                .exclude(id=order.id)
                .first()
            )
            if duplicate_rzp_order:
                findings.append(
                    f"Conflicting duplicate gateway order ID '{order.razorpay_order_id}' "
                    f"also recorded on order {duplicate_rzp_order.order_number}."
                )
                return DiscrepancyStatus.DUPLICATE_ATTEMPT, findings

    # 4. Status conflict checks
    # Order marked PAID but order status is CANCELLED
    if order.payment_status == Order.PaymentStatus.PAID and order.status == Order.Status.CANCELLED:
        findings.append(
            f"Status conflict: Order {order.order_number} is marked as PAID, but order status is CANCELLED."
        )
        return DiscrepancyStatus.STATUS_CONFLICT, findings

    # Marked PAID but missing razorpay_payment_id (when provider is Razorpay)
    if order.payment_status == Order.PaymentStatus.PAID and not order.razorpay_payment_id and order.razorpay_order_id:
        findings.append(
            f"Status conflict: Order {order.order_number} is marked as PAID, but provider payment ID is missing."
        )
        return DiscrepancyStatus.STATUS_CONFLICT, findings

    # Payment ID and signature exist, but order payment_status is still PENDING or FAILED
    if order.razorpay_payment_id and order.razorpay_signature:
        if order.payment_status != Order.PaymentStatus.PAID:
            findings.append(
                f"Status conflict: Payment credentials recorded (payment_id: {order.razorpay_payment_id}), "
                f"but local payment_status is '{order.payment_status}'."
            )
            return DiscrepancyStatus.STATUS_CONFLICT, findings

    # 5. Normal MATCHED case
    if order.payment_status == Order.PaymentStatus.PAID and order.razorpay_payment_id:
        findings.append("Payment verified and captured. Persisted records match authoritative order state.")
        return DiscrepancyStatus.MATCHED, findings

    # 6. NEEDS_REVIEW cases
    if order.payment_status == Order.PaymentStatus.PENDING:
        if order.razorpay_order_id:
            findings.append(
                f"Payment session initiated with Razorpay ({order.razorpay_order_id}) but unverified. "
                "Awaiting patron payment capture or webhook reconciliation."
            )
        else:
            findings.append("Pending order checkout. No provider payment session created yet.")
        return DiscrepancyStatus.NEEDS_REVIEW, findings

    if order.payment_status == Order.PaymentStatus.FAILED:
        findings.append(
            f"Payment recorded as FAILED for order {order.order_number}. Order requires administrative review."
        )
        return DiscrepancyStatus.NEEDS_REVIEW, findings

    if order.payment_status == Order.PaymentStatus.REFUNDED:
        findings.append(
            f"Order {order.order_number} marked as REFUNDED. No active fulfillment permitted."
        )
        return DiscrepancyStatus.NEEDS_REVIEW, findings

    return DiscrepancyStatus.NEEDS_REVIEW, ["Records require administrative review."]


def reconcile_order_payment(
    *,
    order: Order,
    actor: Optional[Any] = None,
    client: Optional[Any] = None,
) -> Tuple[Order, str, str]:
    """
    Safely reconcile an order's payment against Razorpay via authenticated server API.

    Guarantees:
    - Atomicity & row locking via select_for_update().
    - Never allows manual status overrides without verified provider state.
    - Idempotency: If already PAID and finalized, returns safely.
    - Strictly rejects reconciling CANCELLED orders.
    - Strictly verifies live provider payment amount and currency match order total.
    - Finalizes inventory allocations via finalize_order_inventory().
    - Writes durable OrderAuditLog with admin actor and outcome.
    """
    with transaction.atomic():
        locked_order = (
            Order.objects.select_for_update()
            .select_related("user")
            .get(id=order.id)
        )

        actor_user = actor if (actor and getattr(actor, "is_authenticated", False)) else None
        actor_email = getattr(actor, "email", "") or (str(actor) if actor else "")

        # 1. Idempotent check
        if locked_order.payment_status == Order.PaymentStatus.PAID:
            logger.info("Order %s already verified as PAID during reconciliation.", locked_order.order_number)
            return locked_order, "ALREADY_PAID", "Order is already marked as PAID."

        # 2. Strict terminal state guard
        if locked_order.status == Order.Status.CANCELLED:
            raise ValidationError({
                "detail": f"Cannot reconcile cancelled order {locked_order.order_number} without an established recovery workflow."
            })

        # 3. Must have a provider identifier to look up
        if not locked_order.razorpay_order_id and not locked_order.razorpay_payment_id:
            raise ValidationError({
                "detail": f"Order {locked_order.order_number} has no recorded Razorpay order ID or payment ID to reconcile."
            })

        # 4. Fetch live provider state from Razorpay
        active_client = client or get_razorpay_client()
        captured_payment: Optional[Dict[str, Any]] = None

        try:
            # If razorpay_payment_id is already known, fetch it directly
            if locked_order.razorpay_payment_id:
                payment_data = active_client.payment.fetch(locked_order.razorpay_payment_id)
                if payment_data.get("status") in ("captured", "authorized"):
                    captured_payment = payment_data
            elif locked_order.razorpay_order_id:
                # Query all payments for this Razorpay order
                order_payments = active_client.order.payments(locked_order.razorpay_order_id)
                items = order_payments.get("items", []) if isinstance(order_payments, dict) else []
                # Look for captured or authorized payment
                for item in items:
                    if item.get("status") in ("captured", "authorized"):
                        captured_payment = item
                        break
        except Exception as exc:
            logger.exception(
                "Gateway fetch error during reconciliation for order %s: %s",
                locked_order.order_number,
                exc,
            )
            # Log audit record of failed gateway communication
            OrderAuditLog.objects.create(
                order=locked_order,
                from_status=locked_order.payment_status,
                to_status=locked_order.payment_status,
                operation_type=OrderAuditLog.OperationType.RECONCILIATION,
                actor=actor_user,
                actor_email=actor_email,
                note=f"Gateway communication error during reconciliation check: {str(exc)[:200]}",
            )
            raise ValidationError({
                "detail": f"Failed to retrieve authoritative payment status from Razorpay: {str(exc)[:200]}"
            }) from exc

        # 5. If no captured payment is found on the provider
        if not captured_payment:
            OrderAuditLog.objects.create(
                order=locked_order,
                from_status=locked_order.payment_status,
                to_status=locked_order.payment_status,
                operation_type=OrderAuditLog.OperationType.RECONCILIATION,
                actor=actor_user,
                actor_email=actor_email,
                note="Reconciliation check completed: No captured payment found on Razorpay.",
            )
            return (
                locked_order,
                "UNPAID_ON_GATEWAY",
                "No captured payment was found on the payment gateway for this order.",
            )

        # 6. Validate gateway payment details match authoritative order
        gateway_currency = captured_payment.get("currency")
        if gateway_currency != locked_order.currency:
            error_msg = (
                f"Gateway currency '{gateway_currency}' does not match order currency '{locked_order.currency}'."
            )
            OrderAuditLog.objects.create(
                order=locked_order,
                from_status=locked_order.payment_status,
                to_status=locked_order.payment_status,
                operation_type=OrderAuditLog.OperationType.RECONCILIATION,
                actor=actor_user,
                actor_email=actor_email,
                note=f"Reconciliation rejected: {error_msg}",
            )
            raise ValidationError({"detail": error_msg})

        expected_paise = convert_inr_to_paise(locked_order.total)
        gateway_amount = captured_payment.get("amount")
        if gateway_amount != expected_paise:
            error_msg = (
                f"Gateway amount '{gateway_amount}' paise does not match order total '{expected_paise}' paise."
            )
            OrderAuditLog.objects.create(
                order=locked_order,
                from_status=locked_order.payment_status,
                to_status=locked_order.payment_status,
                operation_type=OrderAuditLog.OperationType.RECONCILIATION,
                actor=actor_user,
                actor_email=actor_email,
                note=f"Reconciliation rejected: {error_msg}",
            )
            raise ValidationError({"detail": error_msg})

        # 7. Apply payment confirmation and finalize inventory atomically
        previous_payment_status = locked_order.payment_status
        locked_order.payment_status = Order.PaymentStatus.PAID
        locked_order.status = Order.Status.CONFIRMED
        locked_order.razorpay_payment_id = captured_payment.get("id")
        locked_order.save(
            update_fields=[
                "status",
                "payment_status",
                "razorpay_payment_id",
                "updated_at",
            ]
        )

        from apps.inventory.services import finalize_order_inventory
        finalize_order_inventory(order=locked_order, actor=actor_user)

        amount_paise = int(captured_payment.get("amount") or 0)
        success_note = (
            f"Payment reconciled against Razorpay: Payment ID '{captured_payment.get('id')}' "
            f"({amount_paise / 100:.2f} {gateway_currency}) confirmed."
        )

        OrderAuditLog.objects.create(
            order=locked_order,
            from_status=previous_payment_status,
            to_status=Order.PaymentStatus.PAID,
            operation_type=OrderAuditLog.OperationType.RECONCILIATION,
            actor=actor_user,
            actor_email=actor_email,
            note=success_note,
        )

        logger.info(
            "Order %s successfully reconciled by %s. Payment ID: %s",
            locked_order.order_number,
            actor_email or "system",
            captured_payment.get("id"),
        )

        return locked_order, "RECONCILED", success_note
