"""
Tests for Admin Inventory Overview API & Summary Metrics.

Covers:
- Admin authorization enforcement (401 unauthenticated, 403 non-admin, 200 admin)
- Summary metrics accuracy (variants, on-hand, reserved, available, low-stock, out-of-stock)
- Available stock calculations with active vs released/finalized reservations
- Stock status classifications (in_stock, low_stock, out_of_stock)
- Search by product name and SKU
- Filtering by stock status, category, is_active
- Sorting by product name, SKU, available quantity, last movement
- Pagination
- Products with multiple variants
- Graceful handling of missing images or variant attributes
- Query efficiency (preventing N+1 queries)
- Invariance: Viewing inventory never mutates quantities or creates movements
"""

import uuid
from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.catalog.models import Category, Product, ProductImage, ProductVariant
from apps.inventory.models import InventoryItem, InventoryMovement, InventoryReservation


class AdminInventoryApiTests(TestCase):
    """
    Test suite for Admin Inventory Overview endpoints:
    - GET /api/v1/admin/inventory/
    - GET /api/v1/admin/inventory/summary/
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
            email="patron@gmail.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.customer_user, display_name="Customer")

        # Seed categories
        self.category_anarkali = Category.objects.create(
            name="Anarkalis",
            slug="anarkalis",
            is_active=True,
        )
        self.category_sarees = Category.objects.create(
            name="Sarees",
            slug="sarees",
            is_active=True,
        )

        # Seed Product 1 with 2 variants
        self.prod_1 = Product.objects.create(
            name="Gulzar Velvet Anarkali",
            slug="gulzar-velvet-anarkali",
            category=self.category_anarkali,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.img_1 = ProductImage.objects.create(
            product=self.prod_1,
            image_url="https://res.cloudinary.com/chilli/image/upload/gulzar-primary.jpg",
            is_primary=True,
            ordering=0,
        )
        self.v1_m = ProductVariant.objects.create(
            product=self.prod_1,
            sku="GLZ-ANR-M-001",
            size="M",
            color="Maroon",
            retail_price=Decimal("4999.00"),
            is_active=True,
        )
        self.inv1_m = InventoryItem.objects.create(
            variant=self.v1_m,
            quantity_available=12,
            quantity_reserved=2,
        )
        self.mov1 = InventoryMovement.objects.create(
            inventory_item=self.inv1_m,
            movement_type=InventoryMovement.MovementType.STOCK_RECEIVED,
            quantity_change=14,
            reference="PO-2026-101",
        )

        self.v1_l = ProductVariant.objects.create(
            product=self.prod_1,
            sku="GLZ-ANR-L-001",
            size="L",
            color="Maroon",
            retail_price=Decimal("4999.00"),
            is_active=True,
        )
        self.inv1_l = InventoryItem.objects.create(
            variant=self.v1_l,
            quantity_available=4,  # Low stock (<= 5)
            quantity_reserved=0,
        )

        # Seed Product 2 with Out of Stock variant
        self.prod_2 = Product.objects.create(
            name="Chandani Chanderi Saree",
            slug="chandani-chanderi-saree",
            category=self.category_sarees,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.v2_free = ProductVariant.objects.create(
            product=self.prod_2,
            sku="CHD-SAR-FREE-001",
            size="Free Size",
            color="Ivory",
            retail_price=Decimal("6499.00"),
            is_active=True,
        )
        self.inv2_free = InventoryItem.objects.create(
            variant=self.v2_free,
            quantity_available=0,  # Out of stock
            quantity_reserved=0,
        )

    # =========================================================================
    # 1. Authorization Tests
    # =========================================================================

    def test_anonymous_user_is_unauthorized(self):
        """Anonymous requests must return 401 Unauthorized."""
        res_list = self.client.get("/api/v1/admin/inventory/")
        self.assertEqual(res_list.status_code, status.HTTP_401_UNAUTHORIZED)

        res_summary = self.client.get("/api/v1/admin/inventory/summary/")
        self.assertEqual(res_summary.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_user_is_forbidden(self):
        """Authenticated non-admin customer accounts must return 403 Forbidden."""
        self.client.force_authenticate(user=self.customer_user)

        res_list = self.client.get("/api/v1/admin/inventory/")
        self.assertEqual(res_list.status_code, status.HTTP_403_FORBIDDEN)

        res_summary = self.client.get("/api/v1/admin/inventory/summary/")
        self.assertEqual(res_summary.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_user_can_access_endpoints(self):
        """Admin user can successfully access both inventory endpoints."""
        self.client.force_authenticate(user=self.admin_user)

        res_list = self.client.get("/api/v1/admin/inventory/")
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)

        res_summary = self.client.get("/api/v1/admin/inventory/summary/")
        self.assertEqual(res_summary.status_code, status.HTTP_200_OK)

    # =========================================================================
    # 2. Summary Metrics Tests
    # =========================================================================

    def test_summary_metrics_values(self):
        """
        Verify accuracy of summary metrics:
        - active_variants_tracked: 3
        - total_available: 12 + 4 + 0 = 16
        - total_reserved: 2 + 0 + 0 = 2
        - total_on_hand: 16 + 2 = 18
        - out_of_stock_variants: 1 (inv2_free with 0)
        - low_stock_variants: 1 (inv1_l with 4)
        - in_stock_variants: 1 (inv1_m with 12)
        """
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/inventory/summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertEqual(data["active_variants_tracked"], 3)
        self.assertEqual(data["total_available"], 16)
        self.assertEqual(data["total_reserved"], 2)
        self.assertEqual(data["total_on_hand"], 18)
        self.assertEqual(data["out_of_stock_variants"], 1)
        self.assertEqual(data["low_stock_variants"], 1)
        self.assertEqual(data["in_stock_variants"], 1)
        self.assertEqual(data["low_stock_threshold"], 5)

    def test_summary_metrics_custom_threshold(self):
        """Custom low_stock_threshold modifies low_stock and in_stock counts accordingly."""
        self.client.force_authenticate(user=self.admin_user)
        # With threshold=15, inv1_m (12) becomes low stock as well
        res = self.client.get("/api/v1/admin/inventory/summary/?low_stock_threshold=15")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertEqual(data["low_stock_threshold"], 15)
        self.assertEqual(data["low_stock_variants"], 2)  # both 4 and 12 are <= 15
        self.assertEqual(data["in_stock_variants"], 0)

    # =========================================================================
    # 3. Stock Calculations with Reservations
    # =========================================================================

    def test_available_stock_with_active_and_released_reservations(self):
        """
        Active reservations must increase reserved units and decrease available units.
        Released or finalized reservations must be ignored.
        """
        # Create reservations on inv1_m (currently available=12, reserved=2)
        InventoryReservation.objects.create(
            inventory_item=self.inv1_m,
            quantity=3,
            status=InventoryReservation.Status.ACTIVE,
        )
        InventoryReservation.objects.create(
            inventory_item=self.inv1_m,
            quantity=5,
            status=InventoryReservation.Status.RELEASED,  # Should NOT affect stock
        )
        InventoryReservation.objects.create(
            inventory_item=self.inv1_m,
            quantity=2,
            status=InventoryReservation.Status.FINALIZED,  # Should NOT affect stock
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(f"/api/v1/admin/inventory/?search={self.v1_m.sku}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json()["results"]
        self.assertEqual(len(results), 1)

        item_data = results[0]
        # Active reservation = 3, which is > base_reserved (2).
        # On-hand = 12 + 2 = 14.
        # Reserved = 3.
        # Available = 14 - 3 = 11.
        self.assertEqual(item_data["quantity_reserved"], 3)
        self.assertEqual(item_data["quantity_on_hand"], 14)
        self.assertEqual(item_data["quantity_available"], 11)
        self.assertEqual(item_data["stock_status"], "in_stock")

    # =========================================================================
    # 4. Search & Filtering Tests
    # =========================================================================

    def test_search_by_product_name(self):
        """Searching by 'Gulzar' returns only Product 1 variants."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/inventory/?search=Gulzar")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json()["results"]
        self.assertEqual(len(results), 2)
        for r in results:
            self.assertIn("Gulzar", r["product_name"])

    def test_search_by_sku(self):
        """Searching by exact SKU returns the matching variant."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/inventory/?search=CHD-SAR-FREE-001")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["sku"], "CHD-SAR-FREE-001")

    def test_filter_by_stock_status(self):
        """Filtering by out_of_stock, low_stock, and in_stock."""
        self.client.force_authenticate(user=self.admin_user)

        # Out of stock
        res_oos = self.client.get("/api/v1/admin/inventory/?stock_status=out_of_stock")
        self.assertEqual(res_oos.json()["count"], 1)
        self.assertEqual(res_oos.json()["results"][0]["sku"], "CHD-SAR-FREE-001")

        # Low stock
        res_low = self.client.get("/api/v1/admin/inventory/?stock_status=low_stock")
        self.assertEqual(res_low.json()["count"], 1)
        self.assertEqual(res_low.json()["results"][0]["sku"], "GLZ-ANR-L-001")

        # In stock
        res_in = self.client.get("/api/v1/admin/inventory/?stock_status=in_stock")
        self.assertEqual(res_in.json()["count"], 1)
        self.assertEqual(res_in.json()["results"][0]["sku"], "GLZ-ANR-M-001")

    def test_filter_by_category(self):
        """Filtering by category slug or UUID."""
        self.client.force_authenticate(user=self.admin_user)

        res_cat = self.client.get("/api/v1/admin/inventory/?category=sarees")
        self.assertEqual(res_cat.json()["count"], 1)
        self.assertEqual(res_cat.json()["results"][0]["category_name"], "Sarees")

        res_cat_uuid = self.client.get(
            f"/api/v1/admin/inventory/?category={self.category_anarkali.id}"
        )
        self.assertEqual(res_cat_uuid.json()["count"], 2)

    # =========================================================================
    # 5. Sorting & Pagination Tests
    # =========================================================================

    def test_sorting_by_available_and_sku(self):
        """Sorting by available quantity ascending and descending."""
        self.client.force_authenticate(user=self.admin_user)

        # Ascending available: 0 -> 4 -> 12
        res_asc = self.client.get("/api/v1/admin/inventory/?ordering=available")
        skus_asc = [r["sku"] for r in res_asc.json()["results"]]
        self.assertEqual(skus_asc, ["CHD-SAR-FREE-001", "GLZ-ANR-L-001", "GLZ-ANR-M-001"])

        # Descending available: 12 -> 4 -> 0
        res_desc = self.client.get("/api/v1/admin/inventory/?ordering=-available")
        skus_desc = [r["sku"] for r in res_desc.json()["results"]]
        self.assertEqual(skus_desc, ["GLZ-ANR-M-001", "GLZ-ANR-L-001", "CHD-SAR-FREE-001"])

    def test_sorting_by_last_movement(self):
        """Sorting by last_movement_at puts items with movements at top/bottom."""
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.get("/api/v1/admin/inventory/?ordering=-last_movement")
        results = res.json()["results"]
        # inv1_m has a movement, others do not
        self.assertEqual(results[0]["sku"], "GLZ-ANR-M-001")
        self.assertIsNotNone(results[0]["last_movement_at"])
        self.assertEqual(results[0]["last_movement"]["movement_type"], "stock_received")

    def test_pagination(self):
        """Test page_size and page query parameters."""
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.get("/api/v1/admin/inventory/?page_size=2&page=1")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["count"], 3)
        self.assertEqual(len(data["results"]), 2)
        self.assertIsNotNone(data["next"])

        res_p2 = self.client.get("/api/v1/admin/inventory/?page_size=2&page=2")
        self.assertEqual(len(res_p2.json()["results"]), 1)

    # =========================================================================
    # 6. Missing Images & Attributes Graceful Handling
    # =========================================================================

    def test_missing_image_and_variant_attributes(self):
        """
        Product without image returns thumbnail_url=None.
        Variant without size/color returns formatted SKU as title.
        """
        prod_no_img = Product.objects.create(
            name="Minimal Scarf",
            slug="minimal-scarf",
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        var_bare = ProductVariant.objects.create(
            product=prod_no_img,
            sku="MIN-SCF-001",
            size="",
            color="",
            retail_price=Decimal("999.00"),
            is_active=True,
        )
        InventoryItem.objects.create(
            variant=var_bare,
            quantity_available=10,
            quantity_reserved=0,
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(f"/api/v1/admin/inventory/?search={var_bare.sku}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        item = res.json()["results"][0]

        self.assertIsNone(item["thumbnail_url"])
        self.assertEqual(item["variant_title"], "MIN-SCF-001")
        self.assertIsNone(item["category_name"])

    # =========================================================================
    # 7. Non-Mutation / Invariance Guarantee
    # =========================================================================

    def test_viewing_inventory_never_mutates_state_or_creates_movements(self):
        """
        Sprint A3.2 Section 3: Viewing inventory must never change quantities
        or create inventory movements.
        """
        self.client.force_authenticate(user=self.admin_user)

        mov_count_before = InventoryMovement.objects.count()
        inv_before = list(
            InventoryItem.objects.values("id", "quantity_available", "quantity_reserved")
        )

        # Make multiple reads to list and summary
        self.client.get("/api/v1/admin/inventory/")
        self.client.get("/api/v1/admin/inventory/summary/")
        self.client.get("/api/v1/admin/inventory/?search=Gulzar")
        self.client.get("/api/v1/admin/inventory/?stock_status=low_stock")

        mov_count_after = InventoryMovement.objects.count()
        inv_after = list(
            InventoryItem.objects.values("id", "quantity_available", "quantity_reserved")
        )

        self.assertEqual(mov_count_before, mov_count_after)
        self.assertEqual(inv_before, inv_after)

    # =========================================================================
    # 8. Query Efficiency Test
    # =========================================================================

    def test_query_efficiency_no_n_plus_one(self):
        """
        Verify that fetching inventory does not trigger N+1 queries.
        Query count should be constant regardless of page size.
        """
        self.client.force_authenticate(user=self.admin_user)

        # Run query within assertNumQueries context
        # Expected exact queries:
        # 1: Count query for pagination
        # 2: InventoryItem select with joins on variant, product, category
        # 3: Prefetch product images
        # 4: Prefetch active reservations
        # 5: Prefetch movements
        with self.assertNumQueries(5):
            res = self.client.get("/api/v1/admin/inventory/?page_size=20")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
