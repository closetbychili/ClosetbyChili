"""
Sprint A3.5 — Authoritative Inventory Lifecycle Integration Tests.

Validates end-to-end transactional consistency across:
- Checkout & reservation creation
- Payment verification & stock fulfillment (ORDER_FULFILLED)
- Expiration & automated release (RESERVATION_RELEASED)
- Order cancellation lifecycle rules
- Concurrency protection & no oversell
- Idempotency guards (retries, webhooks)
- Manual adjustments respecting active reservations
- Low-stock calculation correctness across lifecycle mutations
"""

from decimal import Decimal
import uuid
from unittest.mock import patch, MagicMock

from django.conf import settings
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.addresses.models import Address
from apps.cart.models import Cart, CartItem
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import InventoryItem, InventoryMovement, InventoryReservation
from apps.inventory.services import (
    calculate_variant_stock,
    get_inventory_summary_metrics,
    create_order_reservations,
    finalize_order_inventory,
    release_order_reservations,
    expire_stale_reservations,
    adjust_variant_stock,
)
from apps.orders.models import Order, OrderItem
from apps.payments import services as payment_services
from apps.payments.services import verify_razorpay_payment, process_razorpay_webhook
import hmac
import hashlib


class InventoryLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="lifecycle_buyer@example.com",
        )
        self.other_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="other_buyer@example.com",
        )
        self.client.force_authenticate(user=self.user)

        self.category = Category.objects.create(name="Couture", slug=f"couture-{uuid.uuid4().hex[:6]}")
        self.product = Product.objects.create(
            name="Silk Anarkali",
            slug=f"silk-anarkali-{uuid.uuid4().hex[:6]}",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku=f"SLK-NRK-{uuid.uuid4().hex[:6]}",
            size="M",
            color="Crimson",
            retail_price=Decimal("12000.00"),
            is_active=True,
        )
        self.inventory = InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=10,
            quantity_reserved=0,
            low_stock_threshold=5,
        )
        self.address = Address.objects.create(
            user=self.user,
            full_name="Priya Sharma",
            phone="9876543210",
            address_line1="45 Heritage Boulevard",
            city="Jaipur",
            state="Rajasthan",
            postal_code="302001",
            country="India",
            is_default=True,
        )

    def _create_cart_with_quantity(self, quantity: int) -> Cart:
        cart = Cart.objects.create(user=self.user, is_active=True)
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=quantity)
        return cart

    def _generate_signature(self, order_id: str, payment_id: str) -> str:
        secret = settings.RAZORPAY_KEY_SECRET
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        return hmac.new(secret.encode("utf-8"), msg=msg, digestmod=hashlib.sha256).hexdigest()

    # --- 1. Successful Checkout, Reservation, and Payment Completion ---

    @patch.object(payment_services, "get_razorpay_client")
    def test_complete_checkout_and_payment_lifecycle(self, mock_client_factory):
        self._create_cart_with_quantity(3)

        # Step 1: Checkout
        response = self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_number = response.json()["order_number"]
        order = Order.objects.get(order_number=order_number)

        # Invariant checks post-checkout
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_available, 7)
        self.assertEqual(self.inventory.quantity_reserved, 3)
        self.assertEqual(self.inventory.quantity_available + self.inventory.quantity_reserved, 10)

        # Verify active reservation
        res = InventoryReservation.objects.filter(order=order).first()
        self.assertIsNotNone(res)
        self.assertEqual(res.status, InventoryReservation.Status.ACTIVE)
        self.assertEqual(res.quantity, 3)
        self.assertIsNotNone(res.expires_at)

        # Verify ORDER_RESERVED audit movement
        mov = InventoryMovement.objects.filter(
            inventory_item=self.inventory,
            movement_type=InventoryMovement.MovementType.ORDER_RESERVED,
        ).first()
        self.assertIsNotNone(mov)
        self.assertEqual(mov.quantity_change, 0)  # Physical stock not deducted yet
        self.assertEqual(mov.resulting_quantity, 10)  # On-hand remains 10
        self.assertEqual(mov.reference, f"Order {order_number}")

        # Step 2: Payment Verification
        mock_rzp = MagicMock()
        mock_client_factory.return_value = mock_rzp
        mock_rzp.payment.fetch.return_value = {
            "id": "pay_live_999",
            "order_id": "order_rzp_999",
            "amount": 3600000,  # 3 * 12000 INR = 36000 INR = 3600000 paise
            "currency": "INR",
            "status": "captured",
        }

        order.razorpay_order_id = "order_rzp_999"
        order.save(update_fields=["razorpay_order_id"])

        sig = self._generate_signature("order_rzp_999", "pay_live_999")
        pay_resp = self.client.post(
            "/api/v1/payments/razorpay/verify/",
            data={
                "razorpay_order_id": "order_rzp_999",
                "razorpay_payment_id": "pay_live_999",
                "razorpay_signature": sig,
            },
            format="json",
        )
        self.assertEqual(pay_resp.status_code, status.HTTP_200_OK)

        # Post-payment invariants
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CONFIRMED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)

        self.inventory.refresh_from_db()
        # Physical deduction: reserved stock decremented, available remains 7, on-hand now 7
        self.assertEqual(self.inventory.quantity_available, 7)
        self.assertEqual(self.inventory.quantity_reserved, 0)
        self.assertEqual(self.inventory.quantity_available + self.inventory.quantity_reserved, 7)

        res.refresh_from_db()
        self.assertEqual(res.status, InventoryReservation.Status.FINALIZED)

        # Verify ORDER_FULFILLED audit movement
        fulfill_mov = InventoryMovement.objects.filter(
            inventory_item=self.inventory,
            movement_type=InventoryMovement.MovementType.ORDER_FULFILLED,
        ).first()
        self.assertIsNotNone(fulfill_mov)
        self.assertEqual(fulfill_mov.quantity_change, -3)
        self.assertEqual(fulfill_mov.resulting_quantity, 7)

    # --- 2. Insufficient Stock and Atomic Rollback ---

    def test_insufficient_stock_prevents_checkout_and_rolls_back_everything(self):
        self.inventory.quantity_available = 2
        self.inventory.save(update_fields=["quantity_available"])
        self._create_cart_with_quantity(3)

        response = self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"]["code"], "INSUFFICIENT_STOCK")

        # Zero orders, zero reservations, zero movements created
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(InventoryReservation.objects.count(), 0)
        self.assertEqual(InventoryMovement.objects.count(), 0)

        # Inventory completely intact
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_available, 2)
        self.assertEqual(self.inventory.quantity_reserved, 0)

    # --- 3. Duplicate Checkout and Duplicate Payment Idempotency ---

    @patch.object(payment_services, "get_razorpay_client")
    def test_duplicate_payment_webhook_does_not_deduct_inventory_twice(self, mock_client_factory):
        self._create_cart_with_quantity(2)
        resp = self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )
        order = Order.objects.get(order_number=resp.json()["order_number"])
        order.razorpay_order_id = "order_rzp_repeat_1"
        order.save(update_fields=["razorpay_order_id"])

        mock_rzp = MagicMock()
        mock_client_factory.return_value = mock_rzp
        mock_rzp.payment.fetch.return_value = {
            "id": "pay_repeat_1",
            "order_id": "order_rzp_repeat_1",
            "amount": 2400000,
            "currency": "INR",
            "status": "captured",
        }

        # First verification
        sig = self._generate_signature("order_rzp_repeat_1", "pay_repeat_1")
        verify_razorpay_payment(
            razorpay_order_id="order_rzp_repeat_1",
            razorpay_payment_id="pay_repeat_1",
            razorpay_signature=sig,
            client=mock_rzp,
        )

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_available, 8)
        self.assertEqual(self.inventory.quantity_reserved, 0)
        self.assertEqual(
            InventoryMovement.objects.filter(
                movement_type=InventoryMovement.MovementType.ORDER_FULFILLED
            ).count(),
            1,
        )

        # Second verification (idempotent duplicate event)
        verify_razorpay_payment(
            razorpay_order_id="order_rzp_repeat_1",
            razorpay_payment_id="pay_repeat_1",
            razorpay_signature=sig,
            client=mock_rzp,
        )

        # Inventory must NOT be deducted again
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_available, 8)
        self.assertEqual(self.inventory.quantity_reserved, 0)
        self.assertEqual(
            InventoryMovement.objects.filter(
                movement_type=InventoryMovement.MovementType.ORDER_FULFILLED
            ).count(),
            1,
        )

    # --- 4. Customer Order Cancellation and Reservation Release ---

    def test_cancel_pending_order_releases_reservation_and_restores_stock(self):
        self._create_cart_with_quantity(4)
        resp = self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )
        order_number = resp.json()["order_number"]

        # Stock is reserved
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_available, 6)
        self.assertEqual(self.inventory.quantity_reserved, 4)

        # Customer cancels order
        cancel_resp = self.client.post(f"/api/v1/orders/{order_number}/cancel/", format="json")
        self.assertEqual(cancel_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_resp.json()["status"], Order.Status.CANCELLED)

        # Inventory is restored
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_available, 10)
        self.assertEqual(self.inventory.quantity_reserved, 0)

        # Reservation is marked RELEASED
        res = InventoryReservation.objects.filter(order__order_number=order_number).first()
        self.assertIsNotNone(res)
        self.assertEqual(res.status, InventoryReservation.Status.RELEASED)

        # Movement RESERVATION_RELEASED is logged
        rel_mov = InventoryMovement.objects.filter(
            inventory_item=self.inventory,
            movement_type=InventoryMovement.MovementType.RESERVATION_RELEASED,
        ).first()
        self.assertIsNotNone(rel_mov)
        self.assertEqual(rel_mov.quantity_change, 0)
        self.assertEqual(rel_mov.resulting_quantity, 10)

        # Repeated cancellation is idempotent
        repeat_cancel = self.client.post(f"/api/v1/orders/{order_number}/cancel/", format="json")
        self.assertEqual(repeat_cancel.status_code, status.HTTP_200_OK)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_available, 10)

    def test_cannot_cancel_confirmed_or_paid_order_directly(self):
        self._create_cart_with_quantity(2)
        resp = self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )
        order = Order.objects.get(order_number=resp.json()["order_number"])
        order.payment_status = Order.PaymentStatus.PAID
        order.status = Order.Status.CONFIRMED
        order.save(update_fields=["status", "payment_status"])

        cancel_resp = self.client.post(f"/api/v1/orders/{order.order_number}/cancel/", format="json")
        self.assertEqual(cancel_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_cannot_cancel_another_users_order(self):
        self._create_cart_with_quantity(2)
        resp = self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )
        order_number = resp.json()["order_number"]

        # Other user tries to cancel
        other_client = APIClient()
        other_client.force_authenticate(user=self.other_user)
        cancel_resp = other_client.post(f"/api/v1/orders/{order_number}/cancel/", format="json")
        self.assertEqual(cancel_resp.status_code, status.HTTP_404_NOT_FOUND)

    # --- 5. Stale Reservation Expiration Command ---

    def test_expire_stale_reservations_service_and_order_cancellation(self):
        self._create_cart_with_quantity(3)
        resp = self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )
        order_number = resp.json()["order_number"]
        order = Order.objects.get(order_number=order_number)

        # Artificially age the reservation
        res = InventoryReservation.objects.get(order=order)
        res.expires_at = timezone.now() - timezone.timedelta(minutes=1)
        res.save(update_fields=["expires_at"])

        # Run expiration service
        expired_count = expire_stale_reservations()
        self.assertEqual(expired_count, 1)

        # Inventory is restored
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_available, 10)
        self.assertEqual(self.inventory.quantity_reserved, 0)

        # Reservation is RELEASED
        res.refresh_from_db()
        self.assertEqual(res.status, InventoryReservation.Status.RELEASED)

        # Order transitions to CANCELLED
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)

        # Subsequent call finds 0 to expire
        self.assertEqual(expire_stale_reservations(), 0)

    # --- 6. Manual Stock Adjustment While Reserved ---

    def test_manual_adjustment_cannot_reduce_stock_below_active_reservations(self):
        self._create_cart_with_quantity(6)
        self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )

        # Current stock: available=4, reserved=6, on-hand=10
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_available, 4)
        self.assertEqual(self.inventory.quantity_reserved, 6)

        # Attempting to decrease by 5 units exceeds available (4) and would violate reserved stock
        from rest_framework.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            adjust_variant_stock(
                variant_id=self.variant.id,
                adjustment_type="decrease",
                quantity=5,
                reason_code="damaged_goods",
            )

        # Decreasing by 2 units succeeds
        adj = adjust_variant_stock(
            variant_id=self.variant.id,
            adjustment_type="decrease",
            quantity=2,
            reason_code="damaged_goods",
        )
        self.assertEqual(adj["quantity_available"], 2)
        self.assertEqual(adj["quantity_reserved"], 6)
        self.assertEqual(adj["quantity_on_hand"], 8)

    # --- 7. Low-Stock Summary Metrics Across Lifecycle ---

    def test_low_stock_summary_reflects_lifecycle_state(self):
        # Initial: available=10, threshold=5 -> in_stock
        summary1 = get_inventory_summary_metrics()
        self.assertEqual(summary1["total_available"], 10)
        self.assertEqual(summary1["total_reserved"], 0)
        self.assertEqual(summary1["total_on_hand"], 10)
        self.assertEqual(summary1["low_stock_variants"], 0)
        self.assertEqual(summary1["in_stock_variants"], 1)

        # Reserve 7 units -> available=3 <= threshold(5) -> triggers low_stock
        self._create_cart_with_quantity(7)
        self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )

        summary2 = get_inventory_summary_metrics()
        self.assertEqual(summary2["total_available"], 3)
        self.assertEqual(summary2["total_reserved"], 7)
        self.assertEqual(summary2["total_on_hand"], 10)
        self.assertEqual(summary2["low_stock_variants"], 1)
        self.assertEqual(summary2["in_stock_variants"], 0)


class ConcurrentInventoryLifecycleTests(TransactionTestCase):
    def setUp(self):
        self.user1 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="compete1@example.com",
        )
        self.user2 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="compete2@example.com",
        )
        self.category = Category.objects.create(name="Couture", slug=f"couture-{uuid.uuid4().hex[:6]}")
        self.product = Product.objects.create(
            name="Limited Edition Gown",
            slug=f"gown-{uuid.uuid4().hex[:6]}",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku=f"GWN-LTD-{uuid.uuid4().hex[:6]}",
            size="S",
            color="Gold",
            retail_price=Decimal("25000.00"),
            is_active=True,
        )
        # Exactly 1 unit available
        self.inventory = InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=1,
            quantity_reserved=0,
        )
        self.addr1 = Address.objects.create(
            user=self.user1,
            full_name="User One",
            phone="9876543201",
            address_line1="1 Street",
            city="Delhi",
            state="Delhi",
            postal_code="110001",
            country="India",
        )
        self.addr2 = Address.objects.create(
            user=self.user2,
            full_name="User Two",
            phone="9876543202",
            address_line1="2 Street",
            city="Delhi",
            state="Delhi",
            postal_code="110001",
            country="India",
        )

    def test_concurrent_checkouts_prevent_overselling_last_unit(self):
        from concurrent.futures import ThreadPoolExecutor
        from django.db import connection

        if connection.vendor == "sqlite":
            self.skipTest("SQLite cannot test PostgreSQL concurrency.")

        # Both users put the only unit in their cart
        cart1 = Cart.objects.create(user=self.user1, is_active=True)
        CartItem.objects.create(cart=cart1, variant=self.variant, quantity=1)

        cart2 = Cart.objects.create(user=self.user2, is_active=True)
        CartItem.objects.create(cart=cart2, variant=self.variant, quantity=1)

        def do_checkout(user, address):
            client = APIClient()
            client.force_authenticate(user=user)
            return client.post(
                "/api/v1/checkout/",
                data={"shipping_address_id": str(address.id)},
                format="json",
            )

        with ThreadPoolExecutor(max_workers=2) as executor:
            fut1 = executor.submit(do_checkout, self.user1, self.addr1)
            fut2 = executor.submit(do_checkout, self.user2, self.addr2)
            res1 = fut1.result()
            res2 = fut2.result()

        status_codes = [res1.status_code, res2.status_code]
        # Exactly one checkout succeeded (201) and one failed due to insufficient stock (400)
        self.assertEqual(set(status_codes), {status.HTTP_400_BAD_REQUEST, status.HTTP_201_CREATED})

        # Exactly 1 order created, exactly 1 reservation created, 0 oversell
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(InventoryReservation.objects.filter(status=InventoryReservation.Status.ACTIVE).count(), 1)

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_available, 0)
        self.assertEqual(self.inventory.quantity_reserved, 1)
        self.assertEqual(self.inventory.quantity_available + self.inventory.quantity_reserved, 1)
