import uuid
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts import authentication
from apps.accounts.models import User
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import InventoryItem
from apps.orders.models import Order, OrderItem



class AdminDashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_supabase_id = uuid.uuid4()
        self.admin_user = User.objects.create(
            supabase_user_id=self.admin_supabase_id,
            email="admin@closetbychili.com",
            role=User.Role.ADMIN,
            is_active=True,
        )

        self.customer_supabase_id = uuid.uuid4()
        self.customer_user = User.objects.create(
            supabase_user_id=self.customer_supabase_id,
            email="shopper@closetbychili.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )

        self.category = Category.objects.create(
            name="Kurtis",
            slug=f"kurtis-{uuid.uuid4().hex[:6]}",
        )
        self.product = Product.objects.create(
            name="Silk Anarkali Kurti",
            slug=f"silk-anarkali-{uuid.uuid4().hex[:6]}",
            category=self.category,
            status=Product.Status.ACTIVE,
        )
        self.variant_1 = ProductVariant.objects.create(
            product=self.product,
            sku=f"ANR-SLK-S-{uuid.uuid4().hex[:4]}",
            size="S",
            color="Crimson",
            retail_price=Decimal("1999.00"),
        )
        self.variant_2 = ProductVariant.objects.create(
            product=self.product,
            sku=f"ANR-SLK-M-{uuid.uuid4().hex[:4]}",
            size="M",
            color="Crimson",
            retail_price=Decimal("1999.00"),
        )

    def _auth_headers(self, user: User) -> dict:
        return {"HTTP_AUTHORIZATION": f"Bearer mock-token-{user.id}"}

    def test_unauthenticated_request_rejected(self):
        response = self.client.get("/api/v1/admin/dashboard/overview/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch.object(authentication, "_decode_token")
    def test_customer_user_rejected_with_403(self, decode_mock):
        decode_mock.return_value = {
            "sub": str(self.customer_supabase_id),
            "email": self.customer_user.email,
        }
        response = self.client.get(
            "/api/v1/admin/dashboard/overview/",
            **self._auth_headers(self.customer_user),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch.object(authentication, "_decode_token")
    def test_empty_dataset_returns_clean_zero_state(self, decode_mock):
        decode_mock.return_value = {
            "sub": str(self.admin_supabase_id),
            "email": self.admin_user.email,
        }
        response = self.client.get(
            "/api/v1/admin/dashboard/overview/?period=30d",
            **self._auth_headers(self.admin_user),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertEqual(data["metrics"]["total_orders"]["value"], 0)
        self.assertEqual(data["metrics"]["gross_revenue"]["value"], "0.00")
        self.assertEqual(data["metrics"]["average_order_value"]["value"], "0.00")
        self.assertEqual(data["metrics"]["low_stock_variants"]["count"], 0)
        self.assertEqual(len(data["recent_orders"]), 0)
        self.assertEqual(len(data["low_stock_alerts"]), 0)
        self.assertEqual(len(data["top_selling_products"]), 0)

    @patch.object(authentication, "_decode_token")
    def test_metric_calculations_and_status_inclusion_exclusion(self, decode_mock):
        decode_mock.return_value = {
            "sub": str(self.admin_supabase_id),
            "email": self.admin_user.email,
        }

        # Order 1: Confirmed & Paid (should count in revenue)
        o1 = Order.objects.create(
            user=self.customer_user,
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            total=Decimal("1999.00"),
        )
        OrderItem.objects.create(
            order=o1,
            product=self.product,
            variant=self.variant_1,
            product_name=self.product.name,
            variant_name=self.variant_1.size,
            sku=self.variant_1.sku,
            unit_price=Decimal("1999.00"),
            quantity=1,
            line_total=Decimal("1999.00"),
        )

        # Order 2: Delivered & Paid (should count in revenue)
        o2 = Order.objects.create(
            user=self.customer_user,
            status=Order.Status.DELIVERED,
            payment_status=Order.PaymentStatus.PAID,
            total=Decimal("3998.00"),
        )
        OrderItem.objects.create(
            order=o2,
            product=self.product,
            variant=self.variant_2,
            product_name=self.product.name,
            variant_name=self.variant_2.size,
            sku=self.variant_2.sku,
            unit_price=Decimal("1999.00"),
            quantity=2,
            line_total=Decimal("3998.00"),
        )

        # Order 3: Pending & Payment Pending (must NOT count towards revenue)
        Order.objects.create(
            user=self.customer_user,
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            total=Decimal("5000.00"),
        )

        # Order 4: Cancelled even if Paid (must NOT count towards revenue)
        Order.objects.create(
            user=self.customer_user,
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.PAID,
            total=Decimal("1500.00"),
        )

        # Order 5: Payment Failed (must NOT count towards revenue)
        Order.objects.create(
            user=self.customer_user,
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.FAILED,
            total=Decimal("800.00"),
        )

        response = self.client.get(
            "/api/v1/admin/dashboard/overview/?period=all",
            **self._auth_headers(self.admin_user),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        # Total orders = 5
        self.assertEqual(data["metrics"]["total_orders"]["value"], 5)

        # Gross revenue: 1999.00 + 3998.00 = 5997.00 (Pending, Failed, Cancelled excluded)
        self.assertEqual(data["metrics"]["gross_revenue"]["value"], "5997.00")
        self.assertEqual(data["metrics"]["gross_revenue"]["paid_orders_count"], 2)

        # Average order value: 5997.00 / 2 = 2998.50
        self.assertEqual(data["metrics"]["average_order_value"]["value"], "2998.50")

        # Top selling products: Silk Anarkali Kurti (units_sold = 3, revenue = 5997.00)
        self.assertEqual(len(data["top_selling_products"]), 1)
        self.assertEqual(data["top_selling_products"][0]["product_name"], "Silk Anarkali Kurti")
        self.assertEqual(data["top_selling_products"][0]["units_sold"], 3)
        self.assertEqual(data["top_selling_products"][0]["revenue"], "5997.00")

    @patch.object(authentication, "_decode_token")
    def test_low_stock_variants_and_threshold(self, decode_mock):
        decode_mock.return_value = {
            "sub": str(self.admin_supabase_id),
            "email": self.admin_user.email,
        }

        # Item 1: stock = 2 (low stock under default 5)
        InventoryItem.objects.create(
            variant=self.variant_1,
            quantity_available=2,
            quantity_reserved=0,
        )
        # Item 2: stock = 15 (healthy stock)
        InventoryItem.objects.create(
            variant=self.variant_2,
            quantity_available=15,
            quantity_reserved=1,
        )

        response = self.client.get(
            "/api/v1/admin/dashboard/overview/?low_stock_threshold=5",
            **self._auth_headers(self.admin_user),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["metrics"]["low_stock_variants"]["count"], 1)
        self.assertEqual(len(response.data["low_stock_alerts"]), 1)
        self.assertEqual(response.data["low_stock_alerts"][0]["sku"], self.variant_1.sku)
        self.assertEqual(response.data["low_stock_alerts"][0]["quantity_available"], 2)

        # Test threshold dynamic parameter (e.g. threshold=20 includes both)
        response_high = self.client.get(
            "/api/v1/admin/dashboard/overview/?low_stock_threshold=20",
            **self._auth_headers(self.admin_user),
        )
        self.assertEqual(response_high.data["metrics"]["low_stock_variants"]["count"], 2)

    @patch.object(authentication, "_decode_token")
    def test_date_range_filtering_and_validation(self, decode_mock):
        decode_mock.return_value = {
            "sub": str(self.admin_supabase_id),
            "email": self.admin_user.email,
        }

        now = timezone.now()

        # Recent order within last 3 days
        o_recent = Order.objects.create(
            user=self.customer_user,
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            total=Decimal("1000.00"),
        )
        Order.objects.filter(id=o_recent.id).update(created_at=now - timedelta(days=2))

        # Older order from 45 days ago
        o_older = Order.objects.create(
            user=self.customer_user,
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            total=Decimal("2000.00"),
        )
        Order.objects.filter(id=o_older.id).update(created_at=now - timedelta(days=45))

        # 7d should only include recent
        res_7d = self.client.get(
            "/api/v1/admin/dashboard/overview/?period=7d",
            **self._auth_headers(self.admin_user),
        )
        self.assertEqual(res_7d.status_code, status.HTTP_200_OK)
        self.assertEqual(res_7d.data["metrics"]["total_orders"]["value"], 1)
        self.assertEqual(res_7d.data["metrics"]["gross_revenue"]["value"], "1000.00")

        # all should include both
        res_all = self.client.get(
            "/api/v1/admin/dashboard/overview/?period=all",
            **self._auth_headers(self.admin_user),
        )
        self.assertEqual(res_all.status_code, status.HTTP_200_OK)
        self.assertEqual(res_all.data["metrics"]["total_orders"]["value"], 2)
        self.assertEqual(res_all.data["metrics"]["gross_revenue"]["value"], "3000.00")

        # Invalid period param returns 400
        res_invalid = self.client.get(
            "/api/v1/admin/dashboard/overview/?period=century",
            **self._auth_headers(self.admin_user),
        )
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)
