"""
Closet by Chilli — Order Notifications & Resend Integration Service.

Manages durable, append-only OrderNotification outbox records, template
rendering, Celery task dispatch, and delivery via the official Resend SDK.
Enforces:
- Strict idempotency at database and Resend API levels.
- Non-blocking execution (failures never roll back business transactions).
- Graceful degradation when RESEND_API_KEY is unconfigured.
- Transactional integrity using transaction.on_commit().
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone

from apps.orders.models import Order, OrderAuditLog, OrderNotification, Shipment, ShipmentAuditLog

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Recipient & Context Helpers
# ---------------------------------------------------------------------------

def resolve_order_recipient(order: Order) -> tuple[str, str]:
    """
    Resolve recipient email and customer name for an order.
    Prefers order user identity, falling back to address snapshots.
    """
    email = (getattr(order.user, "email", "") or "").strip().lower()
    name = ""

    # Check user profile
    if hasattr(order.user, "profile") and order.user.profile:
        name = getattr(order.user.profile, "display_name", "").strip()

    # Fallback to shipping address snapshot
    shipping_snap = order.shipping_address_snapshot
    if isinstance(shipping_snap, dict):
        if not email:
            email = str(shipping_snap.get("email") or "").strip().lower()
        if not name:
            name = str(shipping_snap.get("full_name") or "").strip()

    # Fallback to billing address snapshot
    billing_snap = order.billing_address_snapshot
    if isinstance(billing_snap, dict):
        if not email:
            email = str(billing_snap.get("email") or "").strip().lower()
        if not name:
            name = str(billing_snap.get("full_name") or "").strip()

    if not name:
        name = "Valued Customer"

    return email, name


def get_order_items_context(order: Order) -> list[dict[str, Any]]:
    """Build a sanitized context list of purchased items for email templates."""
    items = []
    for item in order.items.all().order_by("id"):
        items.append({
            "product_name": item.product_name,
            "variant_name": item.variant_name,
            "sku": item.sku,
            "quantity": item.quantity,
            "unit_price": str(item.unit_price),
            "line_total": str(item.line_total),
        })
    return items


def get_status_narrative(status: str) -> tuple[str, str, str]:
    """
    Return (status_display, status_explanation, next_steps) for a given Order status.
    Ensures clear, customer-friendly luxury atelier communication.
    """
    status_upper = (status or "").strip().upper()

    if status_upper == Order.Status.CONFIRMED:
        return (
            "Confirmed",
            "Your order and payment have been verified. Our atelier is preparing your pieces.",
            "Our craftspeople will begin assembling and preparing your garments. You will receive an update once your order enters tailoring.",
        )
    elif status_upper == Order.Status.PROCESSING:
        return (
            "Processing & Tailoring",
            "Your garments are currently being tailored, curated, and quality-inspected by the Closet by Chilli atelier team.",
            "Once atelier quality checks are complete, your parcel will be boxed and scheduled for courier dispatch. We will send tracking information as soon as it ships.",
        )
    elif status_upper == Order.Status.SHIPPED:
        return (
            "Shipped & Dispatched",
            "Your package has been dispatched from our atelier and is en route to your delivery address.",
            "You can follow your delivery using the tracking details provided below. Please ensure someone is available at the delivery location.",
        )
    elif status_upper == Order.Status.DELIVERED:
        return (
            "Delivered",
            "Your Closet by Chilli package has been delivered to your destination.",
            "We hope you adore your signature pieces! Please inspect your garments. If you need any styling advice or sizing assistance, contact our concierge at care@closetbychilli.com.",
        )
    elif status_upper == Order.Status.CANCELLED:
        return (
            "Cancelled",
            "Your order has been cancelled.",
            "If you have questions regarding this cancellation, or if you believe this was made in error, please reach out to our client care team at care@closetbychilli.com.",
        )
    else:
        return (
            status_upper.title(),
            f"The status of your order has changed to {status_upper.title()}.",
            "You can review your complete order history in your account dashboard.",
        )


# ---------------------------------------------------------------------------
# Notification Creation & Triggers
# ---------------------------------------------------------------------------

def trigger_order_confirmation_notification(order: Order) -> OrderNotification | None:
    """
    Create and enqueue an Order Confirmation email notification.
    Idempotent: Only one confirmation email is created per order.
    """
    idempotency_key = f"order_confirmation_{order.id}"

    # Check if notification already exists
    existing = OrderNotification.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        logger.info("Order confirmation notification %s already exists for order %s.", existing.id, order.order_number)
        return existing

    email, name = resolve_order_recipient(order)
    subject = f"Order Confirmation #{order.order_number} — Closet by Chilli"

    items_data = get_order_items_context(order)
    shipping_snap = order.shipping_address_snapshot if isinstance(order.shipping_address_snapshot, dict) else {}

    payload = {
        "customer_name": name,
        "items": items_data,
        "shipping_address": shipping_snap,
        "subtotal": str(order.subtotal),
        "discount": str(order.discount),
        "shipping_amount": str(order.shipping_amount),
        "tax_amount": str(order.tax_amount),
        "total": str(order.total),
        "currency": order.currency,
        "payment_status": order.payment_status,
        "coupon_code": order.coupon_code,
    }

    notification = OrderNotification.objects.create(
        order=order,
        event_type=OrderNotification.EventType.ORDER_CONFIRMATION,
        idempotency_key=idempotency_key,
        recipient_email=email,
        recipient_name=name,
        subject=subject,
        payload=payload,
        status=OrderNotification.Status.PENDING if email else OrderNotification.Status.SKIPPED,
        error_message="" if email else "No recipient email address available for order.",
    )

    if email:
        enqueue_notification(notification.id)

    return notification


def trigger_order_status_notification(
    *,
    order: Order,
    audit_log: Optional[OrderAuditLog] = None,
    note: str = "",
) -> OrderNotification | None:
    """
    Create and enqueue an Order Status Change or Shipment Notification email.
    Idempotent: Keyed by audit_log.id to ensure exactly one notification per transition.
    """
    if audit_log is None or audit_log.from_status == audit_log.to_status:
        return None

    idempotency_key = f"order_status_{audit_log.id}"
    existing = OrderNotification.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        logger.info("Status notification %s already exists for audit log %s.", existing.id, audit_log.id)
        return existing

    email, name = resolve_order_recipient(order)
    target_status = audit_log.to_status
    status_display, status_explanation, next_steps = get_status_narrative(target_status)

    # Carrier / tracking info if available
    carrier = ""
    tracking_number = ""
    tracking_url = ""

    active_shipment = order.shipments.filter(
        ~Q(status__in=[Shipment.Status.FAILED, Shipment.Status.RETURNED])
    ).first()

    if active_shipment:
        carrier = active_shipment.carrier or ""
        tracking_number = active_shipment.tracking_number or ""
        tracking_url = active_shipment.tracking_url or ""

    if target_status == Order.Status.SHIPPED:
        event_type = OrderNotification.EventType.SHIPMENT_DISPATCHED
        subject = f"Your Closet by Chilli Order #{order.order_number} has shipped!"
    else:
        event_type = OrderNotification.EventType.ORDER_STATUS_CHANGED
        subject = f"Order #{order.order_number} Update: {status_display} — Closet by Chilli"

    payload = {
        "customer_name": name,
        "previous_status": audit_log.from_status,
        "new_status": target_status,
        "status_display": status_display,
        "status_explanation": status_explanation,
        "next_steps": next_steps,
        "carrier": carrier,
        "tracking_number": tracking_number,
        "tracking_url": tracking_url,
        "note": note,
    }

    notification = OrderNotification.objects.create(
        order=order,
        event_type=event_type,
        idempotency_key=idempotency_key,
        recipient_email=email,
        recipient_name=name,
        subject=subject,
        payload=payload,
        status=OrderNotification.Status.PENDING if email else OrderNotification.Status.SKIPPED,
        error_message="" if email else "No recipient email address available for order.",
    )

    if email:
        enqueue_notification(notification.id)

    return notification


def trigger_shipment_tracking_updated_notification(
    *,
    shipment: Shipment,
    audit_log: ShipmentAuditLog,
) -> OrderNotification | None:
    """
    Trigger notification when tracking details are updated on an active shipment.
    """
    order = shipment.order
    idempotency_key = f"shipment_tracking_{audit_log.id}"

    existing = OrderNotification.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        return existing

    email, name = resolve_order_recipient(order)
    subject = f"Tracking Updated for Order #{order.order_number} — Closet by Chilli"

    payload = {
        "customer_name": name,
        "new_status": order.status,
        "status_display": "Tracking Updated",
        "status_explanation": f"Tracking information for your shipment has been updated.",
        "next_steps": "You can follow your parcel in real-time with the updated tracking link below.",
        "carrier": shipment.carrier or "",
        "tracking_number": shipment.tracking_number or "",
        "tracking_url": shipment.tracking_url or "",
    }

    notification = OrderNotification.objects.create(
        order=order,
        event_type=OrderNotification.EventType.SHIPMENT_TRACKING_UPDATED,
        idempotency_key=idempotency_key,
        recipient_email=email,
        recipient_name=name,
        subject=subject,
        payload=payload,
        status=OrderNotification.Status.PENDING if email else OrderNotification.Status.SKIPPED,
        error_message="" if email else "No recipient email address available for order.",
    )

    if email:
        enqueue_notification(notification.id)

    return notification


# ---------------------------------------------------------------------------
# Enqueue & Delivery Engine
# ---------------------------------------------------------------------------

def enqueue_notification(notification_id: Any) -> None:
    """
    Queue a notification for asynchronous background delivery via Celery.
    If Celery broker is unavailable or not running, handles gracefully.
    """
    from apps.orders.tasks import send_order_notification_task

    try:
        send_order_notification_task.delay(str(notification_id))
    except Exception as exc:
        logger.warning(
            "Could not dispatch notification %s via Celery broker: %s. "
            "Notification remains PENDING.",
            notification_id,
            exc,
        )
        if getattr(settings, "EMAIL_DELIVERY_FALLBACK_SYNC", False):
            try:
                dispatch_notification(str(notification_id))
            except Exception as sync_exc:
                logger.warning("Synchronous fallback delivery also failed: %s", sync_exc)


def render_notification_templates(notification: OrderNotification) -> tuple[str, str]:
    """Render HTML and plain-text templates for an OrderNotification."""
    order = notification.order
    payload = notification.payload or {}

    frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
    order_details_url = f"{frontend_base}/account?tab=orders"

    context = {
        "order": order,
        "notification": notification,
        "customer_name": notification.recipient_name or "Valued Customer",
        "order_date": order.created_at.strftime("%B %d, %Y"),
        "frontend_url": frontend_base,
        "order_details_url": order_details_url,
        "current_year": timezone.now().year,
        **payload,
    }

    if notification.event_type == OrderNotification.EventType.ORDER_CONFIRMATION:
        html_template = "orders/emails/order_confirmation.html"
        text_template = "orders/emails/order_confirmation.txt"
    else:
        html_template = "orders/emails/order_status_update.html"
        text_template = "orders/emails/order_status_update.txt"

    html_content = render_to_string(html_template, context)
    text_content = render_to_string(text_template, context)

    return html_content, text_content


def dispatch_notification(notification_id: str) -> bool:
    """
    Deliver an OrderNotification via the official Resend SDK.
    Safe against retries, concurrent deliveries, and transient failures.
    Does not hold open a database lock during outbound HTTP network calls.
    """
    with transaction.atomic():
        notification = (
            OrderNotification.objects.select_for_update()
            .filter(id=notification_id)
            .first()
        )
        if not notification:
            logger.warning("OrderNotification %s does not exist.", notification_id)
            return False

        if notification.status == OrderNotification.Status.SENT:
            logger.info("OrderNotification %s is already marked SENT; skipping.", notification_id)
            return True

        api_key = getattr(settings, "RESEND_API_KEY", "").strip()
        from_email = getattr(settings, "RESEND_FROM_EMAIL", "").strip()

        if not api_key:
            logger.info(
                "RESEND_API_KEY is not configured; skipping email delivery for notification %s.",
                notification_id,
            )
            notification.status = OrderNotification.Status.SKIPPED
            notification.error_message = "RESEND_API_KEY is not configured in backend settings."
            notification.save(update_fields=["status", "error_message", "updated_at"])
            return False

        if not notification.recipient_email:
            notification.status = OrderNotification.Status.SKIPPED
            notification.error_message = "Recipient email address is blank."
            notification.save(update_fields=["status", "error_message", "updated_at"])
            return False

        html_content, text_content = render_notification_templates(notification)
        idempotency_key = str(notification.idempotency_key)
        recipient_email = notification.recipient_email
        subject = notification.subject

    # Perform network call outside database transaction lock
    import resend
    resend.api_key = api_key

    try:
        params: dict[str, Any] = {
            "from": from_email or "Closet by Chilli <orders@closetbychilli.com>",
            "to": [recipient_email],
            "subject": subject,
            "html": html_content,
            "text": text_content,
            "headers": {
                "X-Entity-Ref-ID": idempotency_key,
            },
        }
        options = {
            "idempotency_key": idempotency_key,
        }

        response = resend.Emails.send(params, options=options)

        email_id = ""
        if isinstance(response, dict):
            email_id = response.get("id", "")
        elif hasattr(response, "id"):
            email_id = getattr(response, "id", "")

        with transaction.atomic():
            notif = OrderNotification.objects.select_for_update().filter(id=notification_id).first()
            if notif:
                notif.status = OrderNotification.Status.SENT
                notif.resend_email_id = str(email_id)
                notif.sent_at = timezone.now()
                notif.error_message = ""
                notif.save(update_fields=["status", "resend_email_id", "sent_at", "error_message", "updated_at"])

        logger.info(
            "OrderNotification %s sent successfully via Resend (email_id: %s).",
            notification_id,
            email_id,
        )
        return True

    except Exception as exc:
        with transaction.atomic():
            notif = OrderNotification.objects.select_for_update().filter(id=notification_id).first()
            if notif:
                notif.retry_count += 1
                notif.error_message = str(exc)
                if notif.retry_count >= notif.max_retries:
                    notif.status = OrderNotification.Status.FAILED
                notif.save(update_fields=["status", "retry_count", "error_message", "updated_at"])

        logger.exception("Failed to deliver OrderNotification %s via Resend: %s", notification_id, exc)
        raise
