"""
Closet by Chilli — Admin Coupon Management Tests (Sprint A5.1).

Covers:
- Admin-only authorization for coupon listing, creation, detail, update, activation, and deactivation.
- Unauthenticated and customer access denied (401/403).
- Coupon creation, validation, code normalization, and uniqueness.
- Discount type and value validation (percentage 0 < val <= 100, fixed val > 0).
- Monetary fields non-negative validation (min_order_subtotal, max_discount_amount).
- Date range validation (end_date > start_date).
- Usage limits validation (positive integers).
- Database constraint verification.
- Search, lifecycle filtering, type filtering, sorting, and pagination.
- Explicit auditable activation and deactivation.
- Audit log generation on create, update, activate, and deactivate.
"""

from decimal import Decimal
import uuid
import datetime

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.orders.models import Coupon, CouponAuditLog


class AdminCouponsApiTests(TestCase):
    """Test suite for Admin Coupon Management (Sprint A5.1)."""

    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        CustomerProfile.objects.create(
            user=self.admin_user,
            display_name="Admin Chilli",
        )

        # Customer user
        self.customer_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="shopper@closetbychilli.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(
            user=self.customer_user,
            display_name="Priya Sharma",
        )

        self.now = timezone.now()

    def _get_error_details(self, resp):
        data = resp.json()
        if isinstance(data, dict) and "error" in data and isinstance(data["error"], dict) and "details" in data["error"]:
            return data["error"]["details"]
        return data

    def test_admin_only_access_enforced(self):
        """Endpoints reject unauthenticated requests (401) and customer requests (403)."""
        coupon = Coupon.objects.create(
            code="SUMMER20",
            name="Summer Sale 20%",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("20.00"),
            start_date=self.now - datetime.timedelta(days=1),
            end_date=self.now + datetime.timedelta(days=10),
            is_active=True,
        )

        endpoints = [
            ("GET", "/api/v1/admin/coupons/"),
            ("POST", "/api/v1/admin/coupons/"),
            ("GET", f"/api/v1/admin/coupons/{coupon.id}/"),
            ("PATCH", f"/api/v1/admin/coupons/{coupon.id}/"),
            ("POST", f"/api/v1/admin/coupons/{coupon.id}/activate/"),
            ("POST", f"/api/v1/admin/coupons/{coupon.id}/deactivate/"),
        ]

        # 1. Unauthenticated -> 401
        for method, url in endpoints:
            if method == "GET":
                resp = self.client.get(url)
            elif method == "POST":
                resp = self.client.post(url, {})
            elif method == "PATCH":
                resp = self.client.patch(url, {})
            self.assertEqual(
                resp.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f"{method} {url} allowed unauthenticated access",
            )

        # 2. Customer -> 403
        self.client.force_authenticate(user=self.customer_user)
        for method, url in endpoints:
            if method == "GET":
                resp = self.client.get(url)
            elif method == "POST":
                resp = self.client.post(url, {})
            elif method == "PATCH":
                resp = self.client.patch(url, {})
            self.assertEqual(
                resp.status_code,
                status.HTTP_403_FORBIDDEN,
                f"{method} {url} allowed customer access",
            )

    def test_create_coupon_success_percentage(self):
        """Admin can create a percentage discount coupon with audit log."""
        self.client.force_authenticate(user=self.admin_user)

        payload = {
            "code": "  festive25  ",
            "name": "Festive Season 25% Off",
            "description": "Get 25% off up to ₹1,500 on orders above ₹2,000",
            "discount_type": "PERCENTAGE",
            "discount_value": "25.00",
            "currency": "INR",
            "min_order_subtotal": "2000.00",
            "max_discount_amount": "1500.00",
            "start_date": self.now.isoformat(),
            "end_date": (self.now + datetime.timedelta(days=15)).isoformat(),
            "is_active": True,
            "usage_limit": 500,
            "per_customer_limit": 1,
            "is_first_order_only": False,
        }

        resp = self.client.post("/api/v1/admin/coupons/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()

        # Code normalized to uppercase stripped
        self.assertEqual(data["code"], "FESTIVE25")
        self.assertEqual(data["name"], "Festive Season 25% Off")
        self.assertEqual(data["discount_type"], "PERCENTAGE")
        self.assertEqual(data["discount_value"], "25.00")
        self.assertEqual(data["min_order_subtotal"], "2000.00")
        self.assertEqual(data["max_discount_amount"], "1500.00")
        self.assertEqual(data["usage_limit"], 500)
        self.assertEqual(data["per_customer_limit"], 1)
        self.assertIsNone(data["usage_count"])  # explicitly null per spec
        self.assertEqual(data["lifecycle_status"], "CURRENTLY_VALID")

        # Verify audit log created
        coupon = Coupon.objects.get(code="FESTIVE25")
        self.assertEqual(coupon.created_by, self.admin_user)
        self.assertTrue(
            CouponAuditLog.objects.filter(
                coupon=coupon,
                event_type=CouponAuditLog.EventType.CREATED,
            ).exists()
        )

    def test_create_coupon_success_fixed_amount(self):
        """Admin can create a fixed amount discount coupon."""
        self.client.force_authenticate(user=self.admin_user)

        payload = {
            "code": "FLAT500",
            "name": "Flat ₹500 Off",
            "discount_type": "FIXED_AMOUNT",
            "discount_value": "500.00",
            "currency": "INR",
            "min_order_subtotal": "2500.00",
            "start_date": self.now.isoformat(),
            "is_active": True,
        }

        resp = self.client.post("/api/v1/admin/coupons/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()
        self.assertEqual(data["code"], "FLAT500")
        self.assertEqual(data["discount_type"], "FIXED_AMOUNT")
        self.assertEqual(data["discount_value"], "500.00")
        self.assertIsNone(data["end_date"])

    def test_reject_duplicate_code_normalized(self):
        """Reject coupon creation if normalized code already exists."""
        Coupon.objects.create(
            code="WELCOME10",
            name="Welcome Discount",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("10.00"),
            start_date=self.now,
        )

        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "code": " welcome10 ",
            "name": "Duplicate Welcome",
            "discount_type": "PERCENTAGE",
            "discount_value": "10.00",
            "start_date": self.now.isoformat(),
        }

        resp = self.client.post("/api/v1/admin/coupons/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("code", self._get_error_details(resp))

    def test_reject_invalid_percentage_discount(self):
        """Percentage discount must be > 0 and <= 100."""
        self.client.force_authenticate(user=self.admin_user)

        # > 100%
        resp = self.client.post(
            "/api/v1/admin/coupons/",
            {
                "code": "INVALID150",
                "name": "Too High",
                "discount_type": "PERCENTAGE",
                "discount_value": "150.00",
                "start_date": self.now.isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("discount_value", self._get_error_details(resp))

        # 0%
        resp = self.client.post(
            "/api/v1/admin/coupons/",
            {
                "code": "ZERO",
                "name": "Zero Discount",
                "discount_type": "PERCENTAGE",
                "discount_value": "0.00",
                "start_date": self.now.isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("discount_value", self._get_error_details(resp))

    def test_reject_negative_monetary_values(self):
        """Monetary fields must reject negative values."""
        self.client.force_authenticate(user=self.admin_user)

        resp = self.client.post(
            "/api/v1/admin/coupons/",
            {
                "code": "NEGTEST",
                "name": "Negative Test",
                "discount_type": "FIXED_AMOUNT",
                "discount_value": "-50.00",
                "start_date": self.now.isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("discount_value", self._get_error_details(resp))

        resp2 = self.client.post(
            "/api/v1/admin/coupons/",
            {
                "code": "NEGMIN",
                "name": "Negative Min",
                "discount_type": "PERCENTAGE",
                "discount_value": "10.00",
                "min_order_subtotal": "-100.00",
                "start_date": self.now.isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("min_order_subtotal", self._get_error_details(resp2))

    def test_reject_invalid_date_range(self):
        """End date must be later than start date."""
        self.client.force_authenticate(user=self.admin_user)

        resp = self.client.post(
            "/api/v1/admin/coupons/",
            {
                "code": "TIMETRAVEL",
                "name": "Back to the Future",
                "discount_type": "PERCENTAGE",
                "discount_value": "15.00",
                "start_date": self.now.isoformat(),
                "end_date": (self.now - datetime.timedelta(hours=1)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end_date", self._get_error_details(resp))

    def test_reject_invalid_usage_limits(self):
        """Usage limits must be positive integers."""
        self.client.force_authenticate(user=self.admin_user)

        resp = self.client.post(
            "/api/v1/admin/coupons/",
            {
                "code": "ZEROLIMIT",
                "name": "Zero Limit",
                "discount_type": "PERCENTAGE",
                "discount_value": "10.00",
                "start_date": self.now.isoformat(),
                "usage_limit": 0,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("usage_limit", self._get_error_details(resp))

    def test_database_constraints(self):
        """CheckConstraints trigger at the database level."""
        # 1. Percentage > 100 constraint
        with self.assertRaises((IntegrityError, DjangoValidationError)):
            c = Coupon(
                code="DBTEST1",
                name="DB Test",
                discount_type=Coupon.DiscountType.PERCENTAGE,
                discount_value=Decimal("120.00"),
                start_date=self.now,
            )
            c.save()

        # 2. End date <= start date constraint
        with self.assertRaises((IntegrityError, DjangoValidationError)):
            c2 = Coupon(
                code="DBTEST2",
                name="DB Test 2",
                discount_type=Coupon.DiscountType.PERCENTAGE,
                discount_value=Decimal("10.00"),
                start_date=self.now,
                end_date=self.now - datetime.timedelta(days=1),
            )
            c2.save()

    def test_retrieve_coupon_detail_with_audit_logs(self):
        """Admin can retrieve full coupon detail including its audit history."""
        self.client.force_authenticate(user=self.admin_user)

        coupon = Coupon.objects.create(
            code="AUDITME",
            name="Audited Coupon",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("15.00"),
            start_date=self.now,
            created_by=self.admin_user,
        )
        CouponAuditLog.objects.create(
            coupon=coupon,
            event_type=CouponAuditLog.EventType.CREATED,
            actor=self.admin_user,
            actor_email=self.admin_user.email,
            notes="Initial creation",
        )

        resp = self.client.get(f"/api/v1/admin/coupons/{coupon.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["code"], "AUDITME")
        self.assertEqual(data["created_by_email"], self.admin_user.email)
        self.assertEqual(len(data["audit_logs"]), 1)
        self.assertEqual(data["audit_logs"][0]["event_type"], "CREATED")

    def test_partial_update_coupon(self):
        """Admin can partially update coupon fields with audit tracking."""
        self.client.force_authenticate(user=self.admin_user)

        coupon = Coupon.objects.create(
            code="UPDATEOLD",
            name="Old Name",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("10.00"),
            start_date=self.now,
        )

        resp = self.client.patch(
            f"/api/v1/admin/coupons/{coupon.id}/",
            {
                "code": "  updatenew  ",
                "name": "New Name",
                "discount_value": "18.00",
                "usage_limit": 100,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["code"], "UPDATENEW")
        self.assertEqual(data["name"], "New Name")
        self.assertEqual(data["discount_value"], "18.00")
        self.assertEqual(data["usage_limit"], 100)

        # Verify audit log
        coupon.refresh_from_db()
        self.assertEqual(coupon.code, "UPDATENEW")
        self.assertTrue(
            CouponAuditLog.objects.filter(
                coupon=coupon,
                event_type=CouponAuditLog.EventType.UPDATED,
            ).exists()
        )

    def test_activate_and_deactivate_coupon(self):
        """Explicit activate and deactivate endpoints toggle active flag and audit."""
        self.client.force_authenticate(user=self.admin_user)

        coupon = Coupon.objects.create(
            code="TOGGLEME",
            name="Toggle Me",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("10.00"),
            start_date=self.now,
            is_active=True,
        )

        # Deactivate
        resp = self.client.post(f"/api/v1/admin/coupons/{coupon.id}/deactivate/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.json()["is_active"])
        self.assertEqual(resp.json()["lifecycle_status"], "INACTIVE")

        coupon.refresh_from_db()
        self.assertFalse(coupon.is_active)
        self.assertTrue(
            CouponAuditLog.objects.filter(
                coupon=coupon,
                event_type=CouponAuditLog.EventType.DEACTIVATED,
            ).exists()
        )

        # Activate
        resp2 = self.client.post(f"/api/v1/admin/coupons/{coupon.id}/activate/")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.json()["is_active"])

        coupon.refresh_from_db()
        self.assertTrue(coupon.is_active)
        self.assertTrue(
            CouponAuditLog.objects.filter(
                coupon=coupon,
                event_type=CouponAuditLog.EventType.ACTIVATED,
            ).exists()
        )

    def test_listing_search_and_filters(self):
        """Listing supports search, active filter, type filter, lifecycle filter, and sorting."""
        self.client.force_authenticate(user=self.admin_user)

        past = self.now - datetime.timedelta(days=10)
        future = self.now + datetime.timedelta(days=10)

        # 1. Currently valid percentage coupon
        c1 = Coupon.objects.create(
            code="VALIDPERCENT",
            name="Valid Percentage Campaign",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("20.00"),
            start_date=past,
            end_date=future,
            is_active=True,
        )
        # 2. Scheduled fixed coupon
        c2 = Coupon.objects.create(
            code="SCHEDULEDFIXED",
            name="Black Friday Scheduled",
            discount_type=Coupon.DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("1000.00"),
            start_date=future,
            end_date=future + datetime.timedelta(days=5),
            is_active=True,
        )
        # 3. Expired coupon
        c3 = Coupon.objects.create(
            code="EXPIREDPROMO",
            name="Old Promo",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("15.00"),
            start_date=past - datetime.timedelta(days=20),
            end_date=past,
            is_active=True,
        )
        # 4. Inactive coupon
        c4 = Coupon.objects.create(
            code="INACTIVEDRAFT",
            name="Draft Coupon",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("30.00"),
            start_date=past,
            is_active=False,
        )

        # Search by code
        res_search = self.client.get("/api/v1/admin/coupons/?search=VALID")
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        self.assertEqual(res_search.json()["count"], 1)
        self.assertEqual(res_search.json()["results"][0]["code"], "VALIDPERCENT")

        # Filter by discount_type
        res_type = self.client.get("/api/v1/admin/coupons/?discount_type=FIXED_AMOUNT")
        self.assertEqual(res_type.json()["count"], 1)
        self.assertEqual(res_type.json()["results"][0]["code"], "SCHEDULEDFIXED")

        # Filter by lifecycle = scheduled
        res_sched = self.client.get("/api/v1/admin/coupons/?lifecycle=scheduled")
        self.assertEqual(res_sched.json()["count"], 1)
        self.assertEqual(res_sched.json()["results"][0]["code"], "SCHEDULEDFIXED")

        # Filter by lifecycle = currently_valid
        res_valid = self.client.get("/api/v1/admin/coupons/?lifecycle=currently_valid")
        self.assertEqual(res_valid.json()["count"], 1)
        self.assertEqual(res_valid.json()["results"][0]["code"], "VALIDPERCENT")

        # Filter by lifecycle = expired
        res_exp = self.client.get("/api/v1/admin/coupons/?lifecycle=expired")
        self.assertEqual(res_exp.json()["count"], 1)
        self.assertEqual(res_exp.json()["results"][0]["code"], "EXPIREDPROMO")

        # Filter by lifecycle = inactive
        res_inact = self.client.get("/api/v1/admin/coupons/?lifecycle=inactive")
        self.assertEqual(res_inact.json()["count"], 1)
        self.assertEqual(res_inact.json()["results"][0]["code"], "INACTIVEDRAFT")

        # Sorting by discount_value desc
        res_sort = self.client.get("/api/v1/admin/coupons/?ordering=-discount_value")
        codes = [item["code"] for item in res_sort.json()["results"]]
        self.assertEqual(codes[0], "SCHEDULEDFIXED")  # 1000.00
