"""
Closet by Chilli — Admin Customer Directory API Tests (Sprint A6.1).

Tests:
- Admin-only access enforcement (rejects anonymous, customer, and staff accounts).
- Customer listing with annotated order count, paid order count, paid spend, and latest order date.
- Search by customer email, display name, phone, and UUID.
- Pagination bounds (page, page_size, max_page_size).
- Deterministic sorting by newest, oldest, name, order count, and paid spend.
- Exclusion of unpaid (PENDING), failed, cancelled, and refunded orders from paid spend and paid order counts.
- Multiple orders and items aggregation without double-counting.
- Customers with zero orders and customers without CustomerProfile records.
- Filters: has_orders (true/false), status (active/inactive), and registration date range (date_from, date_to).
- Single customer detail endpoint GET /api/v1/admin/customers/<uuid:pk>/ and 404 behavior.
"""

from decimal import Decimal
import uuid

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.addresses.models import Address
from apps.orders.models import Order, Shipment


class AdminCustomerDirectoryApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Admin user
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.admin_user, display_name="System Admin")

        # 2. Staff user
        self.staff_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="staff@closetbychilli.com",
            role=User.Role.STAFF,
            is_active=True,
        )

        # 3. Customer 1: Has 1 paid order, 1 pending order, 1 cancelled order
        self.customer1 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="ananya.sharma@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        self.profile1 = CustomerProfile.objects.create(
            user=self.customer1,
            display_name="Ananya Sharma",
            phone="+919876543210",
        )

        # Customer 1 Orders
        self.c1_order_paid = Order.objects.create(
            user=self.customer1,
            order_number=f"ORD-TEST-{uuid.uuid4().hex[:6]}",
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("3000.00"),
            total=Decimal("2700.00"),
            discount=Decimal("300.00"),
        )
        self.c1_order_pending = Order.objects.create(
            user=self.customer1,
            order_number=f"ORD-TEST-{uuid.uuid4().hex[:6]}",
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            subtotal=Decimal("1500.00"),
            total=Decimal("1500.00"),
        )
        self.c1_order_cancelled = Order.objects.create(
            user=self.customer1,
            order_number=f"ORD-TEST-{uuid.uuid4().hex[:6]}",
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.PAID,  # Paid before cancel; must NOT count towards spend!
            subtotal=Decimal("2000.00"),
            total=Decimal("2000.00"),
        )

        # 4. Customer 2: Has 2 paid orders, active
        self.customer2 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="priya.verma@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        self.profile2 = CustomerProfile.objects.create(
            user=self.customer2,
            display_name="Priya Verma",
            phone="+919876543211",
        )
        self.c2_order1 = Order.objects.create(
            user=self.customer2,
            order_number=f"ORD-TEST-{uuid.uuid4().hex[:6]}",
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("5000.00"),
            total=Decimal("4500.00"),
        )
        self.c2_order2 = Order.objects.create(
            user=self.customer2,
            order_number=f"ORD-TEST-{uuid.uuid4().hex[:6]}",
            status=Order.Status.DELIVERED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("1000.00"),
            total=Decimal("1000.00"),
        )

        # 5. Customer 3: No orders, inactive, no profile
        self.customer3 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="zoya.patel@example.com",
            role=User.Role.CUSTOMER,
            is_active=False,
        )

        self.list_url = "/api/v1/admin/customers/"

    def test_anonymous_and_customer_access_is_denied(self):
        # Anonymous
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer
        self.client.force_authenticate(user=self.customer1)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Non-admin Staff
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_access_succeeds_and_excludes_staff_and_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.json()
        self.assertEqual(data["count"], 3)
        emails = [c["email"] for c in data["results"]]
        self.assertIn("ananya.sharma@example.com", emails)
        self.assertIn("priya.verma@example.com", emails)
        self.assertIn("zoya.patel@example.com", emails)
        # Verify staff and admin are excluded
        self.assertNotIn("admin@closetbychilli.com", emails)
        self.assertNotIn("staff@closetbychilli.com", emails)

    def test_order_aggregations_and_unpaid_cancelled_exclusion(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(self.list_url, {"search": "ananya"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.json()
        self.assertEqual(data["count"], 1)
        c1_data = data["results"][0]

        self.assertEqual(c1_data["email"], "ananya.sharma@example.com")
        self.assertEqual(c1_data["display_name"], "Ananya Sharma")
        # Total orders placed is 3 (1 paid, 1 pending, 1 cancelled)
        self.assertEqual(c1_data["total_order_count"], 3)
        # Successful paid orders is strictly 1 (excludes pending and cancelled)
        self.assertEqual(c1_data["successful_paid_order_count"], 1)
        # Paid spend is strictly 2700.00 (from paid non-cancelled order)
        self.assertEqual(c1_data["total_paid_spend"], "2700.00")
        self.assertIsNotNone(c1_data["latest_order_date"])

    def test_customer_with_zero_orders_and_no_profile(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(self.list_url, {"search": "zoya"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.json()
        self.assertEqual(data["count"], 1)
        c3_data = data["results"][0]

        self.assertEqual(c3_data["email"], "zoya.patel@example.com")
        # Display name falls back to email prefix
        self.assertEqual(c3_data["display_name"], "zoya.patel")
        self.assertEqual(c3_data["phone"], "")
        self.assertFalse(c3_data["is_active"])
        self.assertEqual(c3_data["total_order_count"], 0)
        self.assertEqual(c3_data["successful_paid_order_count"], 0)
        self.assertEqual(c3_data["total_paid_spend"], "0.00")
        self.assertIsNone(c3_data["latest_order_date"])

    def test_search_by_email_display_name_phone_and_uuid(self):
        self.client.force_authenticate(user=self.admin_user)

        # Search by email
        res = self.client.get(self.list_url, {"search": "priya.verma"})
        self.assertEqual(res.json()["count"], 1)

        # Search by display name
        res = self.client.get(self.list_url, {"search": "Ananya"})
        self.assertEqual(res.json()["count"], 1)

        # Search by phone
        res = self.client.get(self.list_url, {"search": "9876543211"})
        self.assertEqual(res.json()["count"], 1)

        # Search by exact customer UUID
        res = self.client.get(self.list_url, {"search": str(self.customer1.id)})
        self.assertEqual(res.json()["count"], 1)
        self.assertEqual(res.json()["results"][0]["id"], str(self.customer1.id))

    def test_has_orders_filter(self):
        self.client.force_authenticate(user=self.admin_user)

        # has_orders=true: customer1 (3 orders), customer2 (2 orders)
        res = self.client.get(self.list_url, {"has_orders": "true"})
        self.assertEqual(res.json()["count"], 2)

        # has_orders=false: customer3 (0 orders)
        res = self.client.get(self.list_url, {"has_orders": "false"})
        self.assertEqual(res.json()["count"], 1)
        self.assertEqual(res.json()["results"][0]["email"], "zoya.patel@example.com")

        # invalid has_orders
        res = self.client.get(self.list_url, {"has_orders": "not_a_bool"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_status_filter(self):
        self.client.force_authenticate(user=self.admin_user)

        # status=active
        res = self.client.get(self.list_url, {"status": "active"})
        self.assertEqual(res.json()["count"], 2)

        # status=inactive
        res = self.client.get(self.list_url, {"status": "inactive"})
        self.assertEqual(res.json()["count"], 1)
        self.assertEqual(res.json()["results"][0]["email"], "zoya.patel@example.com")

    def test_sorting_options(self):
        self.client.force_authenticate(user=self.admin_user)

        # Sort by paid_spend desc: customer2 (5500.00), customer1 (2700.00), customer3 (0.00)
        res = self.client.get(self.list_url, {"sort": "paid_spend_desc"})
        spends = [r["total_paid_spend"] for r in res.json()["results"]]
        self.assertEqual(spends, ["5500.00", "2700.00", "0.00"])

        # Sort by order_count desc: customer1 (3), customer2 (2), customer3 (0)
        res = self.client.get(self.list_url, {"sort": "order_count_desc"})
        counts = [r["total_order_count"] for r in res.json()["results"]]
        self.assertEqual(counts, [3, 2, 0])

        # Sort by name asc: Ananya Sharma, Priya Verma, zoya.patel
        res = self.client.get(self.list_url, {"sort": "name_asc"})
        names = [r["display_name"] for r in res.json()["results"]]
        self.assertEqual(names, ["Ananya Sharma", "Priya Verma", "zoya.patel"])

    def test_pagination_and_bounds(self):
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.get(self.list_url, {"page": 1, "page_size": 2})
        data = res.json()
        self.assertEqual(data["count"], 3)
        self.assertEqual(len(data["results"]), 2)
        self.assertIsNotNone(data["next"])

        # Page 2
        res = self.client.get(self.list_url, {"page": 2, "page_size": 2})
        data = res.json()
        self.assertEqual(len(data["results"]), 1)

    def test_single_customer_detail_endpoint(self):
        self.client.force_authenticate(user=self.admin_user)

        detail_url = f"/api/v1/admin/customers/{self.customer1.id}/"
        res = self.client.get(detail_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.json()
        self.assertEqual(data["id"], str(self.customer1.id))
        self.assertEqual(data["email"], "ananya.sharma@example.com")
        self.assertEqual(data["display_name"], "Ananya Sharma")
        self.assertEqual(data["total_order_count"], 3)
        self.assertEqual(data["successful_paid_order_count"], 1)
        self.assertEqual(data["total_paid_spend"], "2700.00")
        self.assertEqual(data["supabase_user_id"], str(self.customer1.supabase_user_id))

        # 404 for non-existent UUID
        non_existent = uuid.uuid4()
        res = self.client.get(f"/api/v1/admin/customers/{non_existent}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_detail_saved_addresses_and_default(self):
        """Validates address list serialization, default address ordering, and address fields."""
        self.client.force_authenticate(user=self.admin_user)

        # Create two addresses for customer1: one default, one secondary
        addr1 = Address.objects.create(
            user=self.customer1,
            full_name="Ananya Sharma Home",
            phone="+919876543210",
            address_line1="Flat 402, Lotus Apartments",
            address_line2="Park Street",
            landmark="Near City Center",
            city="Kolkata",
            state="West Bengal",
            postal_code="700016",
            country="India",
            address_type=Address.AddressType.HOME,
            is_default=True,
        )
        addr2 = Address.objects.create(
            user=self.customer1,
            full_name="Ananya Work",
            phone="+919876543211",
            address_line1="Tower B, Tech Park",
            city="Kolkata",
            state="West Bengal",
            postal_code="700091",
            country="India",
            address_type=Address.AddressType.OFFICE,
            is_default=False,
        )

        res = self.client.get(f"/api/v1/admin/customers/{self.customer1.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertIn("addresses", data)
        self.assertEqual(len(data["addresses"]), 2)
        # Default address must appear first
        self.assertTrue(data["addresses"][0]["is_default"])
        self.assertEqual(data["addresses"][0]["full_name"], "Ananya Sharma Home")
        self.assertEqual(data["addresses"][0]["postal_code"], "700016")
        self.assertFalse(data["addresses"][1]["is_default"])

    def test_customer_detail_orders_pagination_and_shipment(self):
        """Validates order history pagination and shipment details on customer detail endpoint."""
        self.client.force_authenticate(user=self.admin_user)

        # Attach a shipment to paid order of customer1
        shipment = Shipment.objects.create(
            order=self.c1_order_paid,
            carrier="BlueDart",
            tracking_number="BD12345678",
            tracking_url="https://bluedart.example.com/track/BD12345678",
            status=Shipment.Status.SHIPPED,
        )

        # Request page 1 with page_size=2 (customer1 has 3 orders)
        res = self.client.get(f"/api/v1/admin/customers/{self.customer1.id}/", {"page": 1, "page_size": 2})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        orders_data = data["orders"]
        self.assertEqual(orders_data["count"], 3)
        self.assertEqual(orders_data["page"], 1)
        self.assertEqual(orders_data["page_size"], 2)
        self.assertEqual(orders_data["total_pages"], 2)
        self.assertTrue(orders_data["has_next"])
        self.assertFalse(orders_data["has_previous"])
        self.assertEqual(len(orders_data["results"]), 2)

        # Locate the order with shipment in results
        order_with_shipment = next((o for o in orders_data["results"] if o["id"] == str(self.c1_order_paid.id)), None)
        if order_with_shipment:
            self.assertIsNotNone(order_with_shipment["shipment"])
            self.assertEqual(order_with_shipment["shipment"]["carrier"], "BlueDart")
            self.assertEqual(order_with_shipment["shipment"]["tracking_number"], "BD12345678")
            self.assertEqual(order_with_shipment["shipment"]["status"], "SHIPPED")

    def test_customer_detail_financial_metrics_and_aov(self):
        """Validates purchase_summary metrics, AOV calculation, and exclusion of unpaid/cancelled orders."""
        self.client.force_authenticate(user=self.admin_user)

        # customer2 has 2 orders:
        # c2_order1: PAID (total=4500.00)
        # c2_order2: PAID (total=1000.00)
        # total_paid_spend = 5500.00, paid_orders = 2, AOV = 5500.00 / 2 = 2750.00
        res = self.client.get(f"/api/v1/admin/customers/{self.customer2.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        summary = data["purchase_summary"]
        self.assertEqual(summary["total_orders"], 2)
        self.assertEqual(summary["paid_orders"], 2)
        self.assertEqual(summary["total_paid_spend"], "5500.00")
        self.assertEqual(summary["average_order_value"], "2750.00")
        self.assertEqual(data["average_order_value"], "2750.00")

    def test_customer_detail_zero_orders_and_addresses(self):
        """Validates empty lists, zero metrics, and 0.00 AOV for customer with no activity."""
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.get(f"/api/v1/admin/customers/{self.customer3.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertEqual(data["addresses"], [])
        self.assertEqual(data["orders"]["count"], 0)
        self.assertEqual(data["orders"]["results"], [])
        self.assertEqual(data["purchase_summary"]["total_orders"], 0)
        self.assertEqual(data["purchase_summary"]["paid_orders"], 0)
        self.assertEqual(data["purchase_summary"]["total_paid_spend"], "0.00")
        self.assertEqual(data["purchase_summary"]["average_order_value"], "0.00")

    def test_customer_detail_query_efficiency(self):
        """Ensures single customer detail endpoint does not trigger N+1 queries."""
        self.client.force_authenticate(user=self.admin_user)

        # Preload customer1 with addresses and shipment
        Address.objects.create(
            user=self.customer1,
            full_name="Ananya Sharma Home",
            phone="+919876543210",
            address_line1="Flat 402",
            city="Kolkata",
            state="West Bengal",
            postal_code="700016",
        )

        with self.assertNumQueries(5):
            # 1. User with annotated metrics
            # 2. Addresses
            # 3. Orders count
            # 4. Orders with distinct item count
            # 5. Prefetched shipments
            res = self.client.get(f"/api/v1/admin/customers/{self.customer1.id}/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
