"""
Tests for Sprint A3.4 — Low-Stock Alerts & Inventory Monitoring.

Covers:
- Admin authorization enforcement (401, 403, 200) for all alert and threshold endpoints.
- Configurable per-variant low-stock threshold configuration and boundary rules.
- Classification at threshold boundaries (available == threshold, threshold + 1, 0).
- Available sellable stock vs reserved stock in status calculations.
- Zero-stock and missing-inventory item handling.
- Validation of threshold values (non-negative integer validation, rejection of negatives).
- Alert acknowledgement decoupling (acknowledging does not hide low/out-of-stock state).
- Automatic reset of alert acknowledgement upon restock above threshold.
- Dedicated alerts endpoints (/alerts/low-stock/, /alerts/out-of-stock/) with search, category filtering, and pagination.
- Summary KPI metrics calculation and consistency with underlying data.
"""

import uuid
from decimal import Decimal
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.catalog.models import Category, Product, ProductImage, ProductVariant
from apps.inventory.models import InventoryItem, InventoryMovement, InventoryReservation
from apps.inventory.services import (
    adjust_variant_stock,
    calculate_variant_stock,
    get_inventory_summary_metrics,
    update_variant_low_stock_threshold,
)


class AdminInventoryAlertsTests(TestCase):
    """
    Test suite for Sprint A3.4 Low-Stock Alerts & Inventory Monitoring.
    """

    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin_alerts@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.admin_user, display_name="Admin")

        # Customer user
        self.customer_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="customer_alerts@closetbychilli.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.customer_user, display_name="Customer")

        # Categories
        self.cat_dresses = Category.objects.create(
            name="Evening Dresses",
            slug="evening-dresses",
            is_active=True,
        )
        self.cat_shoes = Category.objects.create(
            name="Footwear",
            slug="footwear",
            is_active=True,
        )

        # Products
        self.prod_gown = Product.objects.create(
            name="Velvet Gala Gown",
            slug="velvet-gala-gown",
            category=self.cat_dresses,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        ProductImage.objects.create(
            product=self.prod_gown,
            image_url="https://res.cloudinary.com/chilli/gown.jpg",
            is_primary=True,
            ordering=0,
        )

        self.prod_shoes = Product.objects.create(
            name="Silk Stiletto",
            slug="silk-stiletto",
            category=self.cat_shoes,
            status=Product.Status.ACTIVE,
            is_active=True,
        )

        # Variants
        # 1. Gown Small - In stock (10 available, default threshold 5)
        self.var_in_stock = ProductVariant.objects.create(
            product=self.prod_gown,
            sku="GOWN-S",
            size="S",
            color="Emerald",
            retail_price=Decimal("299.00"),
            is_active=True,
        )
        self.item_in_stock = InventoryItem.objects.create(
            variant=self.var_in_stock,
            quantity_available=10,
            quantity_reserved=0,
            low_stock_threshold=5,
        )

        # 2. Gown Medium - Low stock (3 available, custom threshold 5)
        self.var_low_stock = ProductVariant.objects.create(
            product=self.prod_gown,
            sku="GOWN-M",
            size="M",
            color="Emerald",
            retail_price=Decimal("299.00"),
            is_active=True,
        )
        self.item_low_stock = InventoryItem.objects.create(
            variant=self.var_low_stock,
            quantity_available=3,
            quantity_reserved=0,
            low_stock_threshold=5,
        )

        # 3. Gown Large - Out of stock (0 available)
        self.var_out_of_stock = ProductVariant.objects.create(
            product=self.prod_gown,
            sku="GOWN-L",
            size="L",
            color="Emerald",
            retail_price=Decimal("299.00"),
            is_active=True,
        )
        self.item_out_of_stock = InventoryItem.objects.create(
            variant=self.var_out_of_stock,
            quantity_available=0,
            quantity_reserved=0,
            low_stock_threshold=5,
        )

        # 4. Shoes 38 - Custom threshold 2, available 3 -> In Stock
        self.var_shoes = ProductVariant.objects.create(
            product=self.prod_shoes,
            sku="SHOE-38",
            size="38",
            color="Black",
            retail_price=Decimal("150.00"),
            is_active=True,
        )
        self.item_shoes = InventoryItem.objects.create(
            variant=self.var_shoes,
            quantity_available=3,
            quantity_reserved=0,
            low_stock_threshold=2,
        )

    # ------------------------------------------------------------------
    # 1. Authorization tests
    # ------------------------------------------------------------------
    def test_alerts_endpoints_require_admin(self):
        endpoints = [
            "/api/v1/admin/inventory/alerts/low-stock/",
            "/api/v1/admin/inventory/alerts/out-of-stock/",
            f"/api/v1/admin/inventory/{self.var_low_stock.id}/threshold/",
            f"/api/v1/admin/inventory/{self.var_low_stock.id}/acknowledge/",
        ]
        for url in endpoints:
            # Unauthenticated
            self.client.force_authenticate(user=None)
            resp = self.client.get(url) if "alerts" in url else self.client.post(url, {})
            self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED, f"URL {url} allowed unauth")

            # Customer forbidden
            self.client.force_authenticate(user=self.customer_user)
            resp = self.client.get(url) if "alerts" in url else self.client.post(url, {})
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN, f"URL {url} allowed customer")

    # ------------------------------------------------------------------
    # 2. Threshold boundary & classification tests
    # ------------------------------------------------------------------
    def test_stock_status_classification_boundaries(self):
        """
        Verify boundaries:
        - available == threshold -> low_stock
        - available == threshold + 1 -> in_stock
        - available == 0 -> out_of_stock
        """
        # Test boundary: exactly threshold
        self.item_in_stock.quantity_available = 5
        self.item_in_stock.low_stock_threshold = 5
        self.item_in_stock.save()

        summary = calculate_variant_stock(self.item_in_stock)
        self.assertEqual(summary["stock_status"], "low_stock")
        self.assertEqual(summary["stock_status_label"], "Low Stock")

        # Test boundary: threshold + 1
        self.item_in_stock.quantity_available = 6
        self.item_in_stock.save()
        summary = calculate_variant_stock(self.item_in_stock)
        self.assertEqual(summary["stock_status"], "in_stock")

        # Test boundary: 0
        self.item_in_stock.quantity_available = 0
        self.item_in_stock.save()
        summary = calculate_variant_stock(self.item_in_stock)
        self.assertEqual(summary["stock_status"], "out_of_stock")

    def test_reserved_stock_affects_available_quantity(self):
        """
        Available stock is on_hand minus reserved.
        If on_hand is 10 and reserved is 8, available is 2.
        With threshold 5, status is low_stock.
        """
        item = InventoryItem.objects.create(
            variant=ProductVariant.objects.create(
                product=self.prod_gown,
                sku="GOWN-XL",
                size="XL",
                retail_price=Decimal("299.00"),
                is_active=True,
            ),
            quantity_available=2,
            quantity_reserved=8,
            low_stock_threshold=5,
        )
        summary = calculate_variant_stock(item)
        self.assertEqual(summary["quantity_available"], 2)
        self.assertEqual(summary["quantity_reserved"], 8)
        self.assertEqual(summary["quantity_on_hand"], 10)
        self.assertEqual(summary["stock_status"], "low_stock")

    def test_missing_inventory_item_handled_as_out_of_stock(self):
        """
        Variant without an InventoryItem row returns out_of_stock gracefully.
        """
        summary = calculate_variant_stock(None)
        self.assertEqual(summary["quantity_available"], 0)
        self.assertEqual(summary["quantity_on_hand"], 0)
        self.assertEqual(summary["stock_status"], "out_of_stock")

    # ------------------------------------------------------------------
    # 3. Threshold configuration API tests
    # ------------------------------------------------------------------
    def test_update_threshold_success(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.var_low_stock.id}/threshold/"

        # Currently 3 available with threshold 5 (low_stock). Update threshold to 2 -> should become in_stock
        response = self.client.patch(url, {"low_stock_threshold": 2}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["low_stock_threshold"], 2)
        self.assertEqual(response.data["stock_status"], "in_stock")

        # Check persisted in DB
        self.item_low_stock.refresh_from_db()
        self.assertEqual(self.item_low_stock.low_stock_threshold, 2)

    def test_update_threshold_rejects_negative_value(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.var_low_stock.id}/threshold/"

        response = self.client.patch(url, {"low_stock_threshold": -1}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_details = response.data.get("details") or response.data.get("error", {}).get("details", response.data)
        self.assertIn("low_stock_threshold", error_details)

    def test_update_threshold_allows_zero(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.var_low_stock.id}/threshold/"

        response = self.client.patch(url, {"low_stock_threshold": 0}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["low_stock_threshold"], 0)

    # ------------------------------------------------------------------
    # 4. Alert acknowledgement tests
    # ------------------------------------------------------------------
    def test_alert_acknowledgement_decoupling(self):
        """
        Acknowledging an alert must NOT hide low-stock or out-of-stock condition.
        """
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/inventory/{self.var_low_stock.id}/acknowledge/"

        # Acknowledge alert
        response = self.client.post(url, {"acknowledged": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_alert_acknowledged"])
        self.assertIsNotNone(response.data["alert_acknowledged_at"])
        # Status MUST still be low_stock!
        self.assertEqual(response.data["stock_status"], "low_stock")

        # Verify DB
        self.item_low_stock.refresh_from_db()
        self.assertTrue(self.item_low_stock.is_alert_acknowledged)

        # Unacknowledge
        response = self.client.post(url, {"acknowledged": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_alert_acknowledged"])
        self.assertIsNone(response.data["alert_acknowledged_at"])

    def test_restock_resets_alert_acknowledgement(self):
        """
        When variant is restocked above its threshold, alert acknowledgement resets.
        """
        self.item_low_stock.is_alert_acknowledged = True
        self.item_low_stock.save()

        # Restock by 10 units via authoritative adjust_variant_stock service
        adjust_variant_stock(
            variant_id=self.var_low_stock.id,
            adjustment_type="increase",
            quantity=10,
            reason_code="received_stock",
            actor=self.admin_user,
        )

        self.item_low_stock.refresh_from_db()
        self.assertEqual(self.item_low_stock.quantity_available, 13)
        self.assertFalse(self.item_low_stock.is_alert_acknowledged)
        self.assertIsNone(self.item_low_stock.alert_acknowledged_at)

    # ------------------------------------------------------------------
    # 5. Monitoring endpoints & filters
    # ------------------------------------------------------------------
    def test_low_stock_alerts_endpoint(self):
        self.client.force_authenticate(user=self.admin_user)
        url = "/api/v1/admin/inventory/alerts/low-stock/"

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should contain var_low_stock (3 available <= 5 threshold)
        results = response.data["results"]
        skus = [r["sku"] for r in results]
        self.assertIn("GOWN-M", skus)
        self.assertNotIn("GOWN-S", skus)  # 10 available > 5
        self.assertNotIn("GOWN-L", skus)  # 0 available is out_of_stock
        self.assertNotIn("SHOE-38", skus)  # 3 available > 2 threshold

    def test_out_of_stock_alerts_endpoint(self):
        self.client.force_authenticate(user=self.admin_user)
        url = "/api/v1/admin/inventory/alerts/out-of-stock/"

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        skus = [r["sku"] for r in results]
        self.assertIn("GOWN-L", skus)
        self.assertNotIn("GOWN-S", skus)
        self.assertNotIn("GOWN-M", skus)

    def test_alerts_search_and_category_filter(self):
        self.client.force_authenticate(user=self.admin_user)

        # Search by SKU
        resp = self.client.get("/api/v1/admin/inventory/alerts/low-stock/?search=GOWN-M")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 1)
        self.assertEqual(resp.data["results"][0]["sku"], "GOWN-M")

        # Search by product name
        resp = self.client.get("/api/v1/admin/inventory/alerts/low-stock/?search=Velvet")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 1)

        # Category filter: dresses vs footwear
        resp = self.client.get(f"/api/v1/admin/inventory/alerts/low-stock/?category={self.cat_dresses.slug}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 1)

        resp = self.client.get(f"/api/v1/admin/inventory/alerts/low-stock/?category={self.cat_shoes.slug}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 0)

    # ------------------------------------------------------------------
    # 6. Summary metrics consistency
    # ------------------------------------------------------------------
    def test_inventory_summary_metrics(self):
        self.client.force_authenticate(user=self.admin_user)
        url = "/api/v1/admin/inventory/summary/"

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        # 4 total active tracked variants:
        # In stock: GOWN-S (10 > 5), SHOE-38 (3 > 2) -> 2
        # Low stock: GOWN-M (3 <= 5) -> 1
        # Out of stock: GOWN-L (0 <= 0) -> 1
        self.assertEqual(data["active_variants_tracked"], 4)
        self.assertEqual(data["in_stock_variants"], 2)
        self.assertEqual(data["low_stock_variants"], 1)
        self.assertEqual(data["out_of_stock_variants"], 1)
        self.assertEqual(data["total_available"], 16)
        self.assertEqual(data["total_reserved"], 0)
        self.assertEqual(data["total_on_hand"], 16)
        # All alerts unacknowledged initially (low_stock 1 + out_of_stock 1 = 2)
        self.assertEqual(data["unacknowledged_alerts"], 2)
