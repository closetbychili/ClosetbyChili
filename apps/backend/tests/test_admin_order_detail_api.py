"""
Closet by Chilli — Admin Order Detail API Tests (Sprint A4.2).

Covers:
- Admin access allowed.
- Unauthenticated and customer access denied (401/403).
- Lookup by UUID and order number.
- 404 on missing or invalid order identifier.
- Order summary fields, currency, and exact financial totals.
- Customer sanitization (no credentials/tokens).
- Immutable historical shipping and billing snapshots.
- Order item snapshots reflect purchase prices, not mutated catalog prices.
- Payment records: server-verified fields exposed without sensitive signatures/secrets.
- Inventory lifecycle: reservations and movements associated with the order.
- Orders without payment or inventory return valid empty collections.
- Query count efficiency.
"""

from decimal import Decimal
import uuid

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.catalog.models import Category, Product, ProductImage, ProductVariant
from apps.inventory.models import InventoryItem, InventoryMovement, InventoryReservation
from apps.orders.models import Order, OrderItem


class AdminOrderDetailApiTests(TestCase):
    """Test suite for GET /api/v1/admin/orders/<order_id>/."""

    def setUp(self):
        self.client = APIClient()

        # 1. Staff / Admin user
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        CustomerProfile.objects.create(
            user=self.admin_user,
            display_name="Admin Chilli",
            phone="9999999999",
        )

        # 2. Customer user
        self.customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="ananya@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(
            user=self.customer,
            display_name="Ananya Sen",
            phone="9876543210",
        )

        # 3. Catalog setup
        self.category = Category.objects.create(
            name="Sarees",
            slug=f"sarees-{uuid.uuid4().hex[:6]}",
        )
        self.product = Product.objects.create(
            name="Banarasi Silk Saree",
            slug=f"banarasi-silk-saree-{uuid.uuid4().hex[:6]}",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.product_image = ProductImage.objects.create(
            product=self.product,
            image_url="https://res.cloudinary.com/chilli/image/upload/banarasi_primary.jpg",
            is_primary=True,
            ordering=0,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku=f"BAN-SLK-{uuid.uuid4().hex[:6]}",
            size="Free",
            color="Crimson",
            retail_price=Decimal("25000.00"),
            is_active=True,
        )
        self.inventory_item = InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=10,
            quantity_reserved=2,
            low_stock_threshold=3,
        )

        # 4. Create Order with items, payment identifiers, snapshots, reservations, movements
        self.order = Order.objects.create(
            user=self.customer,
            order_number="CBC-2026-000201",
            idempotency_key="idemp_checkout_201",
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            currency="INR",
            subtotal=Decimal("50000.00"),
            discount=Decimal("2000.00"),
            shipping_amount=Decimal("500.00"),
            tax_amount=Decimal("2400.00"),
            total=Decimal("50900.00"),
            razorpay_order_id="order_rzp_201",
            razorpay_payment_id="pay_rzp_201",
            razorpay_signature="secret_hmac_sha256_sig_do_not_expose",
            shipping_address_snapshot={
                "full_name": "Ananya Sen",
                "phone": "9876543210",
                "address_line1": "Flat 4B, Heritage Towers",
                "city": "Kolkata",
                "state": "West Bengal",
                "postal_code": "700029",
                "country": "India",
            },
            billing_address_snapshot={
                "full_name": "Ananya Sen",
                "phone": "9876543210",
                "address_line1": "Flat 4B, Heritage Towers",
                "city": "Kolkata",
                "state": "West Bengal",
                "postal_code": "700029",
                "country": "India",
            },
        )

        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            variant=self.variant,
            product_name="Banarasi Silk Saree",
            variant_name="Free / Crimson",
            sku=self.variant.sku,
            unit_price=Decimal("25000.00"),
            quantity=2,
            line_total=Decimal("50000.00"),
        )

        # Inventory reservation and movements tied to this order
        self.reservation = InventoryReservation.objects.create(
            inventory_item=self.inventory_item,
            order=self.order,
            quantity=2,
            status=InventoryReservation.Status.FINALIZED,
            expires_at=timezone.now() + timezone.timedelta(minutes=30),
        )

        self.movement = InventoryMovement.objects.create(
            inventory_item=self.inventory_item,
            movement_type=InventoryMovement.MovementType.ORDER_FULFILLED,
            quantity_change=-2,
            resulting_quantity=10,
            reference=f"Order {self.order.order_number}",
            reason_code="order_fulfilled",
            note="Stock deducted upon payment confirmation",
            actor=self.admin_user,
            actor_email=self.admin_user.email,
        )

        # Authenticate client as admin by default
        self.client.force_authenticate(user=self.admin_user)

    # --- Authorization Tests ---

    def test_admin_access_allowed_by_uuid(self):
        resp = self.client.get(f"/api/v1/admin/orders/{self.order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["id"], str(self.order.id))
        self.assertEqual(data["order_number"], "CBC-2026-000201")

    def test_admin_access_allowed_by_order_number(self):
        resp = self.client.get(f"/api/v1/admin/orders/{self.order.order_number}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["id"], str(self.order.id))
        self.assertEqual(data["order_number"], "CBC-2026-000201")

    def test_unauthenticated_access_denied(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get(f"/api/v1/admin/orders/{self.order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_access_denied(self):
        self.client.force_authenticate(user=self.customer)
        resp = self.client.get(f"/api/v1/admin/orders/{self.order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_nonexistent_order_returns_404(self):
        random_uuid = uuid.uuid4()
        resp = self.client.get(f"/api/v1/admin/orders/{random_uuid}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

        resp_invalid_no = self.client.get("/api/v1/admin/orders/CBC-2026-999999/")
        self.assertEqual(resp_invalid_no.status_code, status.HTTP_404_NOT_FOUND)

    # --- Order Summary & Financials Tests ---

    def test_order_summary_and_financial_breakdown(self):
        resp = self.client.get(f"/api/v1/admin/orders/{self.order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        self.assertEqual(data["order_number"], "CBC-2026-000201")
        self.assertEqual(data["status"], "CONFIRMED")
        self.assertEqual(data["status_display"], "Confirmed")
        self.assertEqual(data["payment_status"], "PAID")
        self.assertEqual(data["payment_status_display"], "Paid")
        self.assertEqual(data["currency"], "INR")
        self.assertEqual(data["subtotal"], "50000.00")
        self.assertEqual(data["discount"], "2000.00")
        self.assertEqual(data["shipping_amount"], "500.00")
        self.assertEqual(data["tax_amount"], "2400.00")
        self.assertEqual(data["total"], "50900.00")
        self.assertEqual(data["item_count"], 1)
        self.assertEqual(data["total_units"], 2)
        self.assertEqual(data["idempotency_key"], "idemp_checkout_201")

    # --- Customer Sanitization Tests ---

    def test_customer_information_sanitization(self):
        resp = self.client.get(f"/api/v1/admin/orders/{self.order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        customer = resp.json()["customer"]

        self.assertEqual(customer["id"], str(self.customer.id))
        self.assertEqual(customer["email"], "ananya@example.com")
        self.assertEqual(customer["display_name"], "Ananya Sen")
        self.assertEqual(customer["phone"], "9876543210")

        # Must never expose credentials or secret tokens
        self.assertNotIn("password", customer)
        self.assertNotIn("auth_token", customer)
        self.assertNotIn("token", customer)

    # --- Historical Snapshots & Items Tests ---

    def test_shipping_and_billing_snapshots_are_immutable(self):
        resp = self.client.get(f"/api/v1/admin/orders/{self.order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        self.assertEqual(data["shipping_address"]["city"], "Kolkata")
        self.assertEqual(data["shipping_address"]["address_line1"], "Flat 4B, Heritage Towers")
        self.assertEqual(data["billing_address"]["postal_code"], "700029")

    def test_items_snapshot_reflects_purchase_price_not_current_catalog(self):
        # Mutate catalog retail price after purchase
        self.variant.retail_price = Decimal("35000.00")
        self.variant.save(update_fields=["retail_price"])

        resp = self.client.get(f"/api/v1/admin/orders/{self.order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        items = resp.json()["items"]

        self.assertEqual(len(items), 1)
        item = items[0]
        # Unit price in snapshot remains 25000.00, not 35000.00!
        self.assertEqual(item["unit_price"], "25000.00")
        self.assertEqual(item["line_total"], "50000.00")
        self.assertEqual(item["quantity"], 2)
        self.assertEqual(item["product_name"], "Banarasi Silk Saree")
        self.assertEqual(item["sku"], self.variant.sku)
        self.assertEqual(item["image_url"], "https://res.cloudinary.com/chilli/image/upload/banarasi_primary.jpg")

    # --- Payment Records Tests ---

    def test_payment_records_include_safe_identifiers_and_omit_signatures(self):
        resp = self.client.get(f"/api/v1/admin/orders/{self.order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        payment = data["payment"]
        self.assertIsNotNone(payment)
        self.assertEqual(payment["provider"], "Razorpay")
        self.assertEqual(payment["status"], "PAID")
        self.assertEqual(payment["status_display"], "Paid")
        self.assertEqual(payment["amount"], "50900.00")
        self.assertEqual(payment["currency"], "INR")
        self.assertEqual(payment["razorpay_order_id"], "order_rzp_201")
        self.assertEqual(payment["razorpay_payment_id"], "pay_rzp_201")

        # Crucial: signature must never be present
        self.assertNotIn("razorpay_signature", payment)
        self.assertNotIn("signature", payment)
        self.assertNotIn("secret", payment)

    # --- Inventory Lifecycle Tests ---

    def test_inventory_reservations_and_movements_included(self):
        resp = self.client.get(f"/api/v1/admin/orders/{self.order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        inv = resp.json()["inventory"]

        self.assertEqual(len(inv["reservations"]), 1)
        res = inv["reservations"][0]
        self.assertEqual(res["quantity"], 2)
        self.assertEqual(res["status"], "finalized")
        self.assertEqual(res["status_display"], "Finalized")
        self.assertEqual(res["sku"], self.variant.sku)

        self.assertEqual(len(inv["movements"]), 1)
        mov = inv["movements"][0]
        self.assertEqual(mov["movement_type"], "order_fulfilled")
        self.assertEqual(mov["movement_type_display"], "Order Fulfilled")
        self.assertEqual(mov["quantity_change"], -2)
        self.assertEqual(mov["reference"], "Order CBC-2026-000201")
        self.assertEqual(mov["actor_email"], self.admin_user.email)

    # --- Empty State Tests ---

    def test_order_without_payment_or_inventory_returns_valid_empty_collections(self):
        bare_order = Order.objects.create(
            user=self.customer,
            order_number="CBC-2026-000202",
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            currency="INR",
            subtotal=Decimal("10000.00"),
            total=Decimal("10000.00"),
        )

        resp = self.client.get(f"/api/v1/admin/orders/{bare_order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        self.assertEqual(data["payments"], [])
        self.assertIsNone(data["payment"])
        self.assertEqual(data["inventory"]["reservations"], [])
        self.assertEqual(data["inventory"]["movements"], [])
        self.assertEqual(data["shipping_address"], {})
        self.assertEqual(data["billing_address"], {})

    # --- Query Count Efficiency ---

    def test_query_efficiency_avoids_n_plus_one(self):
        # Create an order with 5 items to test query scaling
        multi_order = Order.objects.create(
            user=self.customer,
            order_number="CBC-2026-000203",
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            currency="INR",
            subtotal=Decimal("50000.00"),
            total=Decimal("50000.00"),
        )
        for i in range(5):
            OrderItem.objects.create(
                order=multi_order,
                product=self.product,
                variant=self.variant,
                product_name=f"Item {i}",
                sku=f"SKU-{i}",
                unit_price=Decimal("10000.00"),
                quantity=1,
                line_total=Decimal("10000.00"),
            )

        with self.assertNumQueries(6):
            resp = self.client.get(f"/api/v1/admin/orders/{multi_order.id}/")
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertEqual(len(resp.json()["items"]), 5)
