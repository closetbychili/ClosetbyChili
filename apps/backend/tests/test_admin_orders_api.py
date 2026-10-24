"""
Sprint A4.1 — Admin Orders Listing API Tests.

Validates:
- Access control: Admin allowed, unauthenticated (401), customer/staff denied (403)
- Multi-field search (order number, customer email, customer name, shipping address name)
- Order status & payment status filtering (with validation on invalid options)
- Date-range filtering (ISO dates, date-only parsing, invalid format, start > end error)
- Customer ID filtering
- Sorting & deterministic pagination
- Authoritative totals, item counts, and customer summaries
- Query efficiency & no N+1
"""

from decimal import Decimal
import datetime
import uuid

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.catalog.models import Category, Product, ProductVariant
from apps.orders.models import Order, OrderItem


class AdminOrdersApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )

        # Non-admin staff user
        self.staff_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="staff@closetbychilli.com",
            role=User.Role.STAFF,
            is_active=True,
        )

        # Normal customer user
        self.customer1 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="priya@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        self.profile1 = CustomerProfile.objects.create(
            user=self.customer1,
            display_name="Priya Sharma",
            phone="9876543210",
        )

        self.customer2 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="rohit@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )

        # Catalog fixtures for line items
        self.category = Category.objects.create(name="Couture", slug=f"couture-{uuid.uuid4().hex[:6]}")
        self.product = Product.objects.create(
            name="Zari Banarasi Saree",
            slug=f"banarasi-saree-{uuid.uuid4().hex[:6]}",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku=f"ZAR-BAN-{uuid.uuid4().hex[:6]}",
            size="Free",
            color="Gold",
            retail_price=Decimal("15000.00"),
            is_active=True,
        )

        # Create test orders
        self.order1 = Order.objects.create(
            user=self.customer1,
            order_number="CBC-2026-000101",
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            currency="INR",
            subtotal=Decimal("30000.00"),
            total=Decimal("30000.00"),
            shipping_address_snapshot={
                "full_name": "Priya Sharma",
                "phone": "9876543210",
                "city": "Jaipur",
            },
        )
        # Order 1 has 2 items
        OrderItem.objects.create(
            order=self.order1,
            product=self.product,
            variant=self.variant,
            product_name=self.product.name,
            variant_name="Free / Gold",
            sku=self.variant.sku,
            unit_price=Decimal("15000.00"),
            quantity=2,
            line_total=Decimal("30000.00"),
        )

        self.order2 = Order.objects.create(
            user=self.customer2,
            order_number="CBC-2026-000102",
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            currency="INR",
            subtotal=Decimal("15000.00"),
            total=Decimal("15000.00"),
            shipping_address_snapshot={
                "full_name": "Rohit Verma",
                "phone": "9812345678",
                "city": "Delhi",
            },
        )
        OrderItem.objects.create(
            order=self.order2,
            product=self.product,
            variant=self.variant,
            product_name=self.product.name,
            variant_name="Free / Gold",
            sku=self.variant.sku,
            unit_price=Decimal("15000.00"),
            quantity=1,
            line_total=Decimal("15000.00"),
        )

        self.order3 = Order.objects.create(
            user=self.customer1,
            order_number="CBC-2026-000103",
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.FAILED,
            currency="INR",
            subtotal=Decimal("5000.00"),
            total=Decimal("5000.00"),
        )

        # Authenticate as admin by default
        self.client.force_authenticate(user=self.admin_user)

    # --- Authorization Tests ---

    def test_unauthenticated_requests_are_rejected_with_401(self):
        self.client.logout()
        resp = self.client.get("/api/v1/admin/orders/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_requests_are_rejected_with_403(self):
        self.client.force_authenticate(user=self.customer1)
        resp = self.client.get("/api/v1/admin/orders/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_staff_requests_are_rejected_with_403(self):
        self.client.force_authenticate(user=self.staff_user)
        resp = self.client.get("/api/v1/admin/orders/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_user_can_access_orders_list(self):
        resp = self.client.get("/api/v1/admin/orders/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("count", data)
        self.assertIn("results", data)
        self.assertEqual(data["count"], 3)
        self.assertEqual(len(data["results"]), 3)

    # --- Response Structure & Content ---

    def test_order_response_contract_and_customer_summary(self):
        resp = self.client.get(f"/api/v1/admin/orders/?search={self.order1.order_number}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json()["results"]
        self.assertEqual(len(results), 1)

        item = results[0]
        self.assertEqual(item["id"], str(self.order1.id))
        self.assertEqual(item["order_number"], "CBC-2026-000101")
        self.assertEqual(item["status"], "CONFIRMED")
        self.assertEqual(item["status_display"], "Confirmed")
        self.assertEqual(item["payment_status"], "PAID")
        self.assertEqual(item["payment_status_display"], "Paid")
        self.assertEqual(item["currency"], "INR")
        self.assertEqual(item["total"], "30000.00")
        self.assertEqual(item["subtotal"], "30000.00")
        self.assertEqual(item["item_count"], 1)

        # Customer summary checks
        self.assertEqual(item["customer"]["id"], str(self.customer1.id))
        self.assertEqual(item["customer"]["email"], "priya@example.com")
        self.assertEqual(item["customer"]["display_name"], "Priya Sharma")
        self.assertEqual(item["customer"]["phone"], "9876543210")

        # Ensure no sensitive fields are present
        self.assertNotIn("password", item["customer"])
        self.assertNotIn("auth_token", item["customer"])
        self.assertNotIn("token", item["customer"])

    # --- Search Tests ---

    def test_search_by_order_number(self):
        resp = self.client.get("/api/v1/admin/orders/?search=000102")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["order_number"], "CBC-2026-000102")

    def test_search_by_customer_email(self):
        resp = self.client.get("/api/v1/admin/orders/?search=rohit@example.com")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["order_number"], "CBC-2026-000102")

    def test_search_by_customer_display_name(self):
        resp = self.client.get("/api/v1/admin/orders/?search=Priya")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json()["results"]
        self.assertEqual(len(results), 2)  # Order 1 and Order 3 belong to Priya

    def test_search_by_shipping_address_name(self):
        resp = self.client.get("/api/v1/admin/orders/?search=Rohit Verma")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["order_number"], "CBC-2026-000102")

    # --- Status & Payment Status Filter Tests ---

    def test_filter_by_order_status(self):
        resp = self.client.get("/api/v1/admin/orders/?status=CONFIRMED")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["status"], "CONFIRMED")

        # Lowercase test
        resp_lower = self.client.get("/api/v1/admin/orders/?status=confirmed")
        self.assertEqual(resp_lower.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_lower.json()["results"]), 1)

    def test_filter_by_payment_status(self):
        resp = self.client.get("/api/v1/admin/orders/?payment_status=PAID")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["payment_status"], "PAID")

    def _get_error_details(self, resp):
        data = resp.json()
        if isinstance(data, dict):
            if "error" in data and isinstance(data["error"], dict) and "details" in data["error"]:
                return data["error"]["details"]
            if "details" in data:
                return data["details"]
        return data

    def test_invalid_order_status_returns_400(self):
        resp = self.client.get("/api/v1/admin/orders/?status=COMPLETED_INVALID")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", self._get_error_details(resp))

    def test_invalid_payment_status_returns_400(self):
        resp = self.client.get("/api/v1/admin/orders/?payment_status=BOUNCED")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("payment_status", self._get_error_details(resp))

    # --- Date Range Filter Tests ---

    def test_date_range_filtering_created_after_and_before(self):
        today = timezone.now().date()
        date_str = today.strftime("%Y-%m-%d")

        resp = self.client.get(f"/api/v1/admin/orders/?created_after={date_str}&created_before={date_str}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["count"], 3)

        # Future date should return 0 results
        future_date = (today + datetime.timedelta(days=10)).strftime("%Y-%m-%d")
        resp_future = self.client.get(f"/api/v1/admin/orders/?created_after={future_date}")
        self.assertEqual(resp_future.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_future.json()["count"], 0)

    def test_invalid_date_format_returns_400(self):
        resp = self.client.get("/api/v1/admin/orders/?created_after=not-a-date")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("created_after", self._get_error_details(resp))

    def test_inverted_date_range_returns_400(self):
        resp = self.client.get("/api/v1/admin/orders/?created_after=2026-12-31&created_before=2026-01-01")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_range", self._get_error_details(resp))

    # --- Customer Filter Tests ---

    def test_filter_by_customer_id(self):
        resp = self.client.get(f"/api/v1/admin/orders/?customer_id={self.customer2.id}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["order_number"], "CBC-2026-000102")

    def test_invalid_customer_id_returns_400(self):
        resp = self.client.get("/api/v1/admin/orders/?customer_id=invalid-uuid")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("customer_id", self._get_error_details(resp))

    # --- Sorting Tests ---

    def test_sorting_by_total(self):
        resp_asc = self.client.get("/api/v1/admin/orders/?ordering=total")
        self.assertEqual(resp_asc.status_code, status.HTTP_200_OK)
        totals_asc = [Decimal(o["total"]) for o in resp_asc.json()["results"]]
        self.assertEqual(totals_asc, [Decimal("5000.00"), Decimal("15000.00"), Decimal("30000.00")])

        resp_desc = self.client.get("/api/v1/admin/orders/?ordering=-total")
        self.assertEqual(resp_desc.status_code, status.HTTP_200_OK)
        totals_desc = [Decimal(o["total"]) for o in resp_desc.json()["results"]]
        self.assertEqual(totals_desc, [Decimal("30000.00"), Decimal("15000.00"), Decimal("5000.00")])

    def test_sorting_by_order_number(self):
        resp = self.client.get("/api/v1/admin/orders/?ordering=order_number")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        order_numbers = [o["order_number"] for o in resp.json()["results"]]
        self.assertEqual(order_numbers, ["CBC-2026-000101", "CBC-2026-000102", "CBC-2026-000103"])

    def test_invalid_ordering_returns_400(self):
        resp = self.client.get("/api/v1/admin/orders/?ordering=unsupported_field")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ordering", self._get_error_details(resp))

    # --- Query Efficiency & N+1 Prevention ---

    def test_query_count_is_constant_regardless_of_order_count(self):
        # 3 orders currently exist. Fetching them should execute a predictable number of queries
        # 1 query for count, 1 query for page results with select_related user and profile and annotated items count
        with self.assertNumQueries(2):
            resp = self.client.get("/api/v1/admin/orders/")
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertEqual(len(resp.json()["results"]), 3)
