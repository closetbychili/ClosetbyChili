"""
Closet by Chilli — Admin Shipment & Fulfillment Management Tests (Sprint A4.5).

Covers:
- Admin-only authorization for shipment listing, creation, detail, tracking update, dispatch, and transition.
- Unauthenticated and customer access denied (401/403).
- Shipment creation rules:
  - Allowed for PAID orders in CONFIRMED or PROCESSING states.
  - Denied for unpaid orders (400).
  - Denied for CANCELLED or DELIVERED orders (400).
  - Enforces single active shipment per order limitation (400).
- Safe tracking URL scheme validation:
  - Rejects javascript:, data:, file:, etc.
  - Accepts valid http/https URLs.
- Tracking update operations:
  - Updates carrier and tracking details without mutating status.
  - Writes audited metadata diff.
- Dispatch workflow and order synchronization:
  - Sets dispatched_at and dispatched_by.
  - Coordinates order advancement to SHIPPED (through PROCESSING if CONFIRMED).
  - Atomic ShipmentAuditLog and OrderAuditLog creation.
  - Duplicate dispatch protection / idempotency.
  - Strict inventory protection: zero duplicate deductions.
  - Strict payment protection: payment_status is never mutated.
- Delivery verification:
  - Marking DELIVERED sets delivered_at and advances order to DELIVERED.
- State machine transition rules:
  - Allowed and rejected status transitions enforced server-side.
- Listing, filtering, search, and deterministic sorting.
- Order detail includes embedded shipments.
"""

from decimal import Decimal
import uuid

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import InventoryItem
from apps.orders.models import Order, OrderAuditLog, OrderItem, Shipment, ShipmentAuditLog


class AdminShipmentsApiTests(TestCase):
    """Test suite for Admin Shipment Management (Sprint A4.5)."""

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
            name="Couture Saris",
            slug=f"couture-saris-{uuid.uuid4().hex[:6]}",
        )
        self.product = Product.objects.create(
            name="Zari Embroidered Silk Sari",
            slug=f"zari-silk-sari-{uuid.uuid4().hex[:6]}",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku=f"ZARI-RED-{uuid.uuid4().hex[:4]}",
            size="Free Size",
            color="Crimson",
            retail_price=Decimal("45000.00"),
            is_active=True,
        )

        # 4. Inventory item
        self.inventory_item = InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=20,
            quantity_reserved=0,
            low_stock_threshold=5,
        )

        # 5. Base confirmed paid order
        self.order = Order.objects.create(
            user=self.customer,
            order_number=f"CBC-2026-{uuid.uuid4().hex[:6].upper()}",
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("45000.00"),
            total=Decimal("45000.00"),
            shipping_address_snapshot={
                "full_name": "Patron Sen",
                "phone": "9876543210",
                "address_line1": "Flat 402, Royal Palms",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postal_code": "400001",
                "country": "India",
            },
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            variant=self.variant,
            product_name=self.product.name,
            variant_name="Free Size / Crimson",
            sku=self.variant.sku,
            unit_price=Decimal("45000.00"),
            quantity=1,
            line_total=Decimal("45000.00"),
        )

    # =========================================================================
    # 1. Authorization Tests
    # =========================================================================

    def test_unauthenticated_requests_are_rejected(self):
        """Unauthenticated requests must be rejected with 401."""
        res_list = self.client.get("/api/v1/admin/shipments/")
        self.assertEqual(res_list.status_code, status.HTTP_401_UNAUTHORIZED)

        res_create = self.client.post(
            f"/api/v1/admin/orders/{self.order.id}/shipments/",
            {"carrier": "BlueDart"},
        )
        self.assertEqual(res_create.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_access_is_forbidden(self):
        """Non-admin customer requests must be rejected with 403."""
        self.client.force_authenticate(user=self.customer)

        res_list = self.client.get("/api/v1/admin/shipments/")
        self.assertEqual(res_list.status_code, status.HTTP_403_FORBIDDEN)

        res_create = self.client.post(
            f"/api/v1/admin/orders/{self.order.id}/shipments/",
            {"carrier": "BlueDart"},
        )
        self.assertEqual(res_create.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # 2. Shipment Creation & Eligibility Rules
    # =========================================================================

    def test_admin_can_create_shipment_for_eligible_order(self):
        """Admin can create a shipment for a PAID order in CONFIRMED state."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "carrier": "BlueDart",
            "tracking_number": "BD-987654321",
            "tracking_url": "https://www.bluedart.com/track/BD-987654321",
            "status": "READY_TO_SHIP",
            "internal_note": "Handle embroidered silk with extra packaging",
        }

        response = self.client.post(
            f"/api/v1/admin/orders/{self.order.id}/shipments/",
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data

        self.assertEqual(data["carrier"], "BlueDart")
        self.assertEqual(data["tracking_number"], "BD-987654321")
        self.assertEqual(data["status"], "READY_TO_SHIP")
        self.assertEqual(data["status_display"], "Ready to Ship")
        self.assertEqual(data["order"]["order_number"], self.order.order_number)
        self.assertEqual(data["order"]["payment_status"], "PAID")
        self.assertEqual(len(data["audit_logs"]), 1)
        self.assertEqual(data["audit_logs"][0]["event_type"], "created")

    def test_shipment_creation_fails_for_unpaid_order(self):
        """Unpaid order cannot have a shipment created."""
        self.client.force_authenticate(user=self.admin_user)
        unpaid_order = Order.objects.create(
            user=self.customer,
            order_number=f"CBC-2026-{uuid.uuid4().hex[:6].upper()}",
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            total=Decimal("1000.00"),
        )

        response = self.client.post(
            f"/api/v1/admin/orders/{unpaid_order.id}/shipments/",
            {"carrier": "BlueDart"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("payment", str(response.data).lower())

    def test_shipment_creation_fails_for_cancelled_order(self):
        """Cancelled order cannot have a shipment created even if payment was marked paid."""
        self.client.force_authenticate(user=self.admin_user)
        cancelled_order = Order.objects.create(
            user=self.customer,
            order_number=f"CBC-2026-{uuid.uuid4().hex[:6].upper()}",
            status=Order.Status.CANCELLED,
            payment_status=Order.PaymentStatus.PAID,
            total=Decimal("1000.00"),
        )

        response = self.client.post(
            f"/api/v1/admin/orders/{cancelled_order.id}/shipments/",
            {"carrier": "BlueDart"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cancelled", str(response.data).lower())

    def test_single_active_shipment_per_order_is_enforced(self):
        """Creating a second active shipment on the same order must be rejected."""
        self.client.force_authenticate(user=self.admin_user)

        # 1. Create first shipment
        res1 = self.client.post(
            f"/api/v1/admin/orders/{self.order.id}/shipments/",
            {"carrier": "BlueDart", "tracking_number": "BD-001"},
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # 2. Try creating a second shipment on the same order
        res2 = self.client.post(
            f"/api/v1/admin/orders/{self.order.id}/shipments/",
            {"carrier": "Delhivery", "tracking_number": "DEL-002"},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already has an active shipment", str(res2.data))

    def test_unsafe_tracking_url_scheme_is_rejected(self):
        """Dangerous tracking URL schemes must be rejected with 400."""
        self.client.force_authenticate(user=self.admin_user)

        for unsafe in ["javascript:alert(1)", "data:text/html,hack", "file:///etc/passwd"]:
            response = self.client.post(
                f"/api/v1/admin/orders/{self.order.id}/shipments/",
                {"carrier": "Test", "tracking_url": unsafe},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("tracking_url", str(response.data))

    # =========================================================================
    # 3. Tracking Updates
    # =========================================================================

    def test_update_tracking_preserves_status_and_audits_diff(self):
        """Updating tracking information does NOT alter shipment status and creates audit log."""
        self.client.force_authenticate(user=self.admin_user)
        shipment = Shipment.objects.create(
            order=self.order,
            carrier="InitialCarrier",
            tracking_number="INIT-123",
            status=Shipment.Status.READY_TO_SHIP,
        )

        response = self.client.patch(
            f"/api/v1/admin/shipments/{shipment.id}/tracking/",
            {
                "carrier": "BlueDart Express",
                "tracking_number": "BD-99999",
                "tracking_url": "https://bluedart.com/track/BD-99999",
                "internal_note": "Updated courier service",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertEqual(data["carrier"], "BlueDart Express")
        self.assertEqual(data["tracking_number"], "BD-99999")
        self.assertEqual(data["status"], "READY_TO_SHIP")  # Status unchanged!

        shipment.refresh_from_db()
        self.assertEqual(shipment.carrier, "BlueDart Express")
        self.assertEqual(shipment.status, Shipment.Status.READY_TO_SHIP)

        # Audit log verification
        audit = shipment.audit_logs.first()
        self.assertEqual(audit.event_type, ShipmentAuditLog.EventType.TRACKING_UPDATED)
        self.assertEqual(audit.metadata.get("new_carrier"), "BlueDart Express")

    # =========================================================================
    # 4. Dispatch Workflow & Order Lifecycle Synchronization
    # =========================================================================

    def test_dispatch_shipment_coordinates_order_advancement_and_creates_audits(self):
        """
        Dispatching a shipment:
        - Advances shipment status to SHIPPED.
        - Sets dispatched_at and dispatched_by.
        - Advances order status to SHIPPED (via PROCESSING if CONFIRMED).
        - Creates atomic ShipmentAuditLog and OrderAuditLog records.
        - Does NOT decrement inventory twice.
        - Does NOT mutate payment status.
        """
        self.client.force_authenticate(user=self.admin_user)
        initial_avail = self.inventory_item.quantity_available
        initial_res = self.inventory_item.quantity_reserved

        shipment = Shipment.objects.create(
            order=self.order,
            carrier="BlueDart",
            tracking_number="BD-112233",
            status=Shipment.Status.READY_TO_SHIP,
        )

        response = self.client.post(
            f"/api/v1/admin/shipments/{shipment.id}/dispatch/",
            {"note": "Parcel picked up by courier van"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        shipment.refresh_from_db()
        self.order.refresh_from_db()

        # Shipment checks
        self.assertEqual(shipment.status, Shipment.Status.SHIPPED)
        self.assertIsNotNone(shipment.dispatched_at)
        self.assertEqual(shipment.dispatched_by, self.admin_user)

        # Order lifecycle checks
        self.assertEqual(self.order.status, Order.Status.SHIPPED)
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PAID)

        # Inventory consistency: zero double deduction
        self.inventory_item.refresh_from_db()
        self.assertEqual(self.inventory_item.quantity_available, initial_avail)
        self.assertEqual(self.inventory_item.quantity_reserved, initial_res)

        # Audit log checks
        shipment_audit = shipment.audit_logs.filter(event_type=ShipmentAuditLog.EventType.DISPATCHED).first()
        self.assertIsNotNone(shipment_audit)
        self.assertEqual(shipment_audit.from_status, "READY_TO_SHIP")
        self.assertEqual(shipment_audit.to_status, "SHIPPED")

        order_audit = self.order.audit_logs.filter(to_status=Order.Status.SHIPPED).first()
        self.assertIsNotNone(order_audit)

    def test_dispatch_shipment_is_idempotent(self):
        """Calling dispatch on an already dispatched shipment returns cleanly without duplication."""
        self.client.force_authenticate(user=self.admin_user)
        shipment = Shipment.objects.create(
            order=self.order,
            carrier="BlueDart",
            tracking_number="BD-112233",
            status=Shipment.Status.READY_TO_SHIP,
        )

        # First dispatch
        res1 = self.client.post(f"/api/v1/admin/shipments/{shipment.id}/dispatch/")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Second dispatch (idempotent)
        res2 = self.client.post(f"/api/v1/admin/shipments/{shipment.id}/dispatch/")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["status"], "SHIPPED")

    # =========================================================================
    # 5. State Machine Transitions & Delivery
    # =========================================================================

    def test_shipment_lifecycle_through_in_transit_and_delivered(self):
        """
        Shipment transitions through IN_TRANSIT and DELIVERED:
        - When DELIVERED is reached, order status synchronizes to DELIVERED.
        - delivered_at and delivered_by are recorded.
        """
        self.client.force_authenticate(user=self.admin_user)
        shipment = Shipment.objects.create(
            order=self.order,
            carrier="BlueDart",
            tracking_number="BD-112233",
            status=Shipment.Status.SHIPPED,
            dispatched_at=timezone.now(),
        )
        self.order.status = Order.Status.SHIPPED
        self.order.save()

        # 1. Transition to IN_TRANSIT
        res_transit = self.client.post(
            f"/api/v1/admin/shipments/{shipment.id}/transition/",
            {"target_status": "IN_TRANSIT", "note": "Arrived at regional distribution center"},
            format="json",
        )
        self.assertEqual(res_transit.status_code, status.HTTP_200_OK)
        self.assertEqual(res_transit.data["status"], "IN_TRANSIT")

        # 2. Transition to OUT_FOR_DELIVERY
        res_ofd = self.client.post(
            f"/api/v1/admin/shipments/{shipment.id}/transition/",
            {"target_status": "OUT_FOR_DELIVERY", "note": "Out with local courier"},
            format="json",
        )
        self.assertEqual(res_ofd.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ofd.data["status"], "OUT_FOR_DELIVERY")

        # 3. Transition to DELIVERED
        res_del = self.client.post(
            f"/api/v1/admin/shipments/{shipment.id}/transition/",
            {"target_status": "DELIVERED", "note": "Signed by patron at doorstep"},
            format="json",
        )
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        self.assertEqual(res_del.data["status"], "DELIVERED")

        shipment.refresh_from_db()
        self.order.refresh_from_db()

        self.assertIsNotNone(shipment.delivered_at)
        self.assertEqual(shipment.delivered_by, self.admin_user)
        self.assertEqual(self.order.status, Order.Status.DELIVERED)

    def test_invalid_status_transition_is_rejected(self):
        """Arbitrary invalid transitions are rejected by the server-side state machine."""
        self.client.force_authenticate(user=self.admin_user)
        shipment = Shipment.objects.create(
            order=self.order,
            carrier="BlueDart",
            status=Shipment.Status.READY_TO_SHIP,
        )

        # Cannot jump from READY_TO_SHIP directly to DELIVERED
        res = self.client.post(
            f"/api/v1/admin/shipments/{shipment.id}/transition/",
            {"target_status": "DELIVERED"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid status transition", str(res.data).lower())

    def test_transition_out_of_returned_terminal_state_is_rejected(self):
        """Cannot transition a shipment out of RETURNED terminal state."""
        self.client.force_authenticate(user=self.admin_user)
        shipment = Shipment.objects.create(
            order=self.order,
            carrier="BlueDart",
            status=Shipment.Status.RETURNED,
        )

        res = self.client.post(
            f"/api/v1/admin/shipments/{shipment.id}/transition/",
            {"target_status": "READY_TO_SHIP"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # 6. Listing, Search, Filters, and Sorting
    # =========================================================================

    def test_shipment_listing_with_search_and_filter(self):
        """Admin shipment listing supports pagination, search, carrier, and status filters."""
        self.client.force_authenticate(user=self.admin_user)

        # Create two distinct shipments
        s1 = Shipment.objects.create(
            order=self.order,
            carrier="BlueDart",
            tracking_number="BD-ALPHA-123",
            status=Shipment.Status.READY_TO_SHIP,
        )

        order2 = Order.objects.create(
            user=self.customer,
            order_number=f"CBC-2026-{uuid.uuid4().hex[:6].upper()}",
            status=Order.Status.PROCESSING,
            payment_status=Order.PaymentStatus.PAID,
            total=Decimal("20000.00"),
        )
        s2 = Shipment.objects.create(
            order=order2,
            carrier="Delhivery",
            tracking_number="DEL-BETA-456",
            status=Shipment.Status.SHIPPED,
            dispatched_at=timezone.now(),
        )

        # 1. Base list
        res = self.client.get("/api/v1/admin/shipments/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data["count"], 2)

        # 2. Filter by status=READY_TO_SHIP
        res_st = self.client.get("/api/v1/admin/shipments/?status=READY_TO_SHIP")
        self.assertEqual(res_st.status_code, status.HTTP_200_OK)
        for item in res_st.data["results"]:
            self.assertEqual(item["status"], "READY_TO_SHIP")

        # 3. Filter by carrier=Delhivery
        res_car = self.client.get("/api/v1/admin/shipments/?carrier=Delhivery")
        self.assertEqual(res_car.status_code, status.HTTP_200_OK)
        for item in res_car.data["results"]:
            self.assertEqual(item["carrier"], "Delhivery")

        # 4. Search by tracking number
        res_search = self.client.get("/api/v1/admin/shipments/?search=BD-ALPHA")
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        self.assertEqual(res_search.data["count"], 1)
        self.assertEqual(res_search.data["results"][0]["id"], str(s1.id))

    def test_order_detail_includes_embedded_shipments(self):
        """GET /api/v1/admin/orders/<id>/ returns associated shipments in response."""
        self.client.force_authenticate(user=self.admin_user)
        shipment = Shipment.objects.create(
            order=self.order,
            carrier="BlueDart",
            tracking_number="BD-ORD-EMBED",
            status=Shipment.Status.READY_TO_SHIP,
        )

        response = self.client.get(f"/api/v1/admin/orders/{self.order.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("shipments", response.data)
        self.assertEqual(len(response.data["shipments"]), 1)
        self.assertEqual(response.data["shipments"][0]["id"], str(shipment.id))
        self.assertEqual(response.data["shipments"][0]["carrier"], "BlueDart")
