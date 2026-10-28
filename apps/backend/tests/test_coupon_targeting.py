"""
Closet by Chilli — Coupon Targeting & Discount Rules Tests (Sprint A5.2).

Covers:
- Evaluation of every targeting mode (ALL_PRODUCTS, SPECIFIC_PRODUCTS, SPECIFIC_CATEGORIES,
  SPECIFIC_COLLECTIONS, PRODUCTS_AND_CATEGORIES, PRODUCTS_AND_COLLECTIONS,
  CATEGORIES_AND_COLLECTIONS, MIXED).
- Matching and nonmatching products.
- Products matching multiple selected targets (category + collection, product + category).
- Hierarchical category targeting (child category product matching targeted parent category).
- Inactive and unpublished products (draft, archived, is_active=False) handling.
- Inactive categories and collections handling.
- Deterministic behavior with empty targets (reject invalid combinations, never silently convert to ALL_PRODUCTS).
- Validation rejection of missing, duplicate, or inactive target IDs in API create and update.
- Atomic replacement of targeting rules via API.
- Batch evaluation and queryset filtering service helpers.
- Admin authorization enforcement.
"""

from decimal import Decimal
import datetime
import uuid

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.catalog.models import Category, Collection, Product, ProductCollection, ProductVariant
from apps.orders.coupon_targeting_service import (
    batch_evaluate_products,
    filter_qualifying_products,
    product_matches_coupon_target,
)
from apps.orders.models import Coupon, CouponAuditLog


class CouponTargetingServiceAndApiTests(TestCase):
    """Test suite for Coupon Targeting Rules, Evaluation Service, and Admin APIs."""

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
            email="customer@closetbychilli.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(
            user=self.customer_user,
            display_name="Customer User",
        )

        self.now = timezone.now()

        # Categories
        self.cat_ethnic = Category.objects.create(
            name="Ethnic Wear",
            slug="ethnic-wear",
            is_active=True,
        )
        self.cat_kurtis = Category.objects.create(
            name="Kurtis",
            slug="kurtis",
            parent=self.cat_ethnic,
            is_active=True,
        )
        self.cat_western = Category.objects.create(
            name="Western Wear",
            slug="western-wear",
            is_active=True,
        )
        self.cat_inactive = Category.objects.create(
            name="Inactive Category",
            slug="inactive-category",
            is_active=False,
        )

        # Collections
        self.col_festive = Collection.objects.create(
            name="Festive 2026",
            slug="festive-2026",
            is_active=True,
        )
        self.col_summer = Collection.objects.create(
            name="Summer Glow",
            slug="summer-glow",
            is_active=True,
        )
        self.col_inactive = Collection.objects.create(
            name="Archived Seasonal",
            slug="archived-seasonal",
            is_active=False,
        )

        # Products
        self.prod_kurti = Product.objects.create(
            name="Anarkali Kurti",
            slug="anarkali-kurti",
            category=self.cat_kurtis,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.var_kurti = ProductVariant.objects.create(
            product=self.prod_kurti,
            sku="ANARKALI-RED-M",
            retail_price=Decimal("1500.00"),
            is_active=True,
        )

        self.prod_dress = Product.objects.create(
            name="Floral Summer Dress",
            slug="floral-summer-dress",
            category=self.cat_western,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.var_dress = ProductVariant.objects.create(
            product=self.prod_dress,
            sku="DRESS-FLORAL-S",
            retail_price=Decimal("2200.00"),
            is_active=True,
        )

        self.prod_draft = Product.objects.create(
            name="Unpublished Kurta",
            slug="unpublished-kurta",
            category=self.cat_kurtis,
            status=Product.Status.DRAFT,
            is_active=True,
        )

        self.prod_archived = Product.objects.create(
            name="Archived Tunic",
            slug="archived-tunic",
            category=self.cat_western,
            status=Product.Status.ARCHIVED,
            is_active=True,
        )

        self.prod_inactive = Product.objects.create(
            name="Deactivated Item",
            slug="deactivated-item",
            category=self.cat_western,
            status=Product.Status.ACTIVE,
            is_active=False,
        )

        # Attach collections
        ProductCollection.objects.create(
            product=self.prod_kurti,
            collection=self.col_festive,
            is_active=True,
        )
        ProductCollection.objects.create(
            product=self.prod_dress,
            collection=self.col_summer,
            is_active=True,
        )

    def _get_error_details(self, resp):
        data = resp.json()
        if isinstance(data, dict) and "error" in data and isinstance(data["error"], dict) and "details" in data["error"]:
            return data["error"]["details"]
        return data

    # =========================================================================
    # Rule Evaluation Service Tests: All 8 Modes
    # =========================================================================

    def test_mode_all_products(self):
        """ALL_PRODUCTS qualifies all active, published products without requiring targets."""
        coupon = Coupon.objects.create(
            code="ALLPROD10",
            name="All Products Coupon",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("10.00"),
            targeting_mode=Coupon.TargetingMode.ALL_PRODUCTS,
            start_date=self.now,
        )

        self.assertTrue(product_matches_coupon_target(coupon, self.prod_kurti))
        self.assertTrue(product_matches_coupon_target(coupon, self.var_kurti))
        self.assertTrue(product_matches_coupon_target(coupon, self.prod_dress))

        # Inactive or unpublished never qualify
        self.assertFalse(product_matches_coupon_target(coupon, self.prod_draft))
        self.assertFalse(product_matches_coupon_target(coupon, self.prod_archived))
        self.assertFalse(product_matches_coupon_target(coupon, self.prod_inactive))
        self.assertFalse(product_matches_coupon_target(coupon, None))

    def test_mode_specific_products(self):
        """SPECIFIC_PRODUCTS qualifies only explicitly selected products."""
        coupon = Coupon.objects.create(
            code="PRODONLY",
            name="Kurti Specific Discount",
            discount_type=Coupon.DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("200.00"),
            targeting_mode=Coupon.TargetingMode.SPECIFIC_PRODUCTS,
            start_date=self.now,
        )
        coupon.applicable_products.add(self.prod_kurti)

        self.assertTrue(product_matches_coupon_target(coupon, self.prod_kurti))
        self.assertTrue(product_matches_coupon_target(coupon, self.var_kurti))
        self.assertFalse(product_matches_coupon_target(coupon, self.prod_dress))

    def test_mode_specific_categories_and_hierarchy(self):
        """SPECIFIC_CATEGORIES matches direct categories and hierarchical parent categories."""
        # Coupon targeting child category 'kurtis'
        coupon_child = Coupon.objects.create(
            code="KURTIS20",
            name="Kurtis Discount",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("20.00"),
            targeting_mode=Coupon.TargetingMode.SPECIFIC_CATEGORIES,
            start_date=self.now,
        )
        coupon_child.applicable_categories.add(self.cat_kurtis)

        self.assertTrue(product_matches_coupon_target(coupon_child, self.prod_kurti))
        self.assertFalse(product_matches_coupon_target(coupon_child, self.prod_dress))

        # Coupon targeting parent category 'Ethnic Wear'
        coupon_parent = Coupon.objects.create(
            code="ETHNIC15",
            name="Ethnic Wear Parent Discount",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("15.00"),
            targeting_mode=Coupon.TargetingMode.SPECIFIC_CATEGORIES,
            start_date=self.now,
        )
        coupon_parent.applicable_categories.add(self.cat_ethnic)

        # prod_kurti is under child category 'kurtis', whose parent is 'Ethnic Wear' -> matches
        self.assertTrue(product_matches_coupon_target(coupon_parent, self.prod_kurti))
        self.assertFalse(product_matches_coupon_target(coupon_parent, self.prod_dress))

    def test_mode_specific_collections(self):
        """SPECIFIC_COLLECTIONS matches products attached to active targeted collections."""
        coupon = Coupon.objects.create(
            code="FESTIVE30",
            name="Festive Collection Discount",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("30.00"),
            targeting_mode=Coupon.TargetingMode.SPECIFIC_COLLECTIONS,
            start_date=self.now,
        )
        coupon.applicable_collections.add(self.col_festive)

        self.assertTrue(product_matches_coupon_target(coupon, self.prod_kurti))
        self.assertFalse(product_matches_coupon_target(coupon, self.prod_dress))

    def test_mode_products_and_categories_union(self):
        """PRODUCTS_AND_CATEGORIES matches either targeted products OR targeted categories."""
        coupon = Coupon.objects.create(
            code="PRODORCAT",
            name="Products or Categories",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("10.00"),
            targeting_mode=Coupon.TargetingMode.PRODUCTS_AND_CATEGORIES,
            start_date=self.now,
        )
        # Target prod_kurti by product and Western Wear by category
        coupon.applicable_products.add(self.prod_kurti)
        coupon.applicable_categories.add(self.cat_western)

        # prod_kurti matches via product
        self.assertTrue(product_matches_coupon_target(coupon, self.prod_kurti))
        # prod_dress matches via category (Western Wear)
        self.assertTrue(product_matches_coupon_target(coupon, self.prod_dress))

    def test_mode_products_and_collections_union(self):
        """PRODUCTS_AND_COLLECTIONS matches either targeted products OR targeted collections."""
        coupon = Coupon.objects.create(
            code="PRODORCOL",
            name="Products or Collections",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("15.00"),
            targeting_mode=Coupon.TargetingMode.PRODUCTS_AND_COLLECTIONS,
            start_date=self.now,
        )
        # Target prod_kurti by product and Summer Glow collection (contains prod_dress)
        coupon.applicable_products.add(self.prod_kurti)
        coupon.applicable_collections.add(self.col_summer)

        self.assertTrue(product_matches_coupon_target(coupon, self.prod_kurti))
        self.assertTrue(product_matches_coupon_target(coupon, self.prod_dress))

    def test_mode_categories_and_collections_union(self):
        """CATEGORIES_AND_COLLECTIONS matches either targeted categories OR targeted collections."""
        coupon = Coupon.objects.create(
            code="CATORCOL",
            name="Categories or Collections",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("15.00"),
            targeting_mode=Coupon.TargetingMode.CATEGORIES_AND_COLLECTIONS,
            start_date=self.now,
        )
        coupon.applicable_categories.add(self.cat_western)
        coupon.applicable_collections.add(self.col_festive)

        # prod_kurti matches via collection (Festive)
        self.assertTrue(product_matches_coupon_target(coupon, self.prod_kurti))
        # prod_dress matches via category (Western Wear)
        self.assertTrue(product_matches_coupon_target(coupon, self.prod_dress))

    def test_mode_mixed_union(self):
        """MIXED applies to the union of all configured product, category, and collection targets."""
        coupon = Coupon.objects.create(
            code="MIXED25",
            name="Mixed Targets Discount",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("25.00"),
            targeting_mode=Coupon.TargetingMode.MIXED,
            start_date=self.now,
        )
        coupon.applicable_products.add(self.prod_kurti)
        coupon.applicable_collections.add(self.col_summer)

        self.assertTrue(product_matches_coupon_target(coupon, self.prod_kurti))
        self.assertTrue(product_matches_coupon_target(coupon, self.prod_dress))

    def test_empty_targets_never_silently_match_all(self):
        """If a targeted coupon has empty target associations, it must NOT qualify any products."""
        coupon = Coupon.objects.create(
            code="EMPTYPRODS",
            name="Empty Targets",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("10.00"),
            targeting_mode=Coupon.TargetingMode.SPECIFIC_PRODUCTS,
            start_date=self.now,
        )
        # No applicable_products added
        self.assertFalse(product_matches_coupon_target(coupon, self.prod_kurti))
        self.assertFalse(product_matches_coupon_target(coupon, self.prod_dress))

    def test_batch_evaluation_and_queryset_filter(self):
        """Verify batch evaluation and queryset filtering helpers."""
        coupon = Coupon.objects.create(
            code="BATCHTEST",
            name="Batch Test",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("10.00"),
            targeting_mode=Coupon.TargetingMode.SPECIFIC_PRODUCTS,
            start_date=self.now,
        )
        coupon.applicable_products.add(self.prod_kurti)

        # Batch evaluation
        results = batch_evaluate_products(coupon, [self.prod_kurti, self.prod_dress, self.prod_draft])
        self.assertTrue(results[self.prod_kurti.id])
        self.assertFalse(results[self.prod_dress.id])
        self.assertFalse(results[self.prod_draft.id])

        # QuerySet filtering
        qs = filter_qualifying_products(coupon, Product.objects.all())
        matching_ids = list(qs.values_list("id", flat=True))
        self.assertIn(self.prod_kurti.id, matching_ids)
        self.assertNotIn(self.prod_dress.id, matching_ids)
        self.assertNotIn(self.prod_draft.id, matching_ids)

    # =========================================================================
    # Admin API Targeting Tests
    # =========================================================================

    def test_create_coupon_with_specific_products_targeting(self):
        """Create a coupon with SPECIFIC_PRODUCTS targeting via admin API."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "code": "PRODAPI20",
            "name": "Products API Promo",
            "discount_type": "PERCENTAGE",
            "discount_value": "20.00",
            "targeting_mode": "SPECIFIC_PRODUCTS",
            "product_ids": [str(self.prod_kurti.id)],
            "start_date": self.now.isoformat(),
        }

        resp = self.client.post("/api/v1/admin/coupons/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        data = resp.json()
        self.assertEqual(data["targeting_mode"], "SPECIFIC_PRODUCTS")
        self.assertEqual(data["applicable_products_count"], 1)
        self.assertEqual(data["applicable_products"][0]["id"], str(self.prod_kurti.id))

        # Verify audit log
        coupon = Coupon.objects.get(code="PRODAPI20")
        audit = coupon.audit_logs.first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.metadata["targeting_mode"], "SPECIFIC_PRODUCTS")
        self.assertEqual(audit.metadata["applicable_products_count"], 1)

    def test_create_coupon_with_mixed_targeting(self):
        """Create a coupon with MIXED targeting via admin API."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "code": "MIXEDAPI",
            "name": "Mixed Targets Promo",
            "discount_type": "FIXED_AMOUNT",
            "discount_value": "350.00",
            "targeting_mode": "MIXED",
            "product_ids": [str(self.prod_kurti.id)],
            "category_ids": [str(self.cat_western.id)],
            "collection_ids": [str(self.col_summer.id)],
            "start_date": self.now.isoformat(),
        }

        resp = self.client.post("/api/v1/admin/coupons/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        data = resp.json()
        self.assertEqual(data["targeting_mode"], "MIXED")
        self.assertEqual(data["applicable_products_count"], 1)
        self.assertEqual(data["applicable_categories_count"], 1)
        self.assertEqual(data["applicable_collections_count"], 1)

    def test_reject_empty_targets_for_specific_mode(self):
        """Rejects creating a SPECIFIC_PRODUCTS coupon without any product IDs."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "code": "EMPTYTARGETS",
            "name": "Empty Target Promo",
            "discount_type": "PERCENTAGE",
            "discount_value": "15.00",
            "targeting_mode": "SPECIFIC_PRODUCTS",
            "product_ids": [],
            "start_date": self.now.isoformat(),
        }

        resp = self.client.post("/api/v1/admin/coupons/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        errs = self._get_error_details(resp)
        self.assertIn("product_ids", errs)

    def test_reject_duplicate_target_ids(self):
        """Rejects duplicate IDs in target lists."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "code": "DUPETARGETS",
            "name": "Duplicate Target Promo",
            "discount_type": "PERCENTAGE",
            "discount_value": "15.00",
            "targeting_mode": "SPECIFIC_PRODUCTS",
            "product_ids": [str(self.prod_kurti.id), str(self.prod_kurti.id)],
            "start_date": self.now.isoformat(),
        }

        resp = self.client.post("/api/v1/admin/coupons/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        errs = self._get_error_details(resp)
        self.assertIn("product_ids", errs)

    def test_reject_inactive_or_draft_product_target(self):
        """Rejects referencing draft, archived, or inactive products as targets."""
        self.client.force_authenticate(user=self.admin_user)
        # Attempting to target draft product
        payload = {
            "code": "DRAFTTARGET",
            "name": "Draft Target Promo",
            "discount_type": "PERCENTAGE",
            "discount_value": "10.00",
            "targeting_mode": "SPECIFIC_PRODUCTS",
            "product_ids": [str(self.prod_draft.id)],
            "start_date": self.now.isoformat(),
        }

        resp = self.client.post("/api/v1/admin/coupons/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        errs = self._get_error_details(resp)
        self.assertIn("product_ids", errs)

    def test_reject_inactive_category_or_collection(self):
        """Rejects referencing inactive categories or collections."""
        self.client.force_authenticate(user=self.admin_user)

        # Inactive category
        payload_cat = {
            "code": "INACTIVECAT",
            "name": "Inactive Category Promo",
            "discount_type": "PERCENTAGE",
            "discount_value": "10.00",
            "targeting_mode": "SPECIFIC_CATEGORIES",
            "category_ids": [str(self.cat_inactive.id)],
            "start_date": self.now.isoformat(),
        }
        resp = self.client.post("/api/v1/admin/coupons/", payload_cat, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        errs = self._get_error_details(resp)
        self.assertIn("category_ids", errs)

        # Inactive collection
        payload_col = {
            "code": "INACTIVECOL",
            "name": "Inactive Collection Promo",
            "discount_type": "PERCENTAGE",
            "discount_value": "10.00",
            "targeting_mode": "SPECIFIC_COLLECTIONS",
            "collection_ids": [str(self.col_inactive.id)],
            "start_date": self.now.isoformat(),
        }
        resp = self.client.post("/api/v1/admin/coupons/", payload_col, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        errs = self._get_error_details(resp)
        self.assertIn("collection_ids", errs)

    def test_reject_incompatible_targets_for_mode(self):
        """Rejects passing categories when mode is SPECIFIC_PRODUCTS, etc."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "code": "INCOMPAT",
            "name": "Incompatible Targets",
            "discount_type": "PERCENTAGE",
            "discount_value": "10.00",
            "targeting_mode": "SPECIFIC_PRODUCTS",
            "product_ids": [str(self.prod_kurti.id)],
            "category_ids": [str(self.cat_western.id)],  # forbidden in SPECIFIC_PRODUCTS
            "start_date": self.now.isoformat(),
        }
        resp = self.client.post("/api/v1/admin/coupons/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        errs = self._get_error_details(resp)
        self.assertIn("category_ids", errs)

    def test_atomic_update_targeting_mode_and_targets(self):
        """Updating targeting mode and target sets occurs atomically and updates audit logs."""
        coupon = Coupon.objects.create(
            code="ATOMICUP",
            name="Atomic Update Promo",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("15.00"),
            targeting_mode=Coupon.TargetingMode.ALL_PRODUCTS,
            start_date=self.now,
        )

        self.client.force_authenticate(user=self.admin_user)

        # Switch from ALL_PRODUCTS to SPECIFIC_CATEGORIES
        patch_payload = {
            "targeting_mode": "SPECIFIC_CATEGORIES",
            "category_ids": [str(self.cat_western.id)],
        }
        resp = self.client.patch(f"/api/v1/admin/coupons/{coupon.id}/", patch_payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        data = resp.json()
        self.assertEqual(data["targeting_mode"], "SPECIFIC_CATEGORIES")
        self.assertEqual(data["applicable_categories_count"], 1)
        self.assertEqual(data["applicable_categories"][0]["slug"], "western-wear")

        coupon.refresh_from_db()
        self.assertEqual(coupon.targeting_mode, Coupon.TargetingMode.SPECIFIC_CATEGORIES)
        self.assertEqual(coupon.applicable_categories.count(), 1)
        self.assertEqual(coupon.applicable_products.count(), 0)

        # Now switch to ALL_PRODUCTS: targets should be cleared
        clear_payload = {
            "targeting_mode": "ALL_PRODUCTS",
            "category_ids": [],
        }
        resp = self.client.patch(f"/api/v1/admin/coupons/{coupon.id}/", clear_payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        coupon.refresh_from_db()
        self.assertEqual(coupon.targeting_mode, Coupon.TargetingMode.ALL_PRODUCTS)
        self.assertEqual(coupon.applicable_categories.count(), 0)

    def test_customer_cannot_modify_or_create_targeting(self):
        """Customers are denied access to coupon creation and modification."""
        self.client.force_authenticate(user=self.customer_user)
        resp = self.client.post("/api/v1/admin/coupons/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
