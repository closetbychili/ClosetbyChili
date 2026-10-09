import hashlib
import hmac
import logging
from decimal import Decimal
from typing import Any, Dict, Optional

from django.conf import settings
from django.db import transaction
import razorpay

from apps.orders.models import Order
from apps.payments.exceptions import PaymentError

logger = logging.getLogger(__name__)


def get_razorpay_client() -> razorpay.Client:
    """Return an authenticated Razorpay client using project settings."""
    key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        raise PaymentError(
            "Razorpay credentials are not configured on the server.",
            code="RAZORPAY_CONFIG_ERROR",
            status_code=500,
        )
    return razorpay.Client(auth=(key_id, key_secret))


def convert_inr_to_paise(amount: Decimal) -> int:
    """Safely convert Decimal INR amount to integer paise."""
    if amount is None or amount < Decimal("0.00"):
        raise PaymentError("Invalid order amount.", code="INVALID_AMOUNT")
    return int((amount * Decimal("100")).quantize(Decimal("1")))


def create_razorpay_order(order: Order, client: Optional[razorpay.Client] = None) -> Dict[str, Any]:
    """
    Create a Razorpay order for a given internal Order.

    Enforces:
    - Order status must be PENDING.
    - Payment status must be PENDING.
    - Amount is safely read from Order in DB (never trusted from client).
    - If an active razorpay_order_id already exists on the order, reuse it idempotently.
    - Returns frontend-safe dictionary without exposing secrets.
    """
    if order.status != Order.Status.PENDING:
        raise PaymentError(
            f"Cannot initiate payment for order with status '{order.status}'.",
            code="INVALID_ORDER_STATUS",
        )

    if order.payment_status == Order.PaymentStatus.PAID:
        raise PaymentError(
            "This order has already been paid.",
            code="ORDER_ALREADY_PAID",
        )

    key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
    amount_in_paise = convert_inr_to_paise(order.total)

    # Idempotent reuse: if order already has an assigned razorpay_order_id, return it.
    if order.razorpay_order_id:
        return {
            "razorpay_order_id": order.razorpay_order_id,
            "key_id": key_id,
            "amount": amount_in_paise,
            "currency": order.currency,
            "order_number": order.order_number,
        }

    if client is None:
        client = get_razorpay_client()

    try:
        rzp_order = client.order.create(
            data={
                "amount": amount_in_paise,
                "currency": order.currency,
                "receipt": order.order_number,
                "notes": {
                    "order_number": order.order_number,
                    "user_id": str(order.user.id),
                },
            }
        )
    except Exception as exc:
        logger.exception("Failed to create Razorpay order for %s: %s", order.order_number, exc)
        raise PaymentError(
            "Failed to create payment session with payment provider.",
            code="GATEWAY_ORDER_CREATION_FAILED",
        ) from exc

    order.razorpay_order_id = rzp_order["id"]
    order.save(update_fields=["razorpay_order_id", "updated_at"])

    return {
        "razorpay_order_id": order.razorpay_order_id,
        "key_id": key_id,
        "amount": amount_in_paise,
        "currency": order.currency,
        "order_number": order.order_number,
    }


def verify_razorpay_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    key_secret: Optional[str] = None,
) -> bool:
    """Verify HMAC SHA256 signature for Razorpay payment callback."""
    secret = key_secret or getattr(settings, "RAZORPAY_KEY_SECRET", "")
    if not secret:
        return False

    msg = f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8")
    expected_signature = hmac.new(
        key=secret.encode("utf-8"),
        msg=msg,
        digestmod=hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected_signature, razorpay_signature)


def verify_razorpay_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    user: Optional[Any] = None,
    client: Optional[razorpay.Client] = None,
) -> Order:
    """
    Verify payment details and transition Order payment_status to PAID.

    Guarantees:
    - Atomicity & row locking via select_for_update().
    - Signature verification against server secret.
    - Idempotency: re-verifying a previously verified payment returns the order safely.
    - Prevents PAID -> PENDING regressions.
    - Verifies order belongs to the expected user (if user is provided).
    - Verifies amount and currency against DB Order.
    - Inventory is NOT mutated here (deferred to Sprint 1.5).
    """
    if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
        raise PaymentError(
            "Missing required payment verification parameters.",
            code="MISSING_VERIFICATION_PARAMS",
        )

    # 1. Signature check first
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
    if not verify_razorpay_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature, key_secret):
        raise PaymentError(
            "Payment verification signature is invalid.",
            code="INVALID_SIGNATURE",
        )

    with transaction.atomic():
        order = (
            Order.objects.select_for_update()
            .select_related("user")
            .filter(razorpay_order_id=razorpay_order_id)
            .first()
        )

        if not order:
            raise PaymentError(
                "No order found matching the provided Razorpay order ID.",
                code="ORDER_NOT_FOUND",
                status_code=404,
            )

        if user and order.user != user:
            raise PaymentError(
                "Order does not belong to the authenticated user.",
                code="ORDER_USER_MISMATCH",
                status_code=403,
            )

        # 2. Idempotency: If already paid with the exact same payment id, return successfully
        if order.payment_status == Order.PaymentStatus.PAID:
            if order.razorpay_payment_id == razorpay_payment_id:
                return order
            raise PaymentError(
                "Order is already marked as paid with a different payment ID.",
                code="CONFLICTING_PAYMENT_ID",
            )

        # 3. Check order state
        if order.status != Order.Status.PENDING:
            raise PaymentError(
                f"Cannot mark order as paid because current status is '{order.status}'.",
                code="INVALID_ORDER_STATUS",
            )

        # 4. Fetch and verify payment record from Razorpay gateway
        if client is None:
            client = get_razorpay_client()

        try:
            payment = client.payment.fetch(razorpay_payment_id)
        except Exception as exc:
            logger.exception("Failed to fetch payment %s from Razorpay: %s", razorpay_payment_id, exc)
            raise PaymentError(
                "Failed to fetch payment details from payment gateway.",
                code="GATEWAY_FETCH_FAILED",
            ) from exc

        # Gateway payment must match expected Razorpay order ID
        gateway_order_id = payment.get("order_id")
        if gateway_order_id != razorpay_order_id:
            raise PaymentError(
                f"Payment order ID '{gateway_order_id}' does not match expected '{razorpay_order_id}'.",
                code="MISMATCHED_ORDER_ID",
            )

        # Gateway payment currency must match order currency
        gateway_currency = payment.get("currency")
        if gateway_currency != order.currency:
            raise PaymentError(
                f"Payment currency '{gateway_currency}' does not match order currency '{order.currency}'.",
                code="MISMATCHED_CURRENCY",
            )

        # Gateway payment amount must match order total in paise
        expected_paise = convert_inr_to_paise(order.total)
        gateway_amount = payment.get("amount")
        if gateway_amount != expected_paise:
            raise PaymentError(
                f"Payment amount '{gateway_amount}' does not match order amount '{expected_paise}'.",
                code="MISMATCHED_AMOUNT",
            )

        # 5. Transition payment_status to PAID
        order.payment_status = Order.PaymentStatus.PAID
        order.razorpay_payment_id = razorpay_payment_id
        order.razorpay_signature = razorpay_signature
        order.save(
            update_fields=[
                "payment_status",
                "razorpay_payment_id",
                "razorpay_signature",
                "updated_at",
            ]
        )

        return order


def verify_razorpay_webhook_signature(
    body: bytes,
    signature: str,
    webhook_secret: Optional[str] = None,
) -> bool:
    """Verify HMAC SHA256 signature for Razorpay webhook delivery."""
    secret = webhook_secret or getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
    if not secret or not signature:
        return False

    expected_signature = hmac.new(
        key=secret.encode("utf-8"),
        msg=body,
        digestmod=hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected_signature, signature)


def process_razorpay_webhook(
    body: bytes,
    signature: str,
    client: Optional[razorpay.Client] = None,
) -> Dict[str, Any]:
    """
    Process incoming Razorpay webhook event idempotently.
    Supports 'payment.captured' and 'order.paid' events.
    """
    if not verify_razorpay_webhook_signature(body, signature):
        raise PaymentError("Invalid webhook signature.", code="INVALID_WEBHOOK_SIGNATURE")

    import json

    try:
        data = json.loads(body.decode("utf-8"))
    except Exception as exc:
        raise PaymentError("Malformed JSON webhook payload.", code="INVALID_PAYLOAD") from exc

    event = data.get("event")
    payload = data.get("payload", {})

    logger.info("Processing Razorpay webhook event: %s", event)

    if event in ("payment.captured", "order.paid"):
        payment_entity = payload.get("payment", {}).get("entity", {})
        razorpay_order_id = payment_entity.get("order_id")
        razorpay_payment_id = payment_entity.get("id")

        if razorpay_order_id and razorpay_payment_id:
            with transaction.atomic():
                order = (
                    Order.objects.select_for_update()
                    .filter(razorpay_order_id=razorpay_order_id)
                    .first()
                )
                if order:
                    if order.payment_status == Order.PaymentStatus.PAID:
                        return {"status": "already_processed", "order_number": order.order_number}

                    # Verify amount and currency
                    expected_paise = convert_inr_to_paise(order.total)
                    if (
                        payment_entity.get("amount") == expected_paise
                        and payment_entity.get("currency") == order.currency
                    ):
                        order.payment_status = Order.PaymentStatus.PAID
                        order.razorpay_payment_id = razorpay_payment_id
                        order.save(update_fields=["payment_status", "razorpay_payment_id", "updated_at"])
                        return {"status": "paid", "order_number": order.order_number}

    return {"status": "ignored", "event": event}
