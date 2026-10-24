"""
Closet by Chilli — Authoritative Order Lifecycle & Status Transition Services.

Enforces:
- Explicit server-side status transition state machine.
- Safe payment and inventory consistency.
- Concurrency-safe atomic transactions with select_for_update().
- Durable, append-only OrderAuditLog records written atomically upon success.
- Idempotent and restricted order cancellation with reservation release.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.inventory.services import release_order_reservations
from apps.orders.models import Order, OrderAuditLog

logger = logging.getLogger(__name__)

# Explicit transition map: Current status -> list of allowed next statuses
VALID_STATUS_TRANSITIONS: dict[str, list[str]] = {
    Order.Status.PENDING: [Order.Status.CONFIRMED],
    Order.Status.CONFIRMED: [Order.Status.PROCESSING],
    Order.Status.PROCESSING: [Order.Status.SHIPPED],
    Order.Status.SHIPPED: [Order.Status.DELIVERED],
    Order.Status.DELIVERED: [],   # Terminal state
    Order.Status.CANCELLED: [],   # Terminal state
}


def transition_order_status(
    *,
    order: Order,
    target_status: str,
    actor: Optional[Any] = None,
    note: str = "",
) -> tuple[Order, OrderAuditLog | None]:
    """
    Transition an order to target_status following strict state machine rules.

    Guarantees:
    - Atomicity & row locking via select_for_update().
    - Validates target status against VALID_STATUS_TRANSITIONS.
    - Enforces payment prerequisite for PENDING -> CONFIRMED (must be PAID).
    - Prevents transitioning out of terminal states (DELIVERED, CANCELLED).
    - Does NOT mutate payment status.
    - Writes an immutable OrderAuditLog record atomically on success.
    - Re-evaluates status within the lock to prevent concurrent transition races.
    """
    target = (target_status or "").strip().upper()
    valid_statuses = {c[0] for c in Order.Status.choices}
    if target not in valid_statuses:
        raise ValidationError({
            "target_status": f"Invalid target status '{target_status}'. Allowed choices: {', '.join(sorted(valid_statuses))}."
        })

    with transaction.atomic():
        # Acquire exclusive row lock on the order
        locked_order = Order.objects.select_for_update().get(id=order.id)
        current_status = locked_order.status

        # If already in the target status, return cleanly without duplicating side effects
        if current_status == target:
            latest_audit = locked_order.audit_logs.first()
            return locked_order, latest_audit

        allowed_targets = VALID_STATUS_TRANSITIONS.get(current_status, [])
        if target not in allowed_targets:
            allowed_msg = ", ".join(allowed_targets) if allowed_targets else "none (terminal state)"
            raise ValidationError({
                "target_status": (
                    f"Invalid status transition from '{current_status}' to '{target}'. "
                    f"Allowed target transitions from '{current_status}': {allowed_msg}."
                )
            })

        # Specific prerequisite check for PENDING -> CONFIRMED
        if current_status == Order.Status.PENDING and target == Order.Status.CONFIRMED:
            if locked_order.payment_status != Order.PaymentStatus.PAID:
                raise ValidationError({
                    "target_status": (
                        f"Cannot confirm order {locked_order.order_number}: payment is not verified "
                        f"(current payment status: '{locked_order.payment_status}')."
                    )
                })

        # Apply transition
        previous_status = locked_order.status
        locked_order.status = target
        locked_order.save(update_fields=["status", "updated_at"])

        actor_user = actor if (actor and getattr(actor, "is_authenticated", False)) else None
        actor_email = getattr(actor, "email", "") or (str(actor) if actor else "")

        audit_log = OrderAuditLog.objects.create(
            order=locked_order,
            from_status=previous_status,
            to_status=target,
            operation_type=OrderAuditLog.OperationType.STATUS_TRANSITION,
            actor=actor_user,
            actor_email=actor_email,
            note=note.strip(),
        )

        logger.info(
            "Order %s transitioned from %s to %s by %s",
            locked_order.order_number,
            previous_status,
            target,
            actor_email or "system",
        )

        return locked_order, audit_log


def cancel_order_admin(
    *,
    order: Order,
    actor: Optional[Any] = None,
    reason: str = "",
    note: str = "",
) -> tuple[Order, OrderAuditLog | None]:
    """
    Cancel an order from an eligible unpaid state and release stock reservations.

    Guarantees:
    - Atomicity & row locking via select_for_update().
    - Permit cancellation only from eligible unpaid/pending states.
    - Forbids cancelling already paid orders (unless/until a separate refund workflow handles it).
    - Forbids cancelling fulfilled/shipped/delivered orders.
    - Releases active stock reservations via release_order_reservations().
    - Never releases stock for already fulfilled items.
    - Idempotency guard: if already CANCELLED, returns safely.
    - Writes an immutable OrderAuditLog record atomically on success.
    """
    with transaction.atomic():
        locked_order = Order.objects.select_for_update().get(id=order.id)

        # Idempotent return if already cancelled
        if locked_order.status == Order.Status.CANCELLED:
            latest_audit = locked_order.audit_logs.first()
            return locked_order, latest_audit

        # Strict eligibility checks
        if locked_order.payment_status == Order.PaymentStatus.PAID:
            raise ValidationError({
                "detail": (
                    f"Cannot cancel order {locked_order.order_number}: the order is marked as PAID. "
                    "Paid orders cannot be cancelled through this endpoint without an established refund workflow."
                )
            })

        if locked_order.status in (Order.Status.SHIPPED, Order.Status.DELIVERED):
            raise ValidationError({
                "detail": f"Cannot cancel order {locked_order.order_number} in '{locked_order.status}' status (already dispatched or delivered)."
            })

        if locked_order.status != Order.Status.PENDING:
            raise ValidationError({
                "detail": f"Order {locked_order.order_number} in status '{locked_order.status}' is not eligible for cancellation."
            })

        previous_status = locked_order.status
        locked_order.status = Order.Status.CANCELLED
        if locked_order.payment_status == Order.PaymentStatus.PENDING:
            locked_order.payment_status = Order.PaymentStatus.FAILED
        locked_order.save(update_fields=["status", "payment_status", "updated_at"])

        actor_user = actor if (actor and getattr(actor, "is_authenticated", False)) else None
        actor_email = getattr(actor, "email", "") or (str(actor) if actor else "")

        note_parts = [p.strip() for p in (reason, note) if p and p.strip()]
        combined_note = " — ".join(note_parts)

        # Release stock reservations safely (reason='admin_cancelled')
        release_order_reservations(
            order=locked_order,
            reason="admin_cancelled",
            actor=actor_user,
        )

        audit_log = OrderAuditLog.objects.create(
            order=locked_order,
            from_status=previous_status,
            to_status=Order.Status.CANCELLED,
            operation_type=OrderAuditLog.OperationType.CANCELLATION,
            actor=actor_user,
            actor_email=actor_email,
            note=combined_note,
        )

        logger.info(
            "Order %s cancelled by admin %s (reason: %s)",
            locked_order.order_number,
            actor_email or "system",
            combined_note,
        )

        return locked_order, audit_log
