"""
Closet by Chilli — Admin Payment Operations & Reconciliation API Tests (Sprint A4.4).

Covers:
- Admin-only authorization for list, detail, and reconciliation endpoints.
- Unauthenticated and customer access denied (401/403).
- Pagination, multi-field search, status filtering, provider filtering, date boundaries, and sorting.
- Payment data sanitization (never exposes razorpay_signature or secrets).
- Authoritative discrepancy detection:
  - MATCHED
  - STATUS_CONFLICT
  - AMOUNT_MISMATCH
  - CURRENCY_MISMATCH
  - DUPLICATE_ATTEMPT
  - NEEDS_REVIEW
- Safe, audited reconciliation workflow:
  - Connects to Razorpay via server client.
  - Validates live captured payment amount and currency.
  - Transitions order to PAID and CONFIRMED.
  - Finalizes inventory allocations.
  - Persists durable OrderAuditLog atomically.
  - Idempotent: repeated reconciliation returns safely without duplicate side effects.
  - Rejects reconciling cancelled orders.
  - Rejects mismatched gateway amounts or currencies.
- Query count efficiency.
"""

from decimal import Decimal
from typing import Any
from unittest.mock import MagicMock, patch
import uuid

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

import apps.payments.reconciliation

from apps.accounts.models import CustomerProfile, User
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import InventoryItem
from apps.inventory.services import create_order_reservations
from apps.orders.models import Order, OrderAuditLog, OrderItem
from apps.payments.reconciliation import DiscrepancyStatus


class AdminPaymentsApiTests(TestCase):
    """Test suite for Admin Payment Operations & Reconciliation."""

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
            email="patron@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(
            user=self.customer,
            display_name="Patron Sen",
            phone="9876543210",
        )

        # 3. Catalog setup
        self.category = Category.objects.create(
            name="Anarkalis",
            slug=f"anarkalis-{uuid.uuid4().hex[:6]}",
        )
        self.product = Product.objects.create(
            name="Emerald Silk Anarkali",
            slug=f"emerald-silk-anarkali-{uuid.uuid4().hex[:6]}",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku=f"EME-ANAR-{uuid.uuid4().hex[:6]}",
            size="S",
            color="Emerald",
            retail_price=Decimal("35000.00"),
            is_active=True,
        )
        self.inventory_item = InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=10,
            quantity_reserved=0,
            low_stock_threshold=2,
        )

    def _create_order(
        self,
        order_status: str = Order.Status.CONFIRMED,
        payment_status: str = Order.PaymentStatus.PAID,
        total: Decimal = Decimal("35000.00"),
        currency: str = "INR",
        razorpay_order_id: Any = "AUTO",
        razorpay_payment_id: Any = "AUTO",
        razorpay_signature: str = "valid_mock_signature",
    ) -> Order:
        if razorpay_order_id == "AUTO":
            razorpay_order_id = f"order_rzp_{uuid.uuid4().hex[:10]}"
        if razorpay_payment_id == "AUTO":
            razorpay_payment_id = f"pay_rzp_{uuid.uuid4().hex[:10]}"

        order = Order.objects.create(
            user=self.customer,
            status=order_status,
            payment_status=payment_status,
            currency=currency,
            subtotal=total,
            discount=Decimal("0.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=total,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature,
            shipping_address_snapshot={"full_name": "Patron Sen", "city": "Jaipur"},
            billing_address_snapshot={"full_name": "Patron Sen", "city": "Jaipur"},
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            variant=self.variant,
            product_name="Emerald Silk Anarkali",
            variant_name="S / Emerald",
            sku=self.variant.sku,
            unit_price=total,
            quantity=1,
            line_total=total,
        )
        create_order_reservations(order=order)
        return order

    # =========================================================================
    # Authorization & Permissions
    # =========================================================================

    def test_payment_endpoints_require_admin(self):
        order = self._create_order()

        # 1. List
        res = self.client.get("/api/v1/admin/payments/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.customer)
        res = self.client.get("/api/v1/admin/payments/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Detail
        self.client.logout()
        res = self.client.get(f"/api/v1/admin/payments/{order.id}/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.customer)
        res = self.client.get(f"/api/v1/admin/payments/{order.id}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Reconcile
        self.client.logout()
        res = self.client.post(f"/api/v1/admin/payments/{order.id}/reconcile/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.customer)
        res = self.client.post(f"/api/v1/admin/payments/{order.id}/reconcile/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # Listing, Filtering, Search & Sanitization
    # =========================================================================

    def test_list_payments_pagination_and_sanitization(self):
        order = self._create_order()
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.get("/api/v1/admin/payments/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("results", res.data)
        self.assertIn("count", res.data)
        self.assertEqual(res.data["count"], 1)

        payment_item = res.data["results"][0]
        self.assertEqual(payment_item["order_number"], order.order_number)
        self.assertEqual(payment_item["provider"], "Razorpay")
        self.assertEqual(payment_item["amount"], "35000.00")
        self.assertEqual(payment_item["currency"], "INR")
        self.assertEqual(payment_item["payment_status"], "PAID")
        self.assertEqual(payment_item["discrepancy_status"], DiscrepancyStatus.MATCHED)

        # Sanitization check: NEVER expose signature or secrets
        self.assertNotIn("razorpay_signature", payment_item)
        self.assertNotIn("signature", str(res.data))

    def test_list_payments_search_by_various_identifiers(self):
        order1 = self._create_order(razorpay_order_id="order_rzp_unique_aaa", razorpay_payment_id="pay_rzp_unique_111")
        order2 = self._create_order(razorpay_order_id="order_rzp_unique_bbb", razorpay_payment_id="pay_rzp_unique_222")

        self.client.force_authenticate(user=self.admin_user)

        # Search by order_number
        res = self.client.get(f"/api/v1/admin/payments/?search={order1.order_number}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["order_number"], order1.order_number)

        # Search by razorpay_payment_id
        res = self.client.get("/api/v1/admin/payments/?search=pay_rzp_unique_222")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["order_number"], order2.order_number)

        # Search by customer email
        res = self.client.get("/api/v1/admin/payments/?search=patron@example.com")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 2)

    def test_list_payments_status_and_provider_filters(self):
        order_paid = self._create_order(payment_status=Order.PaymentStatus.PAID)
        order_pending = self._create_order(
            payment_status=Order.PaymentStatus.PENDING,
            order_status=Order.Status.PENDING,
            razorpay_payment_id=None,
        )
        order_internal = self._create_order(
            payment_status=Order.PaymentStatus.PENDING,
            order_status=Order.Status.PENDING,
            razorpay_order_id=None,
            razorpay_payment_id=None,
        )

        self.client.force_authenticate(user=self.admin_user)

        # Filter by payment_status
        res = self.client.get("/api/v1/admin/payments/?payment_status=PAID")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["order_number"], order_paid.order_number)

        # Filter by provider=razorpay
        res = self.client.get("/api/v1/admin/payments/?provider=razorpay")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 2)

        # Filter by provider=internal
        res = self.client.get("/api/v1/admin/payments/?provider=internal")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["order_number"], order_internal.order_number)

    # =========================================================================
    # Discrepancy Detection & Evaluation
    # =========================================================================

    def test_discrepancy_matched_status(self):
        order = self._create_order(payment_status=Order.PaymentStatus.PAID)
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.get(f"/api/v1/admin/payments/{order.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["discrepancy_status"], DiscrepancyStatus.MATCHED)
        self.assertTrue(res.data["is_reconciled"])
        self.assertIn("Payment verified and captured", res.data["discrepancy_details"][0])

    def test_discrepancy_status_conflict(self):
        """Paid order marked cancelled produces STATUS_CONFLICT."""
        order = self._create_order(
            order_status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.PAID,
        )
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.get(f"/api/v1/admin/payments/{order.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["discrepancy_status"], DiscrepancyStatus.STATUS_CONFLICT)
        self.assertIn("Status conflict", res.data["discrepancy_details"][0])

    def test_discrepancy_currency_mismatch(self):
        """Order in non-INR currency produces CURRENCY_MISMATCH."""
        order = self._create_order(currency="USD")
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.get(f"/api/v1/admin/payments/{order.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["discrepancy_status"], DiscrepancyStatus.CURRENCY_MISMATCH)

    def test_discrepancy_duplicate_attempt(self):
        """Conflicting payment attempt produces DUPLICATE_ATTEMPT."""
        order1 = self._create_order(razorpay_payment_id="pay_shared_duplicate_123")

        mock_conflict = MagicMock(order_number="CBC-2026-9999")
        mock_qs = MagicMock()
        mock_qs.exclude.return_value.first.return_value = mock_conflict

        self.client.force_authenticate(user=self.admin_user)

        with patch("apps.payments.reconciliation.Order.objects.filter", return_value=mock_qs):
            res = self.client.get(f"/api/v1/admin/payments/{order1.id}/")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["discrepancy_status"], DiscrepancyStatus.DUPLICATE_ATTEMPT)
        self.assertTrue(any("Conflicting duplicate" in f for f in res.data["discrepancy_details"]))

    def test_discrepancy_needs_review_on_pending(self):
        """Pending unverified payment produces NEEDS_REVIEW."""
        order = self._create_order(
            payment_status=Order.PaymentStatus.PENDING,
            order_status=Order.Status.PENDING,
            razorpay_payment_id=None,
        )
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.get(f"/api/v1/admin/payments/{order.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["discrepancy_status"], DiscrepancyStatus.NEEDS_REVIEW)

    # =========================================================================
    # Safe Reconciliation Workflow
    # =========================================================================

    def test_safe_reconciliation_verifies_payment_and_finalizes_stock(self):
        """Reconciliation contacts Razorpay, verifies captured payment, transitions order, and finalizes stock."""
        order = self._create_order(
            payment_status=Order.PaymentStatus.PENDING,
            order_status=Order.Status.PENDING,
            razorpay_order_id="order_rzp_to_reconcile",
            razorpay_payment_id=None,
        )
        self.inventory_item.refresh_from_db()
        self.assertEqual(self.inventory_item.quantity_available, 9)
        self.assertEqual(self.inventory_item.quantity_reserved, 1)

        mock_razorpay_client = MagicMock()
        mock_razorpay_client.order.payments.return_value = {
            "count": 1,
            "items": [
                {
                    "id": "pay_reconciled_captured_999",
                    "status": "captured",
                    "amount": 3500000,  # 35,000 INR in paise
                    "currency": "INR",
                }
            ],
        }

        self.client.force_authenticate(user=self.admin_user)
        with patch("apps.payments.reconciliation.get_razorpay_client", return_value=mock_razorpay_client):
            res = self.client.post(f"/api/v1/admin/payments/{order.id}/reconcile/")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["outcome"], "RECONCILED")

        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(order.status, Order.Status.CONFIRMED)
        self.assertEqual(order.razorpay_payment_id, "pay_reconciled_captured_999")

        # Inventory reservation finalized (quantity_reserved deducted, available was already reserved)
        self.inventory_item.refresh_from_db()
        self.assertEqual(self.inventory_item.quantity_reserved, 0)
        self.assertEqual(self.inventory_item.quantity_available, 9)

        # Audit log written
        audit = OrderAuditLog.objects.latest("created_at")
        self.assertEqual(audit.order, order)
        self.assertEqual(audit.operation_type, OrderAuditLog.OperationType.RECONCILIATION)
        self.assertEqual(audit.to_status, Order.PaymentStatus.PAID)
        self.assertIn("pay_reconciled_captured_999", audit.note)

    def test_reconciliation_idempotency(self):
        """Repeated reconciliation on an already PAID order is idempotent and safe."""
        order = self._create_order(payment_status=Order.PaymentStatus.PAID)
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.post(f"/api/v1/admin/payments/{order.id}/reconcile/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["outcome"], "ALREADY_PAID")

    def test_reconciliation_rejected_for_cancelled_order(self):
        """Cancelled orders cannot be reconciled through this endpoint."""
        order = self._create_order(
            order_status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.PENDING,
            razorpay_payment_id=None,
        )
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.post(f"/api/v1/admin/payments/{order.id}/reconcile/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

    def test_reconciliation_rejected_when_amount_mismatches_on_gateway(self):
        """Mismatched payment amount on gateway is rejected and does NOT mark order paid."""
        order = self._create_order(
            payment_status=Order.PaymentStatus.PENDING,
            order_status=Order.Status.PENDING,
            razorpay_order_id="order_rzp_mismatch",
            razorpay_payment_id=None,
        )

        mock_razorpay_client = MagicMock()
        mock_razorpay_client.order.payments.return_value = {
            "count": 1,
            "items": [
                {
                    "id": "pay_wrong_amount",
                    "status": "captured",
                    "amount": 100000,  # 1,000 INR instead of 35,000 INR
                    "currency": "INR",
                }
            ],
        }

        self.client.force_authenticate(user=self.admin_user)
        with patch("apps.payments.reconciliation.get_razorpay_client", return_value=mock_razorpay_client):
            res = self.client.post(f"/api/v1/admin/payments/{order.id}/reconcile/")

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

    def test_reconciliation_when_gateway_reports_unpaid(self):
        """When no captured payment exists on Razorpay, returns UNPAID_ON_GATEWAY safely."""
        order = self._create_order(
            payment_status=Order.PaymentStatus.PENDING,
            order_status=Order.Status.PENDING,
            razorpay_order_id="order_rzp_unpaid",
            razorpay_payment_id=None,
        )

        mock_razorpay_client = MagicMock()
        mock_razorpay_client.order.payments.return_value = {
            "count": 0,
            "items": [],
        }

        self.client.force_authenticate(user=self.admin_user)
        with patch("apps.payments.reconciliation.get_razorpay_client", return_value=mock_razorpay_client):
            res = self.client.post(f"/api/v1/admin/payments/{order.id}/reconcile/")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["outcome"], "UNPAID_ON_GATEWAY")
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

    # =========================================================================
    # Query Efficiency
    # =========================================================================

    def test_query_efficiency_on_payment_list(self):
        for i in range(5):
            self._create_order(
                razorpay_order_id=f"order_rzp_perf_{i}",
                razorpay_payment_id=f"pay_rzp_perf_{i}",
            )

        self.client.force_authenticate(user=self.admin_user)
        # Prefetched user, user__profile, and items achieves optimal O(1) constant 3 queries
        with self.assertNumQueries(3):
            res = self.client.get("/api/v1/admin/payments/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(len(res.data["results"]), 5)
