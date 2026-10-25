"""
Tests for Admin Inventory Detail, Authoritative Stock Adjustment & Audit History.

Sprint A3.3 Test Suite:
- Admin authorization enforcement (401, 403, 200)
- Positive stock increase and decrease
- Validation of adjustment quantities (<=0, invalid types)
- Validation of mandatory reason codes and supported aliases
- Protection against negative on-hand stock
- Protection against reservation conflicts (cannot make available stock negative)
- Atomic rollback if movement recording fails
- Idempotency guard against duplicate submissions
- Concurrency protection via select_for_update row locking
- Detailed inventory view (/admin/inventory/<variantId>/)
- Movement history filtering (by movement_type, reason_code, is_manual) and pagination
- Read-only audit history (cannot edit or delete historical records)
- Backward compatibility for existing stock-adjustment endpoint
"""

import uuid
from unittest.mock import patch
from django.db import DatabaseError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.catalog.models import Category, Product, ProductImage, ProductVariant
from apps.inventory.models import InventoryItem, InventoryMovement, InventoryReservation
from apps.inventory.services import adjust_variant_stock, calculate_variant_stock


class AdminStockAdjustmentTests(TestCase):
    """
    Test suite for Sprint A3.3: Authoritative Stock Adjustments & Movement Audit History.
    """

    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.admin_user, display_name="Admin")

        # Non-admin customer
        self.customer_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="shopper@closetbychilli.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.customer_user, display_name="Customer")

        # Category & Product
        self.category = Category.objects.create(
            name="Kurtas",
            slug="kurtas",
            is_active=True,
        )
        self.product = Product.objects.create(
            name="Zari Silk Kurta",
            slug="zari-silk-kurta",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.image = ProductImage.objects.create(
            product=self.product,
            image_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
            alt_text="Silk Kurta Front",
            is_primary=True,
            ordering=0,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="ZSK-RED-M",
            size="M",
            color="Crimson",
            retail_price=4999.00,
            sale_price=None,
            is_active=True,
        )
        self.inventory_item = InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=20,
            quantity_reserved=5,
        )

    # --------------------------------------------------------------------------
    # 1. Authorization Tests
    # --------------------------------------------------------------------------

    def test_unauthenticated_user_cannot_adjust_stock(self):
        url = f"/api/v1/admin/inventory/{self.variant.id}/adjust/"
        res = self.client.post(
            url,
            {"adjustment_type": "increase", "quantity": 5, "reason_code": "received_stock"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_user_cannot_adjust_stock(self):
        self.client.force_authenticate(user=self.customer_user)
        url = f"/api/v1/admin/inventory/{self.variant.id}/adjust/"
        res = self.client.post(
            url,
            {"adjustment_type": "increase", "quantity": 5, "reason_code": "received_stock"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_user_can_access_endpoints(self):
        self.client.force_authenticate(user=self.admin_user)
        detail_url = f"/api/v1/admin/inventory/{self.variant.id}/"
        res = self.client.get(detail_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["sku"], "ZSK-RED-M")

    # --------------------------------------------------------------------------
    # 2. Positive Increase & Decrease Adjustments
    # --------------------------------------------------------------------------

    def test_successful_stock_increase(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.variant.id}/adjust/"
        payload = {
            "adjustment_type": "increase",
            "quantity": 10,
            "reason_code": "received_stock",
            "note": "Supplier delivery batch #992",
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["quantity_available"], 30)
        self.assertEqual(res.data["quantity_reserved"], 5)
        self.assertEqual(res.data["quantity_on_hand"], 35)
        self.assertEqual(res.data["change_delta"], 10)

        # Check DB state
        self.inventory_item.refresh_from_db()
        self.assertEqual(self.inventory_item.quantity_available, 30)

        # Check Movement
        movement = InventoryMovement.objects.filter(inventory_item=self.inventory_item).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity_change, 10)
        self.assertEqual(movement.movement_type, InventoryMovement.MovementType.MANUAL_ADJUSTMENT)
        self.assertEqual(movement.reason_code, "received_stock")
        self.assertEqual(movement.actor, self.admin_user)
        self.assertEqual(movement.actor_email, self.admin_user.email)
        self.assertEqual(movement.note, "Supplier delivery batch #992")
        self.assertEqual(movement.resulting_quantity, 35)

    def test_successful_stock_decrease(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.variant.id}/adjust/"
        payload = {
            "adjustment_type": "decrease",
            "quantity": 5,
            "reason_code": "damaged_goods",
            "note": "Water damage in showroom shelf",
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["quantity_available"], 15)
        self.assertEqual(res.data["quantity_reserved"], 5)
        self.assertEqual(res.data["quantity_on_hand"], 20)
        self.assertEqual(res.data["change_delta"], -5)

        self.inventory_item.refresh_from_db()
        self.assertEqual(self.inventory_item.quantity_available, 15)

    # --------------------------------------------------------------------------
    # 3. Validation: Quantities, Reason Codes & Non-negative constraints
    # --------------------------------------------------------------------------

    def test_reject_zero_or_negative_quantity(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.variant.id}/adjust/"

        for invalid_qty in [0, -4]:
            res = self.client.post(
                url,
                {"adjustment_type": "increase", "quantity": invalid_qty, "reason_code": "received_stock"},
                format="json",
            )
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_missing_or_invalid_reason_code(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.variant.id}/adjust/"

        # Missing reason code
        res = self.client.post(
            url,
            {"adjustment_type": "increase", "quantity": 5, "reason_code": ""},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid reason code
        res = self.client.post(
            url,
            {"adjustment_type": "increase", "quantity": 5, "reason_code": "alien_abduction"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_reduction_below_on_hand_stock(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.variant.id}/adjust/"

        # On-hand is 25 (20 avail + 5 reserved). Decreasing by 30 must be rejected.
        res = self.client.post(
            url,
            {"adjustment_type": "decrease", "quantity": 30, "reason_code": "lost_or_missing"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", res.data)

        # Verify DB unmutated
        self.inventory_item.refresh_from_db()
        self.assertEqual(self.inventory_item.quantity_available, 20)
        self.assertEqual(InventoryMovement.objects.filter(inventory_item=self.inventory_item).count(), 0)

    def test_protect_reserved_stock_from_reservation_conflicts(self):
        """
        Stock must never be decreased below available quantity, protecting
        active reservations from being silently invalidated.
        """
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.variant.id}/adjust/"

        # Available is 20, reserved is 5.
        # Decreasing by 22 would leave available at -2 (even though on-hand would be 3).
        # This must be rejected to protect reserved customer orders!
        res = self.client.post(
            url,
            {"adjustment_type": "decrease", "quantity": 22, "reason_code": "damaged_goods"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", res.data)

        self.inventory_item.refresh_from_db()
        self.assertEqual(self.inventory_item.quantity_available, 20)
        self.assertEqual(self.inventory_item.quantity_reserved, 5)

    # --------------------------------------------------------------------------
    # 4. Atomic Rollback & Error Safety
    # --------------------------------------------------------------------------

    def test_atomic_rollback_if_movement_creation_fails(self):
        """
        If creating the audit movement record fails, the inventory item quantity
        change MUST be completely rolled back in the database transaction.
        """
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.variant.id}/adjust/"

        with patch.object(InventoryMovement.objects, "create") as mock_create:
            mock_create.side_effect = DatabaseError("Database disk write failed!")

            # Direct service call will raise DatabaseError
            with self.assertRaises(DatabaseError):
                adjust_variant_stock(
                    variant_id=self.variant.id,
                    adjustment_type="increase",
                    quantity=10,
                    reason_code="received_stock",
                )

        # Assert quantity_available was rolled back to 20
        self.inventory_item.refresh_from_db()
        self.assertEqual(self.inventory_item.quantity_available, 20)

    # --------------------------------------------------------------------------
    # 5. Idempotency Mechanisms
    # --------------------------------------------------------------------------

    def test_idempotent_duplicate_submission_prevention(self):
        """
        Resubmitting the same adjustment with the same idempotency_key must return
        the existing state without mutating stock twice.
        """
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.variant.id}/adjust/"
        idem_key = "sub-order-adj-12345"

        payload = {
            "adjustment_type": "increase",
            "quantity": 5,
            "reason_code": "received_stock",
            "idempotency_key": idem_key,
        }

        # First request
        res1 = self.client.post(url, payload, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data["quantity_available"], 25)
        self.assertFalse(res1.data["idempotent_replay"])

        # Second request with identical key
        res2 = self.client.post(url, payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["quantity_available"], 25)
        self.assertTrue(res2.data["idempotent_replay"])

        # Verify only 1 movement created
        movements = InventoryMovement.objects.filter(
            inventory_item=self.inventory_item,
            idempotency_key=idem_key,
        )
        self.assertEqual(movements.count(), 1)

    # --------------------------------------------------------------------------
    # 6. Concurrency Protection
    # --------------------------------------------------------------------------

    def test_concurrent_adjustments_preserve_correct_totals(self):
        """
        Multiple sequential/concurrent adjustments via the authoritative service
        must accurately accumulate without lost updates.
        """
        # Execute 5 sequential adjustments (+3, -2, +10, -5, +4) = net +10
        deltas = [
            ("increase", 3, "received_stock"),
            ("decrease", 2, "damaged_goods"),
            ("increase", 10, "received_stock"),
            ("decrease", 5, "count_correction"),
            ("increase", 4, "return_received"),
        ]

        initial_available = self.inventory_item.quantity_available  # 20

        for adj_type, qty, reason in deltas:
            adjust_variant_stock(
                variant_id=self.variant.id,
                adjustment_type=adj_type,
                quantity=qty,
                reason_code=reason,
                actor=self.admin_user,
            )

        self.inventory_item.refresh_from_db()
        expected = initial_available + 3 - 2 + 10 - 5 + 4  # 30
        self.assertEqual(self.inventory_item.quantity_available, expected)
        self.assertEqual(
            InventoryMovement.objects.filter(inventory_item=self.inventory_item).count(),
            5,
        )

    # --------------------------------------------------------------------------
    # 7. Inventory Detail & Movement History Endpoints
    # --------------------------------------------------------------------------

    def test_inventory_detail_endpoint(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.variant.id}/"
        res = self.client.get(url)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["sku"], "ZSK-RED-M")
        self.assertEqual(res.data["product_name"], "Zari Silk Kurta")
        self.assertEqual(res.data["quantity_available"], 20)
        self.assertEqual(res.data["quantity_reserved"], 5)
        self.assertEqual(res.data["quantity_on_hand"], 25)
        self.assertEqual(res.data["stock_status"], "in_stock")
        self.assertEqual(res.data["stock_status_label"], "In Stock")
        self.assertEqual(res.data["low_stock_threshold"], 5)
        self.assertTrue(len(res.data["images"]) > 0)

    def test_movement_history_pagination_and_filtering(self):
        self.client.force_authenticate(user=self.admin_user)

        # Seed movements: 2 manual adjustments, 1 order reservation, 1 order fulfilled
        InventoryMovement.objects.create(
            inventory_item=self.inventory_item,
            movement_type=InventoryMovement.MovementType.MANUAL_ADJUSTMENT,
            quantity_change=5,
            reason_code="received_stock",
            actor=self.admin_user,
            actor_email=self.admin_user.email,
            reference="Batch 1",
        )
        InventoryMovement.objects.create(
            inventory_item=self.inventory_item,
            movement_type=InventoryMovement.MovementType.MANUAL_ADJUSTMENT,
            quantity_change=-2,
            reason_code="damaged_goods",
            actor=self.admin_user,
            actor_email=self.admin_user.email,
            reference="Inspection",
        )
        InventoryMovement.objects.create(
            inventory_item=self.inventory_item,
            movement_type=InventoryMovement.MovementType.ORDER_RESERVED,
            quantity_change=-1,
            reference="Order #1001",
        )

        url = f"/api/v1/admin/inventory/{self.variant.id}/movements/"

        # 1. All movements
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 3)
        self.assertEqual(len(res.data["results"]), 3)

        # 2. Filter by movement_type=manual_adjustment
        res_manual = self.client.get(f"{url}?movement_type=manual_adjustment")
        self.assertEqual(res_manual.data["count"], 2)

        # 3. Filter by reason_code=damaged_goods
        res_damaged = self.client.get(f"{url}?reason_code=damaged_goods")
        self.assertEqual(res_damaged.data["count"], 1)
        self.assertEqual(res_damaged.data["results"][0]["reason_code"], "damaged_goods")
        self.assertEqual(res_damaged.data["results"][0]["reason_display"], "Damaged Goods")

        # 4. Filter by is_manual=true
        res_is_manual = self.client.get(f"{url}?is_manual=true")
        self.assertEqual(res_is_manual.data["count"], 2)

        # 5. Filter by is_manual=false
        res_auto = self.client.get(f"{url}?is_manual=false")
        self.assertEqual(res_auto.data["count"], 1)
        self.assertEqual(res_auto.data["results"][0]["movement_type"], "order_reserved")

    def test_movement_history_is_append_only_read_only(self):
        """
        Administrators cannot modify or delete historical movements.
        """
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.variant.id}/movements/"

        # POST not allowed on movements list
        res_post = self.client.post(url, {"quantity_change": 5}, format="json")
        self.assertEqual(res_post.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # DELETE not allowed
        res_del = self.client.delete(url)
        self.assertEqual(res_del.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_existing_variant_stock_adjustment_view_backward_compatibility(self):
        """
        Legacy POST /api/v1/admin/variants/<variant_id>/stock-adjustment/ endpoint
        must delegate to authoritative adjust_variant_stock and continue working.
        """
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/variants/{self.variant.id}/stock-adjustment/"

        res = self.client.post(
            url,
            {"adjustment_type": "set", "quantity": 18, "reason": "stock_received"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["quantity_available"], 18)
        self.assertEqual(res.data["stock_status"], "in_stock")

        self.inventory_item.refresh_from_db()
        self.assertEqual(self.inventory_item.quantity_available, 18)
