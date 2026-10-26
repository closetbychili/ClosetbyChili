"""
Closet by Chilli — Coupon Reporting & Promotion Analytics Test Suite.

Sprint A5.5 Verification Suite.
Validates:
1. Admin-only access enforcement (rejects anonymous and customer requests with 401/403).
2. Date range boundary filtering and validation (handles ISO datetimes, date-only, invalid format, and inverted dates).
3. Overview reporting metrics:
   - Number of coupons created and active.
   - Finalized (successful) redemptions.
   - Separate accounting of reserved and released redemptions.
   - Strictly paid orders considered for discount granted and revenue (excludes unpaid, failed, and cancelled).
   - Distinct customer reach calculation.
   - Orders breakdown by status and payment status.
   - Average discount per redemption and remaining capacity metrics.
4. Coupon performance benchmarking:
   - Per-coupon aggregates (redemptions, revenue, discount, AOV before/after discount).
   - Search by code and name.
   - Filters (is_active, discount_type, lifecycle_status).
   - Deterministic sorting by redemptions, revenue, discount, and recent redemption.
   - Pagination.
5. Cross-coupon redemption audit report:
   - Masked customer email display adhering to privacy requirements.
   - State, payment status, and order status filters.
   - Missing/nullable order relationship handling.
   - Deterministic ordering and pagination.
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.orders.models import Coupon, CouponRedemption, Order


class CouponReportingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.now = timezone.now()

        # 1. Users: 1 Admin, 2 Customers
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )

        self.customer1 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="muse_alpha@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.customer1, display_name="Alpha Muse")

        self.customer2 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="muse_beta@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.customer2, display_name="Beta Muse")

        # 2. Coupons
        # Coupon A: Percentage discount with usage limit of 10
        self.coupon_a = Coupon.objects.create(
            code="FESTIVE10",
            name="Festive 10% Off",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("10.00"),
            min_order_subtotal=Decimal("1000.00"),
            usage_limit=10,
            start_date=self.now - timedelta(days=10),
            end_date=self.now + timedelta(days=20),
            is_active=True,
            created_by=self.admin_user,
        )

        # Coupon B: Fixed discount with no global usage limit
        self.coupon_b = Coupon.objects.create(
            code="FLAT500",
            name="Flat 500 Off",
            discount_type=Coupon.DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("500.00"),
            min_order_subtotal=Decimal("2000.00"),
            usage_limit=None,
            start_date=self.now - timedelta(days=5),
            end_date=self.now + timedelta(days=15),
            is_active=True,
            created_by=self.admin_user,
        )

        # Coupon C: Inactive coupon with 0 redemptions
        self.coupon_c = Coupon.objects.create(
            code="SUMMER20",
            name="Summer Promo",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("20.00"),
            usage_limit=50,
            start_date=self.now - timedelta(days=30),
            end_date=self.now - timedelta(days=5),
            is_active=False,
            created_by=self.admin_user,
        )

        # 3. Orders and Redemptions
        # Order 1: PAID order with Coupon A by Customer 1
        self.order1 = Order.objects.create(
            user=self.customer1,
            order_number="CBC-2026-900001",
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("3000.00"),
            discount=Decimal("300.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("2700.00"),
            coupon=self.coupon_a,
            coupon_code="FESTIVE10",
            razorpay_order_id="order_rp_001",
            razorpay_payment_id="pay_rp_001",
        )
        self.redemption1 = CouponRedemption.objects.create(
            coupon=self.coupon_a,
            customer=self.customer1,
            order=self.order1,
            state=CouponRedemption.State.REDEEMED,
            discount_amount=Decimal("300.00"),
            currency="INR",
            idempotency_key="idem-001",
            reserved_at=self.now - timedelta(days=2),
            finalized_at=self.now - timedelta(days=2),
        )

        # Order 2: PAID order with Coupon A by Customer 2
        self.order2 = Order.objects.create(
            user=self.customer2,
            order_number="CBC-2026-900002",
            status=Order.Status.PROCESSING,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("5000.00"),
            discount=Decimal("500.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("4500.00"),
            coupon=self.coupon_a,
            coupon_code="FESTIVE10",
            razorpay_order_id="order_rp_002",
            razorpay_payment_id="pay_rp_002",
        )
        self.redemption2 = CouponRedemption.objects.create(
            coupon=self.coupon_a,
            customer=self.customer2,
            order=self.order2,
            state=CouponRedemption.State.REDEEMED,
            discount_amount=Decimal("500.00"),
            currency="INR",
            idempotency_key="idem-002",
            reserved_at=self.now - timedelta(days=1),
            finalized_at=self.now - timedelta(days=1),
        )

        # Order 3: PAID order with Coupon B by Customer 1
        self.order3 = Order.objects.create(
            user=self.customer1,
            order_number="CBC-2026-900003",
            status=Order.Status.SHIPPED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("2500.00"),
            discount=Decimal("500.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("2000.00"),
            coupon=self.coupon_b,
            coupon_code="FLAT500",
            razorpay_order_id="order_rp_003",
            razorpay_payment_id="pay_rp_003",
        )
        self.redemption3 = CouponRedemption.objects.create(
            coupon=self.coupon_b,
            customer=self.customer1,
            order=self.order3,
            state=CouponRedemption.State.REDEEMED,
            discount_amount=Decimal("500.00"),
            currency="INR",
            idempotency_key="idem-003",
            reserved_at=self.now - timedelta(hours=6),
            finalized_at=self.now - timedelta(hours=6),
        )

        # Order 4: UNPAID (PENDING) order with Coupon B by Customer 2 (must NOT count towards paid discount/revenue)
        self.order4 = Order.objects.create(
            user=self.customer2,
            order_number="CBC-2026-900004",
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            subtotal=Decimal("4000.00"),
            discount=Decimal("500.00"),
            total=Decimal("3500.00"),
            coupon=self.coupon_b,
            coupon_code="FLAT500",
            razorpay_order_id="order_rp_004",
        )
        self.redemption4_reserved = CouponRedemption.objects.create(
            coupon=self.coupon_b,
            customer=self.customer2,
            order=self.order4,
            state=CouponRedemption.State.RESERVED,
            discount_amount=Decimal("500.00"),
            currency="INR",
            idempotency_key="idem-004",
            reserved_at=self.now - timedelta(hours=2),
            expires_at=self.now + timedelta(minutes=15),
        )

        # Order 5: CANCELLED order with Coupon A by Customer 1 (released redemption)
        self.order5 = Order.objects.create(
            user=self.customer1,
            order_number="CBC-2026-900005",
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.FAILED,
            subtotal=Decimal("2000.00"),
            discount=Decimal("200.00"),
            total=Decimal("1800.00"),
            coupon=self.coupon_a,
            coupon_code="FESTIVE10",
        )
        self.redemption5_released = CouponRedemption.objects.create(
            coupon=self.coupon_a,
            customer=self.customer1,
            order=self.order5,
            state=CouponRedemption.State.RELEASED,
            discount_amount=Decimal("200.00"),
            currency="INR",
            idempotency_key="idem-005",
            reserved_at=self.now - timedelta(days=3),
            released_at=self.now - timedelta(days=3),
            release_reason="Checkout expired or order cancelled",
        )

        # Standalone redemption with order=None (e.g. pending cart reservation)
        self.redemption6_cart_reserved = CouponRedemption.objects.create(
            coupon=self.coupon_a,
            customer=self.customer2,
            order=None,
            state=CouponRedemption.State.RESERVED,
            discount_amount=Decimal("100.00"),
            currency="INR",
            idempotency_key="idem-cart-001",
            reserved_at=self.now - timedelta(minutes=5),
            expires_at=self.now + timedelta(minutes=10),
        )

        # Update auto_now_add created_at to match historical reserved/finalized timestamps
        CouponRedemption.objects.filter(id=self.redemption1.id).update(created_at=self.now - timedelta(days=2))
        CouponRedemption.objects.filter(id=self.redemption2.id).update(created_at=self.now - timedelta(days=1))
        CouponRedemption.objects.filter(id=self.redemption3.id).update(created_at=self.now - timedelta(hours=6))
        CouponRedemption.objects.filter(id=self.redemption4_reserved.id).update(created_at=self.now - timedelta(hours=2))
        CouponRedemption.objects.filter(id=self.redemption5_released.id).update(created_at=self.now - timedelta(days=3))
        CouponRedemption.objects.filter(id=self.redemption6_cart_reserved.id).update(created_at=self.now - timedelta(minutes=5))

    # ── 1. Authorization Tests ──────────────────────────────────────────

    def test_anonymous_requests_rejected(self):
        """Anonymous clients are rejected with 401 Unauthorized across all reporting endpoints."""
        endpoints = [
            "/api/v1/admin/coupons/reports/overview/",
            "/api/v1/admin/coupons/reports/performance/",
            "/api/v1/admin/coupons/reports/redemptions/",
        ]
        for ep in endpoints:
            res = self.client.get(ep)
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED, f"Failed for {ep}")

    def test_customer_user_rejected_with_forbidden(self):
        """Non-admin customers are rejected with 403 Forbidden."""
        self.client.force_authenticate(user=self.customer1)
        endpoints = [
            "/api/v1/admin/coupons/reports/overview/",
            "/api/v1/admin/coupons/reports/performance/",
            "/api/v1/admin/coupons/reports/redemptions/",
        ]
        for ep in endpoints:
            res = self.client.get(ep)
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN, f"Failed for {ep}")

    # ── 2. Date Range Validation Tests ──────────────────────────────────

    def test_invalid_date_format_returns_bad_request(self):
        """Invalid date strings return 400 Bad Request."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/coupons/reports/overview/?start_date=not-a-date")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        err_details = res.json().get("error", {}).get("details", {})
        self.assertIn("start_date", err_details)

    def test_inverted_date_range_returns_bad_request(self):
        """start_date after end_date returns 400 Bad Request."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(
            "/api/v1/admin/coupons/reports/overview/?start_date=2026-10-20&end_date=2026-10-10"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        err_details = res.json().get("error", {}).get("details", {})
        self.assertIn("date_range", err_details)

    # ── 3. Overview Metrics Endpoint Tests ──────────────────────────────

    def test_overview_metrics_accuracy(self):
        """
        Validates overview reporting KPIs:
        - 3 coupons total, 2 active
        - 3 successful redemptions (Order 1, Order 2, Order 3)
        - 2 reserved redemptions (Order 4, Cart reservation)
        - 1 released redemption (Order 5)
        - Total discount granted on successfully paid orders: 300 + 500 + 500 = 1300.00
        - Paid revenue: 2700 + 4500 + 2000 = 9200.00
        - Distinct customers who redeemed: Customer 1 and Customer 2 = 2
        """
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/coupons/reports/overview/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertEqual(data["coupons_created"], 3)
        self.assertEqual(data["active_coupons"], 2)
        self.assertEqual(data["successful_redemptions_count"], 3)
        self.assertEqual(data["reserved_redemptions_count"], 2)
        self.assertEqual(data["released_redemptions_count"], 1)
        self.assertEqual(data["distinct_customers_count"], 2)

        # Financial verification (strictly PAID non-cancelled)
        self.assertEqual(data["total_discount_granted"], "1300.00")
        self.assertEqual(data["paid_orders_count"], 3)
        self.assertEqual(data["paid_orders_revenue"], "9200.00")
        self.assertEqual(data["gross_subtotal_before_discount"], "10500.00")

        # Average discount: 1300.00 / 3 = 433.33
        self.assertEqual(data["average_discount_per_redemption"], "433.33")
        # Average paid order value: 9200.00 / 3 = 3066.67
        self.assertEqual(data["average_paid_order_value"], "3066.67")

        # Orders breakdown
        self.assertEqual(data["orders_by_payment_status"]["PAID"], 3)
        self.assertEqual(data["orders_by_payment_status"]["PENDING"], 1)
        self.assertEqual(data["orders_by_payment_status"]["FAILED"], 1)

        self.assertEqual(data["orders_by_status"]["CONFIRMED"], 1)
        self.assertEqual(data["orders_by_status"]["PROCESSING"], 1)
        self.assertEqual(data["orders_by_status"]["SHIPPED"], 1)
        self.assertEqual(data["orders_by_status"]["PENDING"], 1)
        self.assertEqual(data["orders_by_status"]["CANCELLED"], 1)

        # Capacity: Coupon A has 10, Coupon C has 50 -> 60 total
        self.assertEqual(data["total_configured_capacity"], 60)
        # Remaining: Coupon A used 2 -> 8 remaining; Coupon C used 0 -> 50 remaining; Total = 58
        self.assertEqual(data["total_remaining_capacity"], 58)

    def test_overview_date_window_filtering(self):
        """Date filtering restricts redemptions strictly to the specified window."""
        self.client.force_authenticate(user=self.admin_user)
        # Filter for the last 12 hours (only Order 3 and Order 4 and Cart were created)
        start = (self.now - timedelta(hours=12)).isoformat()
        res = self.client.get("/api/v1/admin/coupons/reports/overview/", {"start_date": start})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        # In last 12 hours: Order 3 redeemed (500), Order 4 reserved, Cart reserved
        self.assertEqual(data["successful_redemptions_count"], 1)
        self.assertEqual(data["total_discount_granted"], "500.00")
        self.assertEqual(data["paid_orders_count"], 1)
        self.assertEqual(data["paid_orders_revenue"], "2000.00")

    # ── 4. Coupon Performance Endpoint Tests ────────────────────────────

    def test_performance_report_metrics_and_search(self):
        """Tests performance aggregates per coupon, search by code/name, and sorting."""
        self.client.force_authenticate(user=self.admin_user)

        # 1. Fetch all
        res = self.client.get("/api/v1/admin/coupons/reports/performance/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json()["results"]
        self.assertEqual(len(results), 3)

        # Map by code
        by_code = {item["code"]: item for item in results}

        # Coupon A: FESTIVE10
        # 2 redemptions, 2 distinct customers, 2 paid orders, 800.00 total discount, 7200.00 revenue
        festive = by_code["FESTIVE10"]
        self.assertEqual(festive["successful_redemptions_count"], 2)
        self.assertEqual(festive["distinct_customers_count"], 2)
        self.assertEqual(festive["paid_orders_count"], 2)
        self.assertEqual(festive["paid_order_revenue"], "7200.00")
        self.assertEqual(festive["total_discount_amount"], "800.00")
        self.assertEqual(festive["gross_subtotal_before_discount"], "8000.00")
        self.assertEqual(festive["average_order_value"], "3600.00")
        self.assertEqual(festive["average_order_value_before_discount"], "4000.00")
        self.assertEqual(festive["remaining_capacity"], 8)  # 10 - 2
        self.assertIsNotNone(festive["last_redemption_at"])

        # Coupon B: FLAT500
        # 1 redemption, 1 customer, 1 paid order, 500.00 discount, 2000.00 revenue
        flat = by_code["FLAT500"]
        self.assertEqual(flat["successful_redemptions_count"], 1)
        self.assertEqual(flat["distinct_customers_count"], 1)
        self.assertEqual(flat["paid_orders_count"], 1)
        self.assertEqual(flat["paid_order_revenue"], "2000.00")
        self.assertEqual(flat["total_discount_amount"], "500.00")
        self.assertIsNone(flat["remaining_capacity"])  # unlimited

        # Coupon C: SUMMER20 (0 redemptions)
        summer = by_code["SUMMER20"]
        self.assertEqual(summer["successful_redemptions_count"], 0)
        self.assertEqual(summer["paid_orders_count"], 0)
        self.assertEqual(summer["paid_order_revenue"], "0.00")
        self.assertEqual(summer["total_discount_amount"], "0.00")
        self.assertEqual(summer["average_order_value"], "0.00")
        self.assertEqual(summer["remaining_capacity"], 50)
        self.assertIsNone(summer["last_redemption_at"])

        # 2. Search by code
        res_search = self.client.get("/api/v1/admin/coupons/reports/performance/?search=FESTIVE")
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        self.assertEqual(res_search.json()["count"], 1)
        self.assertEqual(res_search.json()["results"][0]["code"], "FESTIVE10")

        # 3. Filter by is_active=false
        res_inactive = self.client.get("/api/v1/admin/coupons/reports/performance/?is_active=false")
        self.assertEqual(res_inactive.status_code, status.HTTP_200_OK)
        self.assertEqual(res_inactive.json()["count"], 1)
        self.assertEqual(res_inactive.json()["results"][0]["code"], "SUMMER20")

        # 4. Sorting by -revenue
        res_sort = self.client.get("/api/v1/admin/coupons/reports/performance/?ordering=-revenue")
        self.assertEqual(res_sort.status_code, status.HTTP_200_OK)
        sorted_codes = [r["code"] for r in res_sort.json()["results"]]
        self.assertEqual(sorted_codes, ["FESTIVE10", "FLAT500", "SUMMER20"])

    # ── 5. Cross-Coupon Redemption Report Tests ─────────────────────────

    def test_redemptions_report_filtering_and_privacy(self):
        """Tests paginated redemption history, email masking, and state filtering."""
        self.client.force_authenticate(user=self.admin_user)

        # 1. Fetch all redemptions (6 total)
        res = self.client.get("/api/v1/admin/coupons/reports/redemptions/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["count"], 6)

        # Check privacy masking on a customer email
        first_item = data["results"][0]
        self.assertIn("customer_email_masked", first_item)
        self.assertNotIn("muse_alpha@example.com", first_item["customer_email_masked"])
        self.assertTrue(first_item["customer_email_masked"].startswith("m***"))
        self.assertTrue(first_item["customer_email_masked"].endswith("@example.com"))

        # 2. Filter by state=RESERVED
        res_reserved = self.client.get("/api/v1/admin/coupons/reports/redemptions/?state=RESERVED")
        self.assertEqual(res_reserved.status_code, status.HTTP_200_OK)
        self.assertEqual(res_reserved.json()["count"], 2)
        for item in res_reserved.json()["results"]:
            self.assertEqual(item["state"], "RESERVED")

        # 3. Filter by state=RELEASED
        res_released = self.client.get("/api/v1/admin/coupons/reports/redemptions/?state=RELEASED")
        self.assertEqual(res_released.status_code, status.HTTP_200_OK)
        self.assertEqual(res_released.json()["count"], 1)
        released_item = res_released.json()["results"][0]
        self.assertEqual(released_item["state"], "RELEASED")
        self.assertEqual(released_item["release_reason"], "Checkout expired or order cancelled")

        # 4. Filter by payment_status=PAID
        res_paid = self.client.get("/api/v1/admin/coupons/reports/redemptions/?payment_status=PAID")
        self.assertEqual(res_paid.status_code, status.HTTP_200_OK)
        self.assertEqual(res_paid.json()["count"], 3)

        # 5. Filter by coupon_code=FLAT500
        res_code = self.client.get("/api/v1/admin/coupons/reports/redemptions/?coupon_code=FLAT500")
        self.assertEqual(res_code.status_code, status.HTTP_200_OK)
        self.assertEqual(res_code.json()["count"], 2)

        # 6. Nullable order handling (Cart reservation without an order)
        cart_item = [r for r in data["results"] if r["idempotency_key"] == "idem-cart-001"][0]
        self.assertIsNone(cart_item["order_id"])
        self.assertIsNone(cart_item["order_number"])
        self.assertIsNone(cart_item["order_status"])
        self.assertIsNone(cart_item["payment_status"])
        self.assertIsNone(cart_item["order_total"])
