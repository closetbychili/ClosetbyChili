"""
Closet by Chilli — Admin Order Operations & Status Transitions Tests (Sprint A4.3).

Covers:
- Admin-only authorization for transition, cancellation, and history endpoints.
- Unauthenticated and customer access denied (401/403).
- Lookup by UUID and order number.
- State machine enforcement:
  - Allowed transitions: PENDING (paid) -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED.
  - Prohibited transitions: arbitrary jumping, reverse transitions, terminal state transitions.
  - PENDING -> CONFIRMED requires payment_status == PAID.
  - Invalid target status returns 400.
  - Transition endpoint cannot mutate payment_status.
  - Repeated transition to same status is idempotent.
- Safe Cancellation:
  - Eligible unpaid PENDING order cancellation succeeds and releases reservations.
  - Stock available quantity restored after reservation release.
  - Paid order cancellation strictly prohibited (400).
  - Fulfilled (SHIPPED/DELIVERED) order cancellation strictly prohibited (400).
  - Repeated cancellation is idempotent.
- Durable OrderAuditLog:
  - Atomic log creation with actor, from_status, to_status, operation_type, and note.
  - Failed transitions never create success audit records.
  - Order history endpoint returns chronological audit logs.
  - Order detail response includes audit_logs.
"""

from decimal import Decimal
import uuid

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.catalog.models import Category, Product, ProductImage, ProductVariant
from apps.inventory.models import InventoryItem, InventoryReservation
from apps.inventory.services import create_order_reservations
from apps.orders.models import Order, OrderAuditLog, OrderItem


class AdminOrderOperationsApiTests(TestCase):
    """Test suite for Admin Order Operations (Sprint A4.3)."""

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
            name="Lehengas",
            slug=f"lehengas-{uuid.uuid4().hex[:6]}",
        )
        self.product = Product.objects.create(
            name="Crimson Bridal Lehenga",
            slug=f"crimson-bridal-lehenga-{uuid.uuid4().hex[:6]}",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku=f"CRIM-LEH-{uuid.uuid4().hex[:6]}",
            size="M",
            color="Crimson",
            retail_price=Decimal("45000.00"),
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
        order_status: str = Order.Status.PENDING,
        payment_status: str = Order.PaymentStatus.PENDING,
        with_reservation: bool = True,
    ) -> Order:
        """Helper to create an order with item and reservation."""
        order = Order.objects.create(
            user=self.customer,
            status=order_status,
            payment_status=payment_status,
            currency="INR",
            subtotal=Decimal("45000.00"),
            discount=Decimal("0.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("45000.00"),
            shipping_address_snapshot={"full_name": "Patron Sen", "city": "Jaipur"},
            billing_address_snapshot={"full_name": "Patron Sen", "city": "Jaipur"},
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            variant=self.variant,
            product_name="Crimson Bridal Lehenga",
            variant_name="M / Crimson",
            sku=self.variant.sku,
            unit_price=Decimal("45000.00"),
            quantity=2,
            line_total=Decimal("90000.00"),
        )
        if with_reservation and order_status in (Order.Status.PENDING, Order.Status.CONFIRMED):
            create_order_reservations(order=order)
            self.inventory_item.refresh_from_db()
        return order

    # =========================================================================
    # Authorization & Permissions
    # =========================================================================

    def test_transition_endpoint_requires_admin(self):
        order = self._create_order()
        url = f"/api/v1/admin/orders/{order.id}/transition/"

        # Unauthenticated -> 401
        res = self.client.post(url, {"target_status": Order.Status.CONFIRMED}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer -> 403
        self.client.force_authenticate(user=self.customer)
        res = self.client.post(url, {"target_status": Order.Status.CONFIRMED}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cancel_endpoint_requires_admin(self):
        order = self._create_order()
        url = f"/api/v1/admin/orders/{order.id}/cancel/"

        # Unauthenticated -> 401
        res = self.client.post(url, {"reason": "Customer request"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer -> 403
        self.client.force_authenticate(user=self.customer)
        res = self.client.post(url, {"reason": "Customer request"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_history_endpoint_requires_admin(self):
        order = self._create_order()
        url = f"/api/v1/admin/orders/{order.id}/history/"

        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.customer)
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # Status Transition State Machine
    # =========================================================================

    def test_transition_pending_to_confirmed_requires_payment(self):
        """PENDING -> CONFIRMED must fail if payment_status is not PAID."""
        order = self._create_order(payment_status=Order.PaymentStatus.PENDING)
        self.client.force_authenticate(user=self.admin_user)

        url = f"/api/v1/admin/orders/{order.id}/transition/"
        res = self.client.post(url, {"target_status": Order.Status.CONFIRMED}, format="json")

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PENDING)
        self.assertEqual(OrderAuditLog.objects.count(), 0)

    def test_allowed_full_lifecycle_transitions(self):
        """Test full forward flow: PENDING (paid) -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED."""
        order = self._create_order(payment_status=Order.PaymentStatus.PAID)
        self.client.force_authenticate(user=self.admin_user)

        # 1. PENDING -> CONFIRMED
        res = self.client.post(
            f"/api/v1/admin/orders/{order.id}/transition/",
            {"target_status": Order.Status.CONFIRMED, "note": "Verified payment via Razorpay"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CONFIRMED)
        self.assertEqual(res.data["status"], Order.Status.CONFIRMED)

        # Check audit log
        audit = OrderAuditLog.objects.latest("created_at")
        self.assertEqual(audit.from_status, Order.Status.PENDING)
        self.assertEqual(audit.to_status, Order.Status.CONFIRMED)
        self.assertEqual(audit.actor, self.admin_user)
        self.assertEqual(audit.note, "Verified payment via Razorpay")

        # 2. CONFIRMED -> PROCESSING
        res = self.client.post(
            f"/api/v1/admin/orders/{order.order_number}/transition/",
            {"target_status": Order.Status.PROCESSING, "note": "Order sent to tailoring atelier"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PROCESSING)

        # 3. PROCESSING -> SHIPPED
        res = self.client.post(
            f"/api/v1/admin/orders/{order.id}/transition/",
            {"target_status": Order.Status.SHIPPED, "note": "Dispatched with BlueDart"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.SHIPPED)

        # 4. SHIPPED -> DELIVERED
        res = self.client.post(
            f"/api/v1/admin/orders/{order.id}/transition/",
            {"target_status": Order.Status.DELIVERED, "note": "Delivered to patron"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.DELIVERED)

        self.assertEqual(OrderAuditLog.objects.filter(order=order).count(), 4)

    def test_prohibited_transitions_rejected(self):
        """Jumping states or reversing states must return 400 Bad Request."""
        order = self._create_order(order_status=Order.Status.CONFIRMED, payment_status=Order.PaymentStatus.PAID)
        self.client.force_authenticate(user=self.admin_user)

        # Jumping CONFIRMED -> DELIVERED
        res = self.client.post(
            f"/api/v1/admin/orders/{order.id}/transition/",
            {"target_status": Order.Status.DELIVERED},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        details = res.data.get("error", {}).get("details", res.data)
        self.assertIn("target_status", details)

        # Reversing CONFIRMED -> PENDING
        res = self.client.post(
            f"/api/v1/admin/orders/{order.id}/transition/",
            {"target_status": Order.Status.PENDING},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_terminal_states_cannot_transition(self):
        """DELIVERED and CANCELLED cannot transition to any other status."""
        self.client.force_authenticate(user=self.admin_user)

        delivered_order = self._create_order(order_status=Order.Status.DELIVERED, payment_status=Order.PaymentStatus.PAID)
        res = self.client.post(
            f"/api/v1/admin/orders/{delivered_order.id}/transition/",
            {"target_status": Order.Status.PROCESSING},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        cancelled_order = self._create_order(order_status=Order.Status.CANCELLED)
        res = self.client.post(
            f"/api/v1/admin/orders/{cancelled_order.id}/transition/",
            {"target_status": Order.Status.CONFIRMED},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_target_status_returns_400(self):
        order = self._create_order(order_status=Order.Status.CONFIRMED)
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.post(
            f"/api/v1/admin/orders/{order.id}/transition/",
            {"target_status": "SUPER_STATUS"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transition_endpoint_does_not_mutate_payment_status(self):
        """Transition endpoint must never alter payment_status."""
        order = self._create_order(order_status=Order.Status.CONFIRMED, payment_status=Order.PaymentStatus.PAID)
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.post(
            f"/api/v1/admin/orders/{order.id}/transition/",
            {"target_status": Order.Status.PROCESSING, "payment_status": "REFUNDED"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PROCESSING)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)

    def test_idempotent_repeated_transition(self):
        """Submitting the current status again returns 200 without creating a new audit entry."""
        order = self._create_order(order_status=Order.Status.CONFIRMED, payment_status=Order.PaymentStatus.PAID)
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.post(
            f"/api/v1/admin/orders/{order.id}/transition/",
            {"target_status": Order.Status.CONFIRMED},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(OrderAuditLog.objects.filter(order=order).count(), 0)

    # =========================================================================
    # Admin Order Cancellation & Inventory Safety
    # =========================================================================

    def test_cancel_unpaid_pending_order_releases_reservations(self):
        """Cancelling an unpaid pending order marks CANCELLED and releases stock reservations."""
        order = self._create_order(order_status=Order.Status.PENDING, payment_status=Order.PaymentStatus.PENDING)
        self.inventory_item.refresh_from_db()
        self.assertEqual(self.inventory_item.quantity_available, 8)
        self.assertEqual(self.inventory_item.quantity_reserved, 2)

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post(
            f"/api/v1/admin/orders/{order.id}/cancel/",
            {"reason": "Customer changed mind", "note": "Requested cancellation via phone"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.FAILED)

        # Inventory reservation released and quantity restored
        self.inventory_item.refresh_from_db()
        self.assertEqual(self.inventory_item.quantity_available, 10)
        self.assertEqual(self.inventory_item.quantity_reserved, 0)

        # Audit log written
        audit = OrderAuditLog.objects.latest("created_at")
        self.assertEqual(audit.order, order)
        self.assertEqual(audit.from_status, Order.Status.PENDING)
        self.assertEqual(audit.to_status, Order.Status.CANCELLED)
        self.assertEqual(audit.operation_type, OrderAuditLog.OperationType.CANCELLATION)
        self.assertIn("Customer changed mind", audit.note)

    def test_cancel_paid_order_prohibited(self):
        """Paid orders cannot be cancelled through this endpoint."""
        order = self._create_order(order_status=Order.Status.PENDING, payment_status=Order.PaymentStatus.PAID)
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.post(
            f"/api/v1/admin/orders/{order.id}/cancel/",
            {"reason": "Cancel paid order attempt"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertNotEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(OrderAuditLog.objects.count(), 0)

    def test_cancel_fulfilled_or_shipped_order_prohibited(self):
        """SHIPPED and DELIVERED orders cannot be cancelled."""
        order = self._create_order(order_status=Order.Status.SHIPPED, payment_status=Order.PaymentStatus.PAID)
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.post(
            f"/api/v1/admin/orders/{order.id}/cancel/",
            {"reason": "Cancel shipped order attempt"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.SHIPPED)

    def test_cancel_idempotency(self):
        """Calling cancel on an already CANCELLED order is idempotent and safe."""
        order = self._create_order(order_status=Order.Status.PENDING, payment_status=Order.PaymentStatus.PENDING)
        self.client.force_authenticate(user=self.admin_user)

        # First cancel
        res1 = self.client.post(f"/api/v1/admin/orders/{order.id}/cancel/", {"reason": "First cancel"}, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        audit_count = OrderAuditLog.objects.filter(order=order).count()
        self.assertEqual(audit_count, 1)

        # Second cancel
        res2 = self.client.post(f"/api/v1/admin/orders/{order.id}/cancel/", {"reason": "Second cancel"}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(OrderAuditLog.objects.filter(order=order).count(), 1)

    # =========================================================================
    # History Endpoint & Order Detail Embedding
    # =========================================================================

    def test_history_endpoint_and_order_detail_embedding(self):
        """GET /history/ returns chronological entries and GET /<order_id>/ includes audit_logs."""
        order = self._create_order(order_status=Order.Status.CONFIRMED, payment_status=Order.PaymentStatus.PAID)
        self.client.force_authenticate(user=self.admin_user)

        # Perform transition
        self.client.post(
            f"/api/v1/admin/orders/{order.id}/transition/",
            {"target_status": Order.Status.PROCESSING, "note": "First note"},
            format="json",
        )
        self.client.post(
            f"/api/v1/admin/orders/{order.id}/transition/",
            {"target_status": Order.Status.SHIPPED, "note": "Second note"},
            format="json",
        )

        # 1. Test history endpoint
        res = self.client.get(f"/api/v1/admin/orders/{order.id}/history/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)
        # Most recent first
        self.assertEqual(res.data[0]["to_status"], Order.Status.SHIPPED)
        self.assertEqual(res.data[0]["actor_email"], self.admin_user.email)
        self.assertEqual(res.data[0]["note"], "Second note")
        self.assertEqual(res.data[1]["to_status"], Order.Status.PROCESSING)

        # 2. Test order detail endpoint embeds audit_logs
        detail_res = self.client.get(f"/api/v1/admin/orders/{order.id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertIn("audit_logs", detail_res.data)
        self.assertEqual(len(detail_res.data["audit_logs"]), 2)
        self.assertEqual(detail_res.data["audit_logs"][0]["to_status"], Order.Status.SHIPPED)
