"""
Closet by Chilli — Authoritative Shipment & Fulfillment Services.

Enforces:
- Strict shipment state machine and validated transitions.
- Concurrency-safe atomic transactions with select_for_update().
- Order lifecycle synchronization without payment or double inventory mutation.
- Enforces single active shipment per order limitation.
- Durable, append-only ShipmentAuditLog records written atomically upon success.
- Safe tracking URL verification (HTTP/HTTPS only).
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.orders.models import Order, Shipment, ShipmentAuditLog, validate_tracking_url
from apps.orders.services import transition_order_status

logger = logging.getLogger(__name__)

# Explicit transition map: Current status -> list of allowed next statuses
VALID_SHIPMENT_TRANSITIONS: dict[str, list[str]] = {
    Shipment.Status.PENDING: [
        Shipment.Status.READY_TO_SHIP,
        Shipment.Status.SHIPPED,
        Shipment.Status.FAILED,
    ],
    Shipment.Status.READY_TO_SHIP: [
        Shipment.Status.SHIPPED,
        Shipment.Status.FAILED,
    ],
    Shipment.Status.SHIPPED: [
        Shipment.Status.IN_TRANSIT,
        Shipment.Status.OUT_FOR_DELIVERY,
        Shipment.Status.DELIVERED,
        Shipment.Status.FAILED,
        Shipment.Status.RETURNED,
    ],
    Shipment.Status.IN_TRANSIT: [
        Shipment.Status.OUT_FOR_DELIVERY,
        Shipment.Status.DELIVERED,
        Shipment.Status.FAILED,
        Shipment.Status.RETURNED,
    ],
    Shipment.Status.OUT_FOR_DELIVERY: [
        Shipment.Status.DELIVERED,
        Shipment.Status.FAILED,
        Shipment.Status.RETURNED,
    ],
    Shipment.Status.DELIVERED: [
        Shipment.Status.RETURNED,
    ],
    Shipment.Status.FAILED: [
        Shipment.Status.READY_TO_SHIP,
        Shipment.Status.RETURNED,
    ],
    Shipment.Status.RETURNED: [],  # Terminal state
}


def create_order_shipment(
    *,
    order: Order,
    carrier: str = "",
    tracking_number: str = "",
    tracking_url: str = "",
    status: str = Shipment.Status.READY_TO_SHIP,
    internal_note: str = "",
    actor: Optional[Any] = None,
) -> tuple[Shipment, ShipmentAuditLog]:
    """
    Create a new shipment record for an eligible order.

    Guarantees:
    - Atomicity & exclusive order row lock via select_for_update().
    - Order payment prerequisite: Order must be PAID.
    - Order lifecycle eligibility: Order must be in CONFIRMED or PROCESSING state.
    - Prevents duplicate active shipments for the same order.
    - Validates carrier and safe tracking URL schemes.
    - Does NOT mutate payment or perform double inventory deductions.
    - Writes initial ShipmentAuditLog atomically upon success.
    """
    carrier_cleaned = (carrier or "").strip()
    tracking_num_cleaned = (tracking_number or "").strip()
    tracking_url_cleaned = (tracking_url or "").strip()
    note_cleaned = (internal_note or "").strip()

    initial_status = (status or Shipment.Status.READY_TO_SHIP).strip().upper()
    valid_initial_statuses = {Shipment.Status.PENDING, Shipment.Status.READY_TO_SHIP}
    if initial_status not in valid_initial_statuses:
        raise ValidationError({
            "status": f"Invalid initial shipment status '{status}'. Must be PENDING or READY_TO_SHIP."
        })

    if tracking_url_cleaned:
        try:
            validate_tracking_url(tracking_url_cleaned)
        except DjangoValidationError as exc:
            raise ValidationError({"tracking_url": exc.message}) from exc

    with transaction.atomic():
        locked_order = Order.objects.select_for_update().get(id=order.id)

        # 1. Payment status enforcement
        if locked_order.payment_status != Order.PaymentStatus.PAID:
            raise ValidationError({
                "detail": (
                    f"Cannot create shipment for order {locked_order.order_number}: "
                    f"payment is '{locked_order.payment_status}'. Only PAID orders are eligible for fulfillment."
                )
            })

        # 2. Order status eligibility check
        if locked_order.status == Order.Status.CANCELLED:
            raise ValidationError({
                "detail": f"Cannot create shipment for order {locked_order.order_number}: order is CANCELLED."
            })
        if locked_order.status == Order.Status.DELIVERED:
            raise ValidationError({
                "detail": f"Cannot create shipment for order {locked_order.order_number}: order is already DELIVERED."
            })
        if locked_order.status not in (Order.Status.CONFIRMED, Order.Status.PROCESSING):
            raise ValidationError({
                "detail": (
                    f"Order {locked_order.order_number} in status '{locked_order.status}' is not eligible for shipment. "
                    "Eligible states are CONFIRMED and PROCESSING."
                )
            })

        # 3. Single active shipment enforcement
        active_existing = Shipment.objects.select_for_update().filter(
            order=locked_order
        ).exclude(status__in=[Shipment.Status.FAILED, Shipment.Status.RETURNED]).first()

        if active_existing:
            raise ValidationError({
                "detail": (
                    f"Order {locked_order.order_number} already has an active shipment ({active_existing.id}) "
                    f"in '{active_existing.status}' status. Partial or multiple active shipments are not supported."
                )
            })

        actor_user = actor if (actor and getattr(actor, "is_authenticated", False)) else None
        actor_email = getattr(actor, "email", "") or (str(actor) if actor else "")

        shipment = Shipment.objects.create(
            order=locked_order,
            status=initial_status,
            carrier=carrier_cleaned,
            tracking_number=tracking_num_cleaned,
            tracking_url=tracking_url_cleaned,
            internal_note=note_cleaned,
            created_by=actor_user,
        )

        audit_log = ShipmentAuditLog.objects.create(
            shipment=shipment,
            from_status="",
            to_status=initial_status,
            event_type=ShipmentAuditLog.EventType.CREATED,
            actor=actor_user,
            actor_email=actor_email,
            note=note_cleaned or "Shipment created",
            metadata={
                "carrier": carrier_cleaned,
                "tracking_number": tracking_num_cleaned,
                "tracking_url": tracking_url_cleaned,
                "order_number": locked_order.order_number,
            },
        )

        logger.info(
            "Shipment %s created for order %s (status: %s) by %s",
            shipment.id,
            locked_order.order_number,
            initial_status,
            actor_email or "system",
        )

        return shipment, audit_log


def update_shipment_tracking(
    *,
    shipment: Shipment,
    carrier: Optional[str] = None,
    tracking_number: Optional[str] = None,
    tracking_url: Optional[str] = None,
    internal_note: Optional[str] = None,
    actor: Optional[Any] = None,
) -> tuple[Shipment, ShipmentAuditLog]:
    """
    Update carrier and tracking details on an active shipment without mutating status.

    Guarantees:
    - Atomicity & row locking via select_for_update().
    - Rejects updates on terminal returned shipments.
    - Validates safe tracking URL scheme (HTTP/HTTPS).
    - Preserves shipment and payment status unchanged.
    - Writes immutable ShipmentAuditLog with tracking metadata diff.
    """
    with transaction.atomic():
        locked_shipment = Shipment.objects.select_for_update().get(id=shipment.id)

        if locked_shipment.status == Shipment.Status.RETURNED:
            raise ValidationError({
                "detail": f"Cannot update tracking on returned shipment {locked_shipment.id}."
            })

        update_fields: list[str] = ["updated_at"]
        metadata_diff: dict[str, Any] = {}

        if carrier is not None:
            c_val = carrier.strip()
            if c_val != locked_shipment.carrier:
                metadata_diff["previous_carrier"] = locked_shipment.carrier
                metadata_diff["new_carrier"] = c_val
                locked_shipment.carrier = c_val
                update_fields.append("carrier")

        if tracking_number is not None:
            t_num = tracking_number.strip()
            if t_num != locked_shipment.tracking_number:
                metadata_diff["previous_tracking_number"] = locked_shipment.tracking_number
                metadata_diff["new_tracking_number"] = t_num
                locked_shipment.tracking_number = t_num
                update_fields.append("tracking_number")

        if tracking_url is not None:
            t_url = tracking_url.strip()
            if t_url:
                try:
                    validate_tracking_url(t_url)
                except DjangoValidationError as exc:
                    raise ValidationError({"tracking_url": exc.message}) from exc
            if t_url != locked_shipment.tracking_url:
                metadata_diff["previous_tracking_url"] = locked_shipment.tracking_url
                metadata_diff["new_tracking_url"] = t_url
                locked_shipment.tracking_url = t_url
                update_fields.append("tracking_url")

        if internal_note is not None:
            n_val = internal_note.strip()
            if n_val != locked_shipment.internal_note:
                locked_shipment.internal_note = n_val
                update_fields.append("internal_note")

        locked_shipment.save(update_fields=update_fields)

        actor_user = actor if (actor and getattr(actor, "is_authenticated", False)) else None
        actor_email = getattr(actor, "email", "") or (str(actor) if actor else "")

        audit_log = ShipmentAuditLog.objects.create(
            shipment=locked_shipment,
            from_status=locked_shipment.status,
            to_status=locked_shipment.status,
            event_type=ShipmentAuditLog.EventType.TRACKING_UPDATED,
            actor=actor_user,
            actor_email=actor_email,
            note="Carrier/tracking details updated",
            metadata=metadata_diff,
        )

        if locked_shipment.status == Shipment.Status.SHIPPED and (
            "new_tracking_number" in metadata_diff or "new_tracking_url" in metadata_diff or "new_carrier" in metadata_diff
        ):
            from apps.orders.notifications import trigger_shipment_tracking_updated_notification
            transaction.on_commit(
                lambda: trigger_shipment_tracking_updated_notification(
                    shipment=locked_shipment,
                    audit_log=audit_log,
                )
            )

        return locked_shipment, audit_log


def dispatch_shipment(
    *,
    shipment: Shipment,
    carrier: Optional[str] = None,
    tracking_number: Optional[str] = None,
    tracking_url: Optional[str] = None,
    actor: Optional[Any] = None,
    note: str = "",
) -> tuple[Shipment, ShipmentAuditLog]:
    """
    Dispatch an eligible shipment and synchronize order lifecycle.

    Guarantees:
    - Atomicity & row locking on both shipment and order via select_for_update().
    - Validates shipment status is PENDING or READY_TO_SHIP.
    - Idempotency guard: if already SHIPPED or beyond, returns cleanly without duplicate dispatch.
    - Validates order payment prerequisite: Order must be PAID.
    - Synchronizes order status:
        - If CONFIRMED -> transitions order to PROCESSING then SHIPPED.
        - If PROCESSING -> transitions order to SHIPPED.
    - Sets dispatched_at and dispatched_by.
    - Writes immutable ShipmentAuditLog and OrderAuditLog atomically.
    - Does NOT mutate payment status or deduct inventory twice.
    """
    with transaction.atomic():
        locked_shipment = Shipment.objects.select_for_update().get(id=shipment.id)
        locked_order = Order.objects.select_for_update().get(id=locked_shipment.order_id)

        # Idempotency guard: already dispatched
        if locked_shipment.status == Shipment.Status.SHIPPED:
            latest_audit = locked_shipment.audit_logs.filter(
                event_type=ShipmentAuditLog.EventType.DISPATCHED
            ).first()
            return locked_shipment, latest_audit

        if locked_shipment.status not in (Shipment.Status.PENDING, Shipment.Status.READY_TO_SHIP):
            raise ValidationError({
                "detail": (
                    f"Cannot dispatch shipment {locked_shipment.id} in status '{locked_shipment.status}'. "
                    "Shipment must be in PENDING or READY_TO_SHIP status to be dispatched."
                )
            })

        # Strict payment enforcement
        if locked_order.payment_status != Order.PaymentStatus.PAID:
            raise ValidationError({
                "detail": (
                    f"Cannot dispatch shipment for order {locked_order.order_number}: "
                    f"payment status is '{locked_order.payment_status}'. Unpaid orders cannot be dispatched."
                )
            })

        if locked_order.status == Order.Status.CANCELLED:
            raise ValidationError({
                "detail": f"Cannot dispatch shipment for order {locked_order.order_number}: order is CANCELLED."
            })

        if locked_order.status == Order.Status.DELIVERED:
            raise ValidationError({
                "detail": f"Cannot dispatch shipment for order {locked_order.order_number}: order is already DELIVERED."
            })

        # Update carrier/tracking if provided
        if carrier is not None and carrier.strip():
            locked_shipment.carrier = carrier.strip()
        if tracking_number is not None and tracking_number.strip():
            locked_shipment.tracking_number = tracking_number.strip()
        if tracking_url is not None and tracking_url.strip():
            t_url = tracking_url.strip()
            try:
                validate_tracking_url(t_url)
            except DjangoValidationError as exc:
                raise ValidationError({"tracking_url": exc.message}) from exc
            locked_shipment.tracking_url = t_url

        actor_user = actor if (actor and getattr(actor, "is_authenticated", False)) else None
        actor_email = getattr(actor, "email", "") or (str(actor) if actor else "")

        previous_status = locked_shipment.status
        locked_shipment.status = Shipment.Status.SHIPPED
        locked_shipment.dispatched_at = timezone.now()
        locked_shipment.dispatched_by = actor_user
        locked_shipment.save(
            update_fields=[
                "status",
                "carrier",
                "tracking_number",
                "tracking_url",
                "dispatched_at",
                "dispatched_by",
                "updated_at",
            ]
        )

        # Synchronize order lifecycle state machine
        tracking_info = f"Carrier: {locked_shipment.carrier or 'Courier'}, Tracking: {locked_shipment.tracking_number or 'N/A'}"
        if locked_order.status == Order.Status.CONFIRMED:
            transition_order_status(
                order=locked_order,
                target_status=Order.Status.PROCESSING,
                actor=actor_user,
                note="Auto-advanced to Processing for parcel dispatch",
            )
            transition_order_status(
                order=locked_order,
                target_status=Order.Status.SHIPPED,
                actor=actor_user,
                note=f"Dispatched via shipment {locked_shipment.id} ({tracking_info})",
            )
        elif locked_order.status == Order.Status.PROCESSING:
            transition_order_status(
                order=locked_order,
                target_status=Order.Status.SHIPPED,
                actor=actor_user,
                note=f"Dispatched via shipment {locked_shipment.id} ({tracking_info})",
            )

        audit_log = ShipmentAuditLog.objects.create(
            shipment=locked_shipment,
            from_status=previous_status,
            to_status=Shipment.Status.SHIPPED,
            event_type=ShipmentAuditLog.EventType.DISPATCHED,
            actor=actor_user,
            actor_email=actor_email,
            note=note.strip() or f"Dispatched via {locked_shipment.carrier or 'courier'}",
            metadata={
                "carrier": locked_shipment.carrier,
                "tracking_number": locked_shipment.tracking_number,
                "dispatched_at": locked_shipment.dispatched_at.isoformat(),
            },
        )

        logger.info(
            "Shipment %s dispatched for order %s by %s",
            locked_shipment.id,
            locked_order.order_number,
            actor_email or "system",
        )

        return locked_shipment, audit_log


def transition_shipment_status(
    *,
    shipment: Shipment,
    target_status: str,
    actor: Optional[Any] = None,
    note: str = "",
) -> tuple[Shipment, ShipmentAuditLog]:
    """
    Transition shipment status following explicit server-side state machine rules.

    Guarantees:
    - Atomicity & row locking on shipment and order via select_for_update().
    - Validates target status against VALID_SHIPMENT_TRANSITIONS.
    - If target is SHIPPED, delegates to dispatch_shipment().
    - If target is DELIVERED, sets delivered_at/delivered_by and synchronizes order status to DELIVERED.
    - Does NOT mutate payment status.
    - Does NOT duplicate inventory deductions or reservations.
    - Writes immutable ShipmentAuditLog record atomically on success.
    """
    target = (target_status or "").strip().upper()
    valid_statuses = {c[0] for c in Shipment.Status.choices}
    if target not in valid_statuses:
        raise ValidationError({
            "target_status": f"Invalid target shipment status '{target_status}'. Allowed choices: {', '.join(sorted(valid_statuses))}."
        })

    # If dispatching, route through dedicated dispatch workflow
    if target == Shipment.Status.SHIPPED:
        return dispatch_shipment(shipment=shipment, actor=actor, note=note)

    with transaction.atomic():
        locked_shipment = Shipment.objects.select_for_update().get(id=shipment.id)
        current_status = locked_shipment.status

        # Idempotency guard
        if current_status == target:
            latest_audit = locked_shipment.audit_logs.first()
            return locked_shipment, latest_audit

        allowed_targets = VALID_SHIPMENT_TRANSITIONS.get(current_status, [])
        if target not in allowed_targets:
            allowed_msg = ", ".join(allowed_targets) if allowed_targets else "none (terminal state)"
            raise ValidationError({
                "target_status": (
                    f"Invalid status transition from '{current_status}' to '{target}'. "
                    f"Allowed transitions from '{current_status}': {allowed_msg}."
                )
            })

        actor_user = actor if (actor and getattr(actor, "is_authenticated", False)) else None
        actor_email = getattr(actor, "email", "") or (str(actor) if actor else "")

        previous_status = current_status
        locked_shipment.status = target
        update_fields = ["status", "updated_at"]

        event_type = ShipmentAuditLog.EventType.STATUS_TRANSITION
        if target == Shipment.Status.IN_TRANSIT:
            event_type = ShipmentAuditLog.EventType.IN_TRANSIT
        elif target == Shipment.Status.OUT_FOR_DELIVERY:
            event_type = ShipmentAuditLog.EventType.OUT_FOR_DELIVERY
        elif target == Shipment.Status.DELIVERED:
            event_type = ShipmentAuditLog.EventType.DELIVERED
            locked_shipment.delivered_at = timezone.now()
            locked_shipment.delivered_by = actor_user
            update_fields.extend(["delivered_at", "delivered_by"])

            # Synchronize order status to DELIVERED if order is in SHIPPED
            locked_order = Order.objects.select_for_update().get(id=locked_shipment.order_id)
            if locked_order.status == Order.Status.SHIPPED:
                transition_order_status(
                    order=locked_order,
                    target_status=Order.Status.DELIVERED,
                    actor=actor_user,
                    note=f"Delivered via shipment {locked_shipment.id}",
                )
        elif target == Shipment.Status.FAILED:
            event_type = ShipmentAuditLog.EventType.FAILED
        elif target == Shipment.Status.RETURNED:
            event_type = ShipmentAuditLog.EventType.RETURNED

        locked_shipment.save(update_fields=update_fields)

        audit_log = ShipmentAuditLog.objects.create(
            shipment=locked_shipment,
            from_status=previous_status,
            to_status=target,
            event_type=event_type,
            actor=actor_user,
            actor_email=actor_email,
            note=note.strip(),
        )

        logger.info(
            "Shipment %s transitioned from %s to %s by %s",
            locked_shipment.id,
            previous_status,
            target,
            actor_email or "system",
        )

        return locked_shipment, audit_log
