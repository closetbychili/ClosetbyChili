"""
Tests for Admin Analytics & Business Intelligence (Sprint A7).

Validates:
- Strict IsAdminUser authorization (401 unauthenticated, 403 customer, 200 admin).
- Metric calculations (Gross sales, Net revenue, Total orders, AOV, Units sold, New customers).
- Revenue inclusion and exclusion rules (PAID non-cancelled included; PENDING/FAILED/CANCELLED excluded; REFUNDED accounted for).
- Date-range presets & custom boundaries.
- Empty datasets handled safely without exceptions.
- Product rankings (top revenue, units sold, slow-moving).
- Category sales and percentage contribution.
- Customer growth and new vs returning ordering patron breakdown.
"""

import uuid
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import InventoryItem
from apps.orders.models import Order, OrderItem


class AdminAnalyticsAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin@atelier.in",
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.customer_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="customer@patron.in",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        self.repeat_customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="repeat@patron.in",
            role=User.Role.CUSTOMER,
            is_active=True,
        )

        # Catalog
        self.category_silk = Category.objects.create(
            name="Silk Sarees",
            slug="silk-sarees",
            is_active=True,
        )
        self.category_cotton = Category.objects.create(
            name="Chanderi Kurtas",
            slug="chanderi-kurtas",
            is_active=True,
        )

        self.product_saree = Product.objects.create(
            name="Royal Banarasi Saree",
            slug="royal-banarasi-saree",
            category=self.category_silk,
            status="active",
            is_active=True,
        )
        self.variant_saree = ProductVariant.objects.create(
            product=self.product_saree,
            sku="SKU-BANARASI-RED",
            retail_price=Decimal("10000.00"),
            is_active=True,
        )
        self.inv_saree = InventoryItem.objects.create(
            variant=self.variant_saree,
            quantity_available=15,
            quantity_reserved=0,
        )

        self.product_kurta = Product.objects.create(
            name="Ivory Chanderi Kurta",
            slug="ivory-chanderi-kurta",
            category=self.category_cotton,
            status="active",
            is_active=True,
        )
        self.variant_kurta = ProductVariant.objects.create(
            product=self.product_kurta,
            sku="SKU-KURTA-IVORY-M",
            retail_price=Decimal("3000.00"),
            is_active=True,
        )
        self.inv_kurta = InventoryItem.objects.create(
            variant=self.variant_kurta,
            quantity_available=25,
            quantity_reserved=0,
        )

        # Slow moving product
        self.product_slow = Product.objects.create(
            name="Vintage Shawl",
            slug="vintage-shawl",
            category=self.category_silk,
            status="active",
            is_active=True,
        )
        self.variant_slow = ProductVariant.objects.create(
            product=self.product_slow,
            sku="SKU-SHAWL-VINTAGE",
            retail_price=Decimal("5000.00"),
            is_active=True,
        )
        self.inv_slow = InventoryItem.objects.create(
            variant=self.variant_slow,
            quantity_available=50,
            quantity_reserved=0,
        )

        # Historical prior order for repeat_customer (35 days ago)
        self.prior_order = Order.objects.create(
            user=self.repeat_customer,
            order_number="CBC-2026-PRIOR01",
            status=Order.Status.DELIVERED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("3000.00"),
            total=Decimal("3000.00"),
        )
        self.prior_order.created_at = timezone.now() - timedelta(days=35)
        self.prior_order.save(update_fields=["created_at"])

    def test_admin_authorization_enforced(self):
        """Unauthenticated requests receive 401; customers receive 403; admins receive 200."""
        # Unauthenticated
        res = self.client.get("/api/v1/admin/analytics/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer user
        self.client.force_authenticate(user=self.customer_user)
        res = self.client.get("/api/v1/admin/analytics/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin user
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/analytics/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_empty_dataset_handling(self):
        """When no orders exist in the window, API returns clean 0 / 0.00 metrics without 500 error."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/analytics/?period=today")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        kpi = res.data["kpi_summary"]
        self.assertEqual(kpi["gross_sales"]["value"], "0.00")
        self.assertEqual(kpi["net_revenue"]["value"], "0.00")
        self.assertEqual(kpi["total_orders"]["value"], 0)
        self.assertEqual(kpi["average_order_value"]["value"], "0.00")
        self.assertEqual(kpi["units_sold"]["value"], 0)

        # Arrays are empty lists, not null
        self.assertEqual(res.data["product_performance"]["top_by_revenue"], [])
        self.assertEqual(res.data["category_performance"], [])

    def test_revenue_inclusion_and_exclusion_rules(self):
        """
        Only PAID, non-cancelled orders count towards gross sales and net revenue.
        Pending, failed, and cancelled orders are strictly excluded from revenue.
        Refunded orders are tracked separately and excluded from realized net revenue.
        """
        now = timezone.now()

        # 1. Valid Paid Order: Subtotal 10,000, Total 10,000
        o_paid = Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-PAID01",
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("10000.00"),
            discount=Decimal("0.00"),
            total=Decimal("10000.00"),
        )
        OrderItem.objects.create(
            order=o_paid,
            product=self.product_saree,
            variant=self.variant_saree,
            product_name=self.product_saree.name,
            sku=self.variant_saree.sku,
            unit_price=Decimal("10000.00"),
            quantity=1,
            line_total=Decimal("10000.00"),
        )

        # 2. Paid Order with Discount: Subtotal 6,000, Discount 1,000, Total 5,000
        o_paid_discount = Order.objects.create(
            user=self.repeat_customer,
            order_number="CBC-2026-PAID02",
            status=Order.Status.PROCESSING,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("6000.00"),
            discount=Decimal("1000.00"),
            total=Decimal("5000.00"),
        )
        OrderItem.objects.create(
            order=o_paid_discount,
            product=self.product_kurta,
            variant=self.variant_kurta,
            product_name=self.product_kurta.name,
            sku=self.variant_kurta.sku,
            unit_price=Decimal("3000.00"),
            quantity=2,
            line_total=Decimal("6000.00"),
        )

        # 3. Pending (Unpaid) Order: Total 3,000 — MUST NOT COUNT in revenue
        o_pending = Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-PEND01",
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            subtotal=Decimal("3000.00"),
            total=Decimal("3000.00"),
        )
        OrderItem.objects.create(
            order=o_pending,
            product=self.product_kurta,
            variant=self.variant_kurta,
            product_name=self.product_kurta.name,
            sku=self.variant_kurta.sku,
            unit_price=Decimal("3000.00"),
            quantity=1,
            line_total=Decimal("3000.00"),
        )

        # 4. Failed Order: Total 10,000 — MUST NOT COUNT in revenue
        o_failed = Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-FAIL01",
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.FAILED,
            subtotal=Decimal("10000.00"),
            total=Decimal("10000.00"),
        )

        # 5. Cancelled Order: Total 3,000 — MUST NOT COUNT in revenue
        o_cancelled = Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-CANC01",
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.PENDING,
            subtotal=Decimal("3000.00"),
            total=Decimal("3000.00"),
        )

        # 6. Refunded Order: Total 2,000 — Excluded from net revenue, accounted in refunded_orders
        o_refunded = Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-REF01",
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.REFUNDED,
            subtotal=Decimal("2000.00"),
            total=Decimal("2000.00"),
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/analytics/?period=30d&refresh=true")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        kpi = res.data["kpi_summary"]

        # Gross Sales: 10,000 (o_paid) + 6,000 (o_paid_discount) = 16,000.00
        self.assertEqual(kpi["gross_sales"]["value"], "16000.00")

        # Net Revenue: 10,000 (o_paid) + 5,000 (o_paid_discount) = 15,000.00
        self.assertEqual(kpi["net_revenue"]["value"], "15000.00")

        # Total Orders: 6 orders created in this 30d window
        self.assertEqual(kpi["total_orders"]["value"], 6)
        self.assertEqual(kpi["total_orders"]["paid_orders_count"], 2)

        # AOV: 15,000 / 2 = 7,500.00
        self.assertEqual(kpi["average_order_value"]["value"], "7500.00")

        # Units Sold: 1 (saree) + 2 (kurta) = 3 (Net Units Sold)
        self.assertEqual(kpi["units_sold"]["value"], 3)
        self.assertEqual(kpi["units_sold"]["gross_units"], 3)
        self.assertEqual(kpi["units_sold"]["refunded_units"], 0)

        # Order Analytics section
        oa = res.data["order_analytics"]
        self.assertEqual(oa["total_orders"], 6)
        self.assertEqual(oa["paid_orders"], 2)
        self.assertEqual(oa["cancelled_orders"]["count"], 2)  # o_cancelled, o_refunded
        self.assertEqual(oa["refunded_orders"]["count"], 1)   # o_refunded
        self.assertEqual(oa["refunded_orders"]["total_value"], "2000.00")
        self.assertFalse(oa["refund_capabilities"]["partial_refunds_supported"])

        # Product Performance:
        # Top revenue: Saree (10,000.00) followed by Kurta (6,000.00)
        top_rev = res.data["product_performance"]["top_by_revenue"]
        self.assertEqual(len(top_rev), 2)
        self.assertEqual(top_rev[0]["product_name"], "Royal Banarasi Saree")
        self.assertEqual(top_rev[0]["revenue"], "10000.00")
        self.assertEqual(top_rev[1]["product_name"], "Ivory Chanderi Kurta")
        self.assertEqual(top_rev[1]["revenue"], "6000.00")

        # Top units: Kurta (2 units) followed by Saree (1 unit)
        top_units = res.data["product_performance"]["top_by_units"]
        self.assertEqual(top_units[0]["product_name"], "Ivory Chanderi Kurta")
        self.assertEqual(top_units[0]["units_sold"], 2)

        # Slow-moving product: Vintage Shawl (0 units sold, 50 stock)
        slow = res.data["product_performance"]["slow_moving"]
        self.assertTrue(any(p["product_name"] == "Vintage Shawl" and p["units_sold"] == 0 for p in slow))

        # Category Performance:
        # Silk Sarees: 10,000 / 16,000 = 62.5%
        # Chanderi Kurtas: 6,000 / 16,000 = 37.5%
        cats = res.data["category_performance"]
        self.assertEqual(len(cats), 2)
        self.assertEqual(cats[0]["category_name"], "Silk Sarees")
        self.assertEqual(cats[0]["contribution_percentage"], 62.5)
        self.assertEqual(cats[1]["category_name"], "Chanderi Kurtas")
        self.assertEqual(cats[1]["contribution_percentage"], 37.5)

        # Customer Analytics:
        # repeat_customer had a prior order, customer_user did not.
        ca = res.data["customer_analytics"]
        ordering = ca["ordering_behavior"]
        self.assertEqual(ordering["total_unique_buyers"], 2)
        self.assertEqual(ordering["returning_buyers_count"], 1)
        self.assertEqual(ordering["first_time_buyers_count"], 1)
        self.assertEqual(ordering["returning_buyers_percentage"], 50.0)
        self.assertEqual(ordering["first_time_buyers_percentage"], 50.0)

    def test_date_range_presets_and_custom(self):
        """Tests all preset periods and custom date range validation."""
        self.client.force_authenticate(user=self.admin_user)

        for p in ["today", "7d", "30d", "90d", "this_month", "last_month"]:
            res = self.client.get(f"/api/v1/admin/analytics/?period={p}")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data["period"], p)
            self.assertIn("kpi_summary", res.data)
            self.assertIn("revenue_time_series", res.data)

        # Valid custom range
        res = self.client.get("/api/v1/admin/analytics/?period=custom&start_date=2026-10-01&end_date=2026-10-31")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["period"], "custom")

        # Invalid custom range (start > end)
        res = self.client.get("/api/v1/admin/analytics/?period=custom&start_date=2026-10-31&end_date=2026-10-01")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid period name
        res = self.client.get("/api/v1/admin/analytics/?period=forever")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_fully_refunded_orders_and_units_sold_semantics(self):
        """
        Validates that fully refunded orders:
        - Are excluded from Net Units Sold (retained units).
        - Are accounted for in Gross Units Sold (Net Units + Refunded Units).
        - Are tracked in order_analytics.refunded_orders with refunded units count.
        - Cannot inflate Net Revenue, AOV, or product/category performance.
        """
        # 1. Successful paid order with 3 units of Kurta (subtotal 9000, total 9000)
        o_retained = Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-RET01",
            status=Order.Status.DELIVERED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("9000.00"),
            total=Decimal("9000.00"),
        )
        OrderItem.objects.create(
            order=o_retained,
            product=self.product_kurta,
            variant=self.variant_kurta,
            product_name=self.product_kurta.name,
            sku=self.variant_kurta.sku,
            unit_price=Decimal("3000.00"),
            quantity=3,
            line_total=Decimal("9000.00"),
        )

        # 2. Fully refunded order with 2 units of Saree (subtotal 20000, total 20000)
        o_refunded = Order.objects.create(
            user=self.repeat_customer,
            order_number="CBC-2026-REF02",
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.REFUNDED,
            subtotal=Decimal("20000.00"),
            total=Decimal("20000.00"),
        )
        OrderItem.objects.create(
            order=o_refunded,
            product=self.product_saree,
            variant=self.variant_saree,
            product_name=self.product_saree.name,
            sku=self.variant_saree.sku,
            unit_price=Decimal("10000.00"),
            quantity=2,
            line_total=Decimal("20000.00"),
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/analytics/?period=30d&refresh=true")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        kpi = res.data["kpi_summary"]

        # Net Units Sold: strictly the 3 kurta units retained from non-refunded paid order
        self.assertEqual(kpi["units_sold"]["value"], 3)

        # Refunded Units: 2 saree units from fully refunded order
        self.assertEqual(kpi["units_sold"]["refunded_units"], 2)

        # Gross Units Sold: 3 net + 2 refunded = 5 total gross units purchased
        self.assertEqual(kpi["units_sold"]["gross_units"], 5)

        # Net Revenue: only the 9000.00 from o_retained (20000 from o_refunded is excluded)
        self.assertEqual(kpi["net_revenue"]["value"], "9000.00")

        # Refunded orders telemetry
        oa = res.data["order_analytics"]
        self.assertEqual(oa["refunded_orders"]["count"], 1)
        self.assertEqual(oa["refunded_orders"]["total_value"], "20000.00")
        self.assertEqual(oa["refunded_orders"]["refunded_units"], 2)

        # Product performance: Royal Banarasi Saree (which was in refunded order) must NOT appear in top sellers
        top_by_units = res.data["product_performance"]["top_by_units"]
        self.assertEqual(len(top_by_units), 1)
        self.assertEqual(top_by_units[0]["product_name"], "Ivory Chanderi Kurta")
        self.assertEqual(top_by_units[0]["units_sold"], 3)

    def test_aov_with_cancelled_pending_failed_and_refunded_orders(self):
        """
        Validates that Average Order Value (AOV):
        - Numerator: Net revenue strictly from paid non-cancelled, non-refunded orders.
        - Denominator: Count of paid non-cancelled, non-refunded orders.
        - Cancelled, pending, failed, and refunded orders cannot alter numerator or denominator.
        """
        # 1. Qualifying Paid Order A: Rs 6,000
        Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-AOV01",
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("6000.00"),
            total=Decimal("6000.00"),
        )

        # 2. Qualifying Paid Order B: Rs 4,000
        Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-AOV02",
            status=Order.Status.SHIPPED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("4000.00"),
            total=Decimal("4000.00"),
        )

        # 3. Pending (Unpaid) Order: Rs 5,000 (MUST NOT alter numerator or denominator)
        Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-AOV03",
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            subtotal=Decimal("5000.00"),
            total=Decimal("5000.00"),
        )

        # 4. Failed Payment Order: Rs 12,000 (MUST NOT alter numerator or denominator)
        Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-AOV04",
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.FAILED,
            subtotal=Decimal("12000.00"),
            total=Decimal("12000.00"),
        )

        # 5. Cancelled Order: Rs 8,000 (MUST NOT alter numerator or denominator)
        Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-AOV05",
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.PENDING,
            subtotal=Decimal("8000.00"),
            total=Decimal("8000.00"),
        )

        # 6. Refunded Order: Rs 15,000 (MUST NOT alter numerator or denominator)
        Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-AOV06",
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.REFUNDED,
            subtotal=Decimal("15000.00"),
            total=Decimal("15000.00"),
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/analytics/?period=30d&refresh=true")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        kpi = res.data["kpi_summary"]

        # Net Revenue: 6,000 + 4,000 = 10,000.00
        self.assertEqual(kpi["net_revenue"]["value"], "10000.00")

        # Total Orders: 6
        self.assertEqual(kpi["total_orders"]["value"], 6)

        # Paid Qualifying Orders: strictly 2
        self.assertEqual(kpi["total_orders"]["paid_orders_count"], 2)

        # AOV: 10,000 / 2 = 5,000.00
        self.assertEqual(kpi["average_order_value"]["value"], "5000.00")

    def test_aov_zero_qualifying_orders_safety(self):
        """When period has zero paid orders (only cancelled/refunded), AOV safely returns 0.00 without ZeroDivisionError."""
        Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-ZERO01",
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.REFUNDED,
            subtotal=Decimal("5000.00"),
            total=Decimal("5000.00"),
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/analytics/?period=30d&refresh=true")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        kpi = res.data["kpi_summary"]
        self.assertEqual(kpi["net_revenue"]["value"], "0.00")
        self.assertEqual(kpi["total_orders"]["paid_orders_count"], 0)
        self.assertEqual(kpi["average_order_value"]["value"], "0.00")
        self.assertEqual(kpi["units_sold"]["value"], 0)

    def test_product_and_category_cross_metric_consistency(self):
        """
        Validates cross-metric consistency:
        - Product and category performance only aggregate items from qualifying paid orders.
        - Sum of category revenue matches total merchandise revenue from qualifying orders.
        - Cancelled and refunded orders do not appear in product rankings.
        """
        # Paid order
        o_paid = Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-CONS01",
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("16000.00"),
            total=Decimal("16000.00"),
        )
        OrderItem.objects.create(
            order=o_paid,
            product=self.product_saree,
            variant=self.variant_saree,
            product_name=self.product_saree.name,
            sku=self.variant_saree.sku,
            unit_price=Decimal("10000.00"),
            quantity=1,
            line_total=Decimal("10000.00"),
        )
        OrderItem.objects.create(
            order=o_paid,
            product=self.product_kurta,
            variant=self.variant_kurta,
            product_name=self.product_kurta.name,
            sku=self.variant_kurta.sku,
            unit_price=Decimal("3000.00"),
            quantity=2,
            line_total=Decimal("6000.00"),
        )

        # Cancelled order with 5 sarees (subtotal 50,000)
        o_cancelled = Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-CONS02",
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.PENDING,
            subtotal=Decimal("50000.00"),
            total=Decimal("50000.00"),
        )
        OrderItem.objects.create(
            order=o_cancelled,
            product=self.product_saree,
            variant=self.variant_saree,
            product_name=self.product_saree.name,
            sku=self.variant_saree.sku,
            unit_price=Decimal("10000.00"),
            quantity=5,
            line_total=Decimal("50000.00"),
        )

        # Refunded order with 10 kurtas (subtotal 30,000)
        o_refunded = Order.objects.create(
            user=self.customer_user,
            order_number="CBC-2026-CONS03",
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.REFUNDED,
            subtotal=Decimal("30000.00"),
            total=Decimal("30000.00"),
        )
        OrderItem.objects.create(
            order=o_refunded,
            product=self.product_kurta,
            variant=self.variant_kurta,
            product_name=self.product_kurta.name,
            sku=self.variant_kurta.sku,
            unit_price=Decimal("3000.00"),
            quantity=10,
            line_total=Decimal("30000.00"),
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/analytics/?period=30d&refresh=true")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Total units across product_performance must match KPI units_sold (3 units)
        top_units = res.data["product_performance"]["top_by_units"]
        product_units_sum = sum(p["units_sold"] for p in top_units)
        self.assertEqual(product_units_sum, res.data["kpi_summary"]["units_sold"]["value"])
        self.assertEqual(product_units_sum, 3)

        # Total revenue across category_performance must match gross sales (16,000.00)
        categories = res.data["category_performance"]
        cat_rev_sum = sum(Decimal(c["revenue"]) for c in categories)
        self.assertEqual(cat_rev_sum, Decimal(res.data["kpi_summary"]["gross_sales"]["value"]))
        self.assertEqual(cat_rev_sum, Decimal("16000.00"))

