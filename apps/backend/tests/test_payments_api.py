import hashlib
import hmac
import json
import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.addresses.models import Address
from apps.cart.models import Cart
from apps.orders.models import Order
from apps.payments.services import (
    convert_inr_to_paise,
    create_razorpay_order,
    verify_razorpay_payment,
    verify_razorpay_signature,
)


class RazorpayPaymentsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="buyer@example.com",
        )
        self.other_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="other@example.com",
        )
        self.client.force_authenticate(user=self.user)

        self.order = Order.objects.create(
            user=self.user,
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            currency="INR",
            subtotal=Decimal("4500.00"),
            discount=Decimal("0.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("4500.00"),
        )

        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET

    def _generate_valid_signature(self, order_id: str, payment_id: str) -> str:
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        return hmac.new(
            key=self.key_secret.encode("utf-8"),
            msg=msg,
            digestmod=hashlib.sha256,
        ).hexdigest()

    # --- Create Order Tests ---

    def test_unauthenticated_create_order_rejected(self):
        self.client.logout()
        response = self.client.post(
            "/api/v1/payments/razorpay/create-order/",
            data={"order_number": self.order.order_number},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_create_payment_for_another_users_order(self):
        other_client = APIClient()
        other_client.force_authenticate(user=self.other_user)
        response = other_client.post(
            "/api/v1/payments/razorpay/create-order/",
            data={"order_number": self.order.order_number},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_create_payment_for_non_pending_order(self):
        self.order.status = Order.Status.CANCELLED
        self.order.save(update_fields=["status"])

        response = self.client.post(
            "/api/v1/payments/razorpay/create-order/",
            data={"order_number": self.order.order_number},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("INVALID_ORDER_STATUS", str(response.json()))

    def test_cannot_create_payment_for_already_paid_order(self):
        self.order.payment_status = Order.PaymentStatus.PAID
        self.order.save(update_fields=["payment_status"])

        response = self.client.post(
            "/api/v1/payments/razorpay/create-order/",
            data={"order_number": self.order.order_number},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ORDER_ALREADY_PAID", str(response.json()))

    def test_create_order_rejects_client_supplied_amount_or_currency(self):
        response = self.client.post(
            "/api/v1/payments/razorpay/create-order/",
            data={
                "order_number": self.order.order_number,
                "amount": 100,
                "currency": "USD",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.payments.services.get_razorpay_client")
    def test_create_order_success_amount_from_db_and_secret_never_returned(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.order.create.return_value = {"id": "order_rzp_mock_12345"}
        mock_get_client.return_value = mock_client

        response = self.client.post(
            "/api/v1/payments/razorpay/create-order/",
            data={"order_number": self.order.order_number},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Amount must be 4500.00 * 100 = 450000 paise
        self.assertEqual(data["amount"], 450000)
        self.assertEqual(data["currency"], "INR")
        self.assertEqual(data["razorpay_order_id"], "order_rzp_mock_12345")
        self.assertEqual(data["key_id"], self.key_id)
        self.assertEqual(data["order_number"], self.order.order_number)

        # Ensure key_secret is NEVER present
        self.assertNotIn("key_secret", data)
        self.assertNotIn("secret", data)

        # Verified in DB
        self.order.refresh_from_db()
        self.assertEqual(self.order.razorpay_order_id, "order_rzp_mock_12345")

    @patch("apps.payments.services.get_razorpay_client")
    def test_create_order_reuses_existing_razorpay_order_id(self, mock_get_client):
        self.order.razorpay_order_id = "order_rzp_existing_999"
        self.order.save(update_fields=["razorpay_order_id"])

        response = self.client.post(
            "/api/v1/payments/razorpay/create-order/",
            data={"order_number": self.order.order_number},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["razorpay_order_id"], "order_rzp_existing_999")
        # Ensure gateway create was NOT called again
        mock_get_client.assert_not_called()

    # --- Verification Tests ---

    def test_unauthenticated_verify_rejected(self):
        self.client.logout()
        response = self.client.post(
            "/api/v1/payments/razorpay/verify/",
            data={
                "razorpay_order_id": "order_rzp_123",
                "razorpay_payment_id": "pay_rzp_123",
                "razorpay_signature": "sig123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_verify_rejects_client_supplied_amount_or_status(self):
        response = self.client.post(
            "/api/v1/payments/razorpay/verify/",
            data={
                "razorpay_order_id": "order_rzp_123",
                "razorpay_payment_id": "pay_rzp_123",
                "razorpay_signature": "sig123",
                "payment_status": "PAID",
                "amount": 450000,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_signature_rejected(self):
        self.order.razorpay_order_id = "order_rzp_sig_test"
        self.order.save(update_fields=["razorpay_order_id"])

        response = self.client.post(
            "/api/v1/payments/razorpay/verify/",
            data={
                "razorpay_order_id": "order_rzp_sig_test",
                "razorpay_payment_id": "pay_rzp_sig_test",
                "razorpay_signature": "completely_invalid_signature",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("INVALID_SIGNATURE", str(response.json()))
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PENDING)

    def test_verify_fails_if_order_not_found(self):
        sig = self._generate_valid_signature("order_unknown", "pay_unknown")
        response = self.client.post(
            "/api/v1/payments/razorpay/verify/",
            data={
                "razorpay_order_id": "order_unknown",
                "razorpay_payment_id": "pay_unknown",
                "razorpay_signature": sig,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_verify_payment_for_another_users_order(self):
        self.order.razorpay_order_id = "order_rzp_user_check"
        self.order.save(update_fields=["razorpay_order_id"])
        sig = self._generate_valid_signature("order_rzp_user_check", "pay_user_check")

        other_client = APIClient()
        other_client.force_authenticate(user=self.other_user)
        response = other_client.post(
            "/api/v1/payments/razorpay/verify/",
            data={
                "razorpay_order_id": "order_rzp_user_check",
                "razorpay_payment_id": "pay_user_check",
                "razorpay_signature": sig,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("apps.payments.services.get_razorpay_client")
    def test_verify_rejects_mismatched_order_id_from_gateway(self, mock_get_client):
        self.order.razorpay_order_id = "order_rzp_valid"
        self.order.save(update_fields=["razorpay_order_id"])
        sig = self._generate_valid_signature("order_rzp_valid", "pay_mismatch_order")

        mock_client = MagicMock()
        mock_client.payment.fetch.return_value = {
            "id": "pay_mismatch_order",
            "order_id": "order_DIFFERENT_order",
            "currency": "INR",
            "amount": 450000,
        }
        mock_get_client.return_value = mock_client

        response = self.client.post(
            "/api/v1/payments/razorpay/verify/",
            data={
                "razorpay_order_id": "order_rzp_valid",
                "razorpay_payment_id": "pay_mismatch_order",
                "razorpay_signature": sig,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("MISMATCHED_ORDER_ID", str(response.json()))

    @patch("apps.payments.services.get_razorpay_client")
    def test_verify_rejects_wrong_amount_from_gateway(self, mock_get_client):
        self.order.razorpay_order_id = "order_rzp_amount_test"
        self.order.save(update_fields=["razorpay_order_id"])
        sig = self._generate_valid_signature("order_rzp_amount_test", "pay_amount_test")

        mock_client = MagicMock()
        mock_client.payment.fetch.return_value = {
            "id": "pay_amount_test",
            "order_id": "order_rzp_amount_test",
            "currency": "INR",
            "amount": 10000,  # 100 INR instead of 4500 INR
        }
        mock_get_client.return_value = mock_client

        response = self.client.post(
            "/api/v1/payments/razorpay/verify/",
            data={
                "razorpay_order_id": "order_rzp_amount_test",
                "razorpay_payment_id": "pay_amount_test",
                "razorpay_signature": sig,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("MISMATCHED_AMOUNT", str(response.json()))

    @patch("apps.payments.services.get_razorpay_client")
    def test_verify_rejects_wrong_currency_from_gateway(self, mock_get_client):
        self.order.razorpay_order_id = "order_rzp_curr_test"
        self.order.save(update_fields=["razorpay_order_id"])
        sig = self._generate_valid_signature("order_rzp_curr_test", "pay_curr_test")

        mock_client = MagicMock()
        mock_client.payment.fetch.return_value = {
            "id": "pay_curr_test",
            "order_id": "order_rzp_curr_test",
            "currency": "USD",  # Wrong currency
            "amount": 450000,
        }
        mock_get_client.return_value = mock_client

        response = self.client.post(
            "/api/v1/payments/razorpay/verify/",
            data={
                "razorpay_order_id": "order_rzp_curr_test",
                "razorpay_payment_id": "pay_curr_test",
                "razorpay_signature": sig,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("MISMATCHED_CURRENCY", str(response.json()))

    @patch("apps.payments.services.get_razorpay_client")
    def test_valid_verification_transitions_payment_status_to_paid(self, mock_get_client):
        self.order.razorpay_order_id = "order_rzp_success_123"
        self.order.save(update_fields=["razorpay_order_id"])
        sig = self._generate_valid_signature("order_rzp_success_123", "pay_success_123")

        mock_client = MagicMock()
        mock_client.payment.fetch.return_value = {
            "id": "pay_success_123",
            "order_id": "order_rzp_success_123",
            "currency": "INR",
            "amount": 450000,
        }
        mock_get_client.return_value = mock_client

        response = self.client.post(
            "/api/v1/payments/razorpay/verify/",
            data={
                "razorpay_order_id": "order_rzp_success_123",
                "razorpay_payment_id": "pay_success_123",
                "razorpay_signature": sig,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["payment_status"], Order.PaymentStatus.PAID)
        self.assertEqual(data["status"], Order.Status.PENDING)  # Must remain PENDING in sprint 1.4

        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(self.order.razorpay_payment_id, "pay_success_123")
        self.assertEqual(self.order.razorpay_signature, sig)

    @patch("apps.payments.services.get_razorpay_client")
    def test_verification_is_idempotent(self, mock_get_client):
        self.order.razorpay_order_id = "order_rzp_idemp"
        self.order.razorpay_payment_id = "pay_idemp_123"
        self.order.payment_status = Order.PaymentStatus.PAID
        self.order.save(update_fields=["razorpay_order_id", "razorpay_payment_id", "payment_status"])

        sig = self._generate_valid_signature("order_rzp_idemp", "pay_idemp_123")

        response = self.client.post(
            "/api/v1/payments/razorpay/verify/",
            data={
                "razorpay_order_id": "order_rzp_idemp",
                "razorpay_payment_id": "pay_idemp_123",
                "razorpay_signature": sig,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["payment_status"], Order.PaymentStatus.PAID)
        # Should not need to call payment.fetch again
        mock_get_client.assert_not_called()

    def test_conflicting_payment_id_on_already_paid_order_fails(self):
        self.order.razorpay_order_id = "order_rzp_conflict"
        self.order.razorpay_payment_id = "pay_original_123"
        self.order.payment_status = Order.PaymentStatus.PAID
        self.order.save(update_fields=["razorpay_order_id", "razorpay_payment_id", "payment_status"])

        sig = self._generate_valid_signature("order_rzp_conflict", "pay_DIFFERENT_456")

        response = self.client.post(
            "/api/v1/payments/razorpay/verify/",
            data={
                "razorpay_order_id": "order_rzp_conflict",
                "razorpay_payment_id": "pay_DIFFERENT_456",
                "razorpay_signature": sig,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("CONFLICTING_PAYMENT_ID", str(response.json()))

    # --- Webhook Tests ---

    def test_webhook_with_valid_signature_processes_order_paid(self):
        self.order.razorpay_order_id = "order_rzp_wh_123"
        self.order.save(update_fields=["razorpay_order_id"])

        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_wh_captured_123",
                        "order_id": "order_rzp_wh_123",
                        "amount": 450000,
                        "currency": "INR",
                        "status": "captured",
                    }
                }
            },
        }
        body = json.dumps(payload).encode("utf-8")
        sig = hmac.new(
            key=webhook_secret.encode("utf-8"),
            msg=body,
            digestmod=hashlib.sha256,
        ).hexdigest()

        response = self.client.post(
            "/api/v1/payments/razorpay/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=sig,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], "paid")

        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(self.order.razorpay_payment_id, "pay_wh_captured_123")

    def test_webhook_with_invalid_signature_rejected(self):
        payload = {"event": "payment.captured"}
        body = json.dumps(payload).encode("utf-8")

        response = self.client.post(
            "/api/v1/payments/razorpay/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE="invalid_signature",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
