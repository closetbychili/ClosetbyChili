"""
Closet by Chilli — Order Notifications & Resend Integration Test Suite.

Verifies:
1. Resend configuration and missing credentials handling (graceful degradation).
2. Successful email sending path with mocked Resend client.
3. Order confirmation email content, accurate payment status, and correct business trigger.
4. Admin status change email content, narratives, next steps, and carrier/tracking info.
5. Recipient selection and address snapshot fallbacks.
6. Deduplication and idempotency guards across checkout retries and webhooks.
7. Resilience: Resend errors never break orders or transactions.
8. Bounded retries, error preservation, and recovery.
9. No notifications sent on unchanged or invalid status transitions.
"""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock, patch
import uuid

from django.test import TransactionTestCase, override_settings
from django.utils import timezone

from apps.accounts.models import CustomerProfile, User
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import InventoryItem
from apps.orders.models import Order, OrderAuditLog, OrderItem, OrderNotification, Shipment, ShipmentAuditLog
from apps.orders.notifications import (
    dispatch_notification,
    get_order_items_context,
    get_status_narrative,
    render_notification_templates,
    resolve_order_recipient,
    trigger_order_confirmation_notification,
    trigger_order_status_notification,
    trigger_shipment_tracking_updated_notification,
)
from apps.orders.services import cancel_order_admin, transition_order_status
from apps.orders.shipment_services import dispatch_shipment, update_shipment_tracking
from apps.orders.tasks import send_order_notification_task
from apps.payments.services import verify_razorpay_payment, process_razorpay_webhook
from rest_framework.exceptions import ValidationError


class OrderEmailBaseTestCase(TransactionTestCase):
    """Base setup for order notification tests."""

    def setUp(self):
        super().setUp()
        self.resend_patcher = patch("resend.Emails.send")
        self.mock_resend = self.resend_patcher.start()
        self.mock_resend.return_value = {"id": "default_mock_msg_id"}
        self.addCleanup(self.resend_patcher.stop)

        self.user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="ananya.sharma@example.com",
            role=User.Role.CUSTOMER,
        )
        self.profile = CustomerProfile.objects.create(
            user=self.user,
            display_name="Ananya Sharma",
            phone="+919876543210",
        )

        self.admin = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin@closetbychilli.com",
            role=User.Role.ADMIN,
        )

        self.category = Category.objects.create(
            name="Couture Eveningwear",
            slug="couture-eveningwear",
            is_active=True,
        )
        self.product = Product.objects.create(
            name="Crimson Velvet Kurta Set",
            slug="crimson-velvet-kurta-set",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="CBC-CRIM-M",
            size="M",
            color="Deep Crimson",
            retail_price=Decimal("12500.00"),
            is_active=True,
        )
        self.inventory = InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=10,
        )

        self.shipping_address = {
            "full_name": "Ananya Sharma",
            "email": "ananya.sharma@example.com",
            "phone": "+919876543210",
            "address_line1": "42 Heritage Boulevard, Atelier Lane",
            "address_line2": "Apt 4B",
            "city": "Mumbai",
            "state": "Maharashtra",
            "postal_code": "400001",
            "country": "India",
        }

    def create_test_order(
        self,
        *,
        status: str = Order.Status.PENDING,
        payment_status: str = Order.PaymentStatus.PENDING,
        user: User | None = None,
        shipping_snapshot: dict | None = None,
    ) -> Order:
        order = Order.objects.create(
            user=user or self.user,
            status=status,
            payment_status=payment_status,
            order_number=f"CBC-2026-{uuid.uuid4().hex[:6].upper()}",
            razorpay_order_id=f"order_{uuid.uuid4().hex[:14]}",
            subtotal=Decimal("12500.00"),
            discount=Decimal("1000.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("11500.00"),
            coupon_code="ATELIER1000",
            currency="INR",
            shipping_address_snapshot=shipping_snapshot if shipping_snapshot is not None else self.shipping_address,
        )

        OrderItem.objects.create(
            order=order,
            product=self.product,
            variant=self.variant,
            product_name=self.product.name,
            variant_name=f"{self.variant.size} / {self.variant.color}",
            sku=self.variant.sku,
            unit_price=Decimal("12500.00"),
            quantity=1,
            line_total=Decimal("12500.00"),
        )
        return order


class ResendConfigurationAndDegradationTests(OrderEmailBaseTestCase):
    """Test configuration, missing credentials, and graceful degradation."""

    @override_settings(RESEND_API_KEY="")
    def test_missing_api_key_skips_without_crashing(self):
        """When RESEND_API_KEY is not configured, notification is marked SKIPPED cleanly."""
        order = self.create_test_order(payment_status=Order.PaymentStatus.PAID)
        notif = trigger_order_confirmation_notification(order)
        self.assertIsNotNone(notif)

        result = dispatch_notification(str(notif.id))
        self.assertFalse(result)

        notif.refresh_from_db()
        self.assertEqual(notif.status, OrderNotification.Status.SKIPPED)
        self.assertIn("RESEND_API_KEY is not configured", notif.error_message)

    @override_settings(RESEND_API_KEY="re_valid_key_test")
    def test_blank_recipient_email_marks_skipped(self):
        """When recipient email cannot be resolved, notification is marked SKIPPED."""
        user_no_email = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="",
            role=User.Role.CUSTOMER,
        )
        order = self.create_test_order(
            user=user_no_email,
            shipping_snapshot={},
        )
        notif = trigger_order_confirmation_notification(order)
        self.assertIsNotNone(notif)
        self.assertEqual(notif.status, OrderNotification.Status.SKIPPED)
        self.assertIn("No recipient email", notif.error_message)

    def test_recipient_resolution_hierarchy(self):
        """Verify recipient email and name selection precedence."""
        # 1. User has email & profile has display_name
        email, name = resolve_order_recipient(self.create_test_order())
        self.assertEqual(email, "ananya.sharma@example.com")
        self.assertEqual(name, "Ananya Sharma")

        # 2. User has no email, fallback to shipping snapshot email
        ghost_user = User.objects.create(supabase_user_id=uuid.uuid4(), email="")
        order_shipping = self.create_test_order(
            user=ghost_user,
            shipping_snapshot={"email": "custom.shipping@example.com", "full_name": "Priya Verma"},
        )
        email, name = resolve_order_recipient(order_shipping)
        self.assertEqual(email, "custom.shipping@example.com")
        self.assertEqual(name, "Priya Verma")


class OrderConfirmationEmailTests(OrderEmailBaseTestCase):
    """Test order confirmation email content, trigger, and idempotency."""

    @override_settings(
        RESEND_API_KEY="re_mock_test_key",
        RESEND_FROM_EMAIL="Closet by Chilli <orders@closetbychilli.com>",
        FRONTEND_BASE_URL="https://closetbychilli.com",
    )
    @patch("resend.Emails.send")
    def test_successful_order_confirmation_email_delivery(self, mock_resend_send):
        """Test happy path: Resend API receives correct payload and notification is SENT."""
        mock_resend_send.return_value = {"id": "resend_msg_123456"}

        order = self.create_test_order(
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
        )

        notif = trigger_order_confirmation_notification(order)
        self.assertIsNotNone(notif)

        success = dispatch_notification(str(notif.id))
        self.assertTrue(success)

        notif.refresh_from_db()
        self.assertEqual(notif.status, OrderNotification.Status.SENT)
        self.assertEqual(notif.resend_email_id, "resend_msg_123456")
        self.assertIsNotNone(notif.sent_at)

        mock_resend_send.assert_called_once()
        call_params, call_kwargs = mock_resend_send.call_args
        params = call_params[0]
        options = call_kwargs.get("options") or {}

        self.assertEqual(params["from"], "Closet by Chilli <orders@closetbychilli.com>")
        self.assertEqual(params["to"], ["ananya.sharma@example.com"])
        self.assertIn(f"Order Confirmation #{order.order_number}", params["subject"])
        self.assertEqual(options.get("idempotency_key"), f"order_confirmation_{order.id}")

    @override_settings(
        RESEND_API_KEY="re_mock_test_key",
        FRONTEND_BASE_URL="https://closetbychilli.com",
    )
    def test_order_confirmation_template_rendering_content(self):
        """Verify all required order confirmation data is rendered in HTML and plain text."""
        order = self.create_test_order(
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
        )
        notif = trigger_order_confirmation_notification(order)

        html, text = render_notification_templates(notif)

        # 1. Order number and date
        self.assertIn(order.order_number, html)
        self.assertIn(order.order_number, text)
        date_str = order.created_at.strftime("%B %d, %Y")
        self.assertIn(date_str, html)
        self.assertIn(date_str, text)

        # 2. Customer name
        self.assertIn("Ananya Sharma", html)
        self.assertIn("Ananya Sharma", text)

        # 3. Product names, variants, quantities
        self.assertIn("Crimson Velvet Kurta Set", html)
        self.assertIn("Crimson Velvet Kurta Set", text)
        self.assertIn("M / Deep Crimson", html)
        self.assertIn("CBC-CRIM-M", html)

        # 4. Pricing breakdown
        self.assertIn("12500.00", html)
        self.assertIn("1000.00", html)
        self.assertIn("ATELIER1000", html)
        self.assertIn("11500.00", html)

        # 5. Accurate payment status (never says unpaid)
        self.assertIn("PAID", html)
        self.assertIn("PAID", text)

        # 6. Customer account orders link
        self.assertIn("https://closetbychilli.com/account?tab=orders", html)
        self.assertIn("https://closetbychilli.com/account?tab=orders", text)

    @override_settings(RESEND_API_KEY="re_mock_test_key")
    @patch("resend.Emails.send")
    def test_order_confirmation_idempotency_and_no_duplicates(self, mock_resend_send):
        """Repeated triggers or retries create only one notification and send only one email."""
        mock_resend_send.return_value = {"id": "resend_dup_test"}

        order = self.create_test_order(
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
        )

        notif1 = trigger_order_confirmation_notification(order)
        notif2 = trigger_order_confirmation_notification(order)

        self.assertEqual(notif1.id, notif2.id)
        self.assertEqual(OrderNotification.objects.filter(order=order).count(), 1)

        # Deliver once
        dispatch_notification(str(notif1.id))
        self.assertEqual(mock_resend_send.call_count, 1)

        # Attempt to deliver again (worker retry or duplicate task)
        dispatch_notification(str(notif1.id))
        self.assertEqual(mock_resend_send.call_count, 1)  # Did not send second email


class AdminOrderStatusEmailTests(OrderEmailBaseTestCase):
    """Test admin order-status transition notifications, narratives, and shipments."""

    @override_settings(
        RESEND_API_KEY="re_mock_test_key",
        FRONTEND_BASE_URL="https://closetbychilli.com",
    )
    @patch("resend.Emails.send")
    def test_admin_transitions_to_processing(self, mock_resend_send):
        """When an admin transitions CONFIRMED -> PROCESSING, notification is sent."""
        mock_resend_send.return_value = {"id": "resend_proc_1"}

        order = self.create_test_order(
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
        )

        updated_order, audit_log = transition_order_status(
            order=order,
            target_status=Order.Status.PROCESSING,
            actor=self.admin,
            note="Garments cut and moving to hand embroidery.",
        )

        notif = OrderNotification.objects.filter(
            order=updated_order,
            event_type=OrderNotification.EventType.ORDER_STATUS_CHANGED,
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.payload["new_status"], "PROCESSING")
        self.assertIn("embroidery", notif.payload["note"])

        html, text = render_notification_templates(notif)
        self.assertIn("tailored", html.lower())
        self.assertIn("processing", html.lower())

    @override_settings(
        RESEND_API_KEY="re_mock_test_key",
        FRONTEND_BASE_URL="https://closetbychilli.com",
    )
    @patch("resend.Emails.send")
    def test_admin_dispatches_shipment_sends_tracking_notification(self, mock_resend_send):
        """When an admin dispatches a shipment, tracking info is included in the email."""
        mock_resend_send.return_value = {"id": "resend_ship_1"}

        order = self.create_test_order(
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
        )

        shipment = Shipment.objects.create(
            order=order,
            status=Shipment.Status.READY_TO_SHIP,
            carrier="BlueDart Express",
            tracking_number="BD-99887766",
            tracking_url="https://bluedart.com/track?no=BD-99887766",
        )

        dispatched_shipment, _ = dispatch_shipment(
            shipment=shipment,
            actor=self.admin,
            note="Handed over to BlueDart courier at Mumbai hub.",
        )

        notif = OrderNotification.objects.filter(
            order=order,
            event_type=OrderNotification.EventType.SHIPMENT_DISPATCHED,
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.payload["carrier"], "BlueDart Express")
        self.assertEqual(notif.payload["tracking_number"], "BD-99887766")

        html, text = render_notification_templates(notif)
        self.assertIn("BlueDart Express", html)
        self.assertIn("BD-99887766", html)
        self.assertIn("https://bluedart.com/track?no=BD-99887766", html)
        self.assertIn("shipped", html.lower())

    @override_settings(RESEND_API_KEY="re_mock_test_key")
    @patch("resend.Emails.send")
    def test_admin_cancellation_sends_cancellation_email(self, mock_resend_send):
        """When an admin cancels an eligible order, cancellation notification is sent."""
        mock_resend_send.return_value = {"id": "resend_canc_1"}

        order = self.create_test_order(
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
        )

        cancelled_order, audit_log = cancel_order_admin(
            order=order,
            actor=self.admin,
            reason="Customer requested cancellation before payment.",
        )

        notif = OrderNotification.objects.filter(
            order=cancelled_order,
            event_type=OrderNotification.EventType.ORDER_STATUS_CHANGED,
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.payload["new_status"], "CANCELLED")

        html, text = render_notification_templates(notif)
        self.assertIn("cancellation notice", html.lower())
        self.assertIn("cancelled", html.lower())

    @override_settings(RESEND_API_KEY="re_mock_test_key")
    def test_no_email_for_no_op_transition(self):
        """Calling transition_order_status with the current status sends no email."""
        order = self.create_test_order(
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
        )
        initial_count = OrderNotification.objects.filter(order=order).count()

        # No-op transition: CONFIRMED -> CONFIRMED
        transition_order_status(
            order=order,
            target_status=Order.Status.CONFIRMED,
            actor=self.admin,
        )

        self.assertEqual(OrderNotification.objects.filter(order=order).count(), initial_count)

    def test_invalid_transition_raises_and_sends_no_email(self):
        """Invalid transitions fail validation and send no notifications."""
        order = self.create_test_order(
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
        )
        initial_count = OrderNotification.objects.count()

        with self.assertRaises(ValidationError):
            # Cannot jump directly from PENDING to DELIVERED
            transition_order_status(
                order=order,
                target_status=Order.Status.DELIVERED,
                actor=self.admin,
            )

        self.assertEqual(OrderNotification.objects.count(), initial_count)


class ResendFailureAndResilienceTests(OrderEmailBaseTestCase):
    """Test error handling, bounded retries, and transactional isolation."""

    @override_settings(RESEND_API_KEY="re_mock_test_key")
    def test_resend_exception_preserves_error_and_increments_retry(self):
        """When Resend raises an exception, notification records error and increments retry count."""
        self.mock_resend.side_effect = Exception("500 Internal Server Error: Resend gateway timeout")

        order = self.create_test_order(payment_status=Order.PaymentStatus.PAID)
        notif = OrderNotification.objects.create(
            order=order,
            event_type=OrderNotification.EventType.ORDER_CONFIRMATION,
            idempotency_key=f"order_confirmation_fail_test_{order.id}",
            recipient_email="ananya.sharma@example.com",
            recipient_name="Ananya Sharma",
            subject="Order Confirmation",
            payload={"customer_name": "Ananya Sharma"},
            status=OrderNotification.Status.PENDING,
        )

        with self.assertRaises(Exception):
            dispatch_notification(str(notif.id))

        notif.refresh_from_db()
        self.assertEqual(notif.retry_count, 1)
        self.assertIn("Resend gateway timeout", notif.error_message)
        self.assertEqual(notif.status, OrderNotification.Status.PENDING)

    @override_settings(RESEND_API_KEY="re_mock_test_key")
    def test_resend_max_retries_marks_notification_failed(self):
        """Exceeding max_retries marks the notification status as FAILED."""
        self.mock_resend.side_effect = Exception("Fatal API Error")

        order = self.create_test_order(payment_status=Order.PaymentStatus.PAID)
        notif = OrderNotification.objects.create(
            order=order,
            event_type=OrderNotification.EventType.ORDER_CONFIRMATION,
            idempotency_key=f"order_confirmation_max_retry_{order.id}",
            recipient_email="ananya.sharma@example.com",
            recipient_name="Ananya Sharma",
            subject="Order Confirmation",
            payload={"customer_name": "Ananya Sharma"},
            status=OrderNotification.Status.PENDING,
            retry_count=2,
        )

        with self.assertRaises(Exception):
            dispatch_notification(str(notif.id))

        notif.refresh_from_db()
        self.assertEqual(notif.retry_count, 3)
        self.assertEqual(notif.status, OrderNotification.Status.FAILED)

    @override_settings(RESEND_API_KEY="re_mock_test_key")
    def test_recovery_after_transient_failure(self):
        """Notification can be recovered and delivered once Resend connectivity resumes."""
        # 1. Fail first
        self.mock_resend.side_effect = Exception("Temporary socket error")
        order = self.create_test_order(payment_status=Order.PaymentStatus.PAID)
        notif = OrderNotification.objects.create(
            order=order,
            event_type=OrderNotification.EventType.ORDER_CONFIRMATION,
            idempotency_key=f"order_confirmation_recovery_{order.id}",
            recipient_email="ananya.sharma@example.com",
            recipient_name="Ananya Sharma",
            subject="Order Confirmation",
            payload={"customer_name": "Ananya Sharma"},
            status=OrderNotification.Status.PENDING,
        )

        try:
            dispatch_notification(str(notif.id))
        except Exception:
            pass

        notif.refresh_from_db()
        self.assertEqual(notif.retry_count, 1)
        self.assertNotEqual(notif.status, OrderNotification.Status.SENT)

        # 2. Succeed on retry
        self.mock_resend.side_effect = None
        self.mock_resend.return_value = {"id": "recovered_msg_999"}

        success = dispatch_notification(str(notif.id))
        self.assertTrue(success)

        notif.refresh_from_db()
        self.assertEqual(notif.status, OrderNotification.Status.SENT)
        self.assertEqual(notif.resend_email_id, "recovered_msg_999")
        self.assertEqual(notif.error_message, "")

    @override_settings(
        RESEND_API_KEY="re_mock_test_key",
        CELERY_TASK_ALWAYS_EAGER=True,
    )
    def test_celery_task_integration(self):
        """Celery shared_task executes dispatch_notification cleanly."""
        self.mock_resend.return_value = {"id": "celery_success_1"}

        order = self.create_test_order(payment_status=Order.PaymentStatus.PAID)
        notif = OrderNotification.objects.create(
            order=order,
            event_type=OrderNotification.EventType.ORDER_CONFIRMATION,
            idempotency_key=f"order_confirmation_celery_{order.id}",
            recipient_email="ananya.sharma@example.com",
            recipient_name="Ananya Sharma",
            subject="Order Confirmation",
            payload={"customer_name": "Ananya Sharma"},
            status=OrderNotification.Status.PENDING,
        )

        # Call Celery task via apply
        send_order_notification_task.apply(args=[str(notif.id)])

        notif.refresh_from_db()
        self.assertEqual(notif.status, OrderNotification.Status.SENT)
        self.assertEqual(notif.resend_email_id, "celery_success_1")


class PaymentVerificationTriggerTests(OrderEmailBaseTestCase):
    """Test that payments verification triggers order confirmation email idempotently."""

    @override_settings(RESEND_API_KEY="re_mock_test_key")
    @patch("apps.payments.services.verify_razorpay_signature", return_value=True)
    def test_verify_razorpay_payment_triggers_confirmation_email(self, mock_sig):
        """Payment verification via API sends confirmation email."""
        order = self.create_test_order(
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
        )

        mock_client = MagicMock()
        mock_client.payment.fetch.return_value = {
            "id": "pay_test_12345",
            "order_id": order.razorpay_order_id,
            "currency": "INR",
            "amount": 1150000,  # 11500 INR in paise
            "status": "captured",
        }

        verify_razorpay_payment(
            razorpay_order_id=order.razorpay_order_id,
            razorpay_payment_id="pay_test_12345",
            razorpay_signature="mock_signature",
            user=order.user,
            client=mock_client,
        )

        notif = OrderNotification.objects.filter(
            order=order,
            event_type=OrderNotification.EventType.ORDER_CONFIRMATION,
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.status, OrderNotification.Status.SENT)

    @override_settings(RESEND_API_KEY="re_mock_test_key")
    @patch("apps.payments.services.verify_razorpay_webhook_signature", return_value=True)
    def test_process_razorpay_webhook_triggers_confirmation_email(self, mock_sig):
        """Webhook delivery marks order paid and triggers confirmation email."""
        order = self.create_test_order(
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
        )

        webhook_body = f'''{{
            "event": "payment.captured",
            "payload": {{
                "payment": {{
                    "entity": {{
                        "id": "pay_hook_98765",
                        "order_id": "{order.razorpay_order_id}",
                        "amount": 1150000,
                        "currency": "INR"
                    }}
                }}
            }}
        }}'''.encode("utf-8")

        process_razorpay_webhook(
            body=webhook_body,
            signature="mock_webhook_sig",
        )

        notif = OrderNotification.objects.filter(
            order=order,
            event_type=OrderNotification.EventType.ORDER_CONFIRMATION,
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.status, OrderNotification.Status.SENT)

    @override_settings(RESEND_API_KEY="re_mock_test_key")
    @patch("apps.payments.services.verify_razorpay_signature", return_value=True)
    @patch("apps.payments.services.verify_razorpay_webhook_signature", return_value=True)
    def test_both_verification_and_webhook_send_only_one_confirmation(self, mock_webhook_sig, mock_pay_sig):
        """If both client verification and webhook run for same order, exactly one email is created."""
        order = self.create_test_order(
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
        )

        # 1. Verification runs first
        mock_client = MagicMock()
        mock_client.payment.fetch.return_value = {
            "id": "pay_dual_111",
            "order_id": order.razorpay_order_id,
            "currency": "INR",
            "amount": 1150000,
            "status": "captured",
        }

        verify_razorpay_payment(
            razorpay_order_id=order.razorpay_order_id,
            razorpay_payment_id="pay_dual_111",
            razorpay_signature="mock_sig",
            user=order.user,
            client=mock_client,
        )

        # 2. Webhook arrives shortly after
        webhook_body = f'''{{
            "event": "payment.captured",
            "payload": {{
                "payment": {{
                    "entity": {{
                        "id": "pay_dual_111",
                        "order_id": "{order.razorpay_order_id}",
                        "amount": 1150000,
                        "currency": "INR"
                    }}
                }}
            }}
        }}'''.encode("utf-8")

        process_razorpay_webhook(
            body=webhook_body,
            signature="mock_webhook_sig",
        )

        # Confirm exactly 1 notification exists
        self.assertEqual(
            OrderNotification.objects.filter(
                order=order,
                event_type=OrderNotification.EventType.ORDER_CONFIRMATION,
            ).count(),
            1,
        )

