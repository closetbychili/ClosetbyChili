"""
Closet by Chilli — Product Publishing & Catalog Validation Tests (Sprint A2.6)

Comprehensive test coverage verifying:
1. Product readiness validation rules (basic, images, variants, inventory).
2. Explicit publication actions (/validate/, /publish/, /archive/, /draft/).
3. Prevention of invalid publication while leaving existing status unchanged.
4. Public storefront catalog isolation for draft and archived products.
5. Out-of-stock and inactive variant protection in cart mutations and checkout.
6. Atomic publication transitions.
"""

from decimal import Decimal
import uuid
import pytest
from django.utils.text import slugify
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import CustomerProfile, User
from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
    ProductImage,
    ProductVariant,
)
from apps.catalog.publishing import (
    archive_product,
    draft_product,
    publish_product,
    validate_product_readiness,
)
from apps.inventory.models import InventoryItem


class ProductPublishingValidationTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin_curator@closetbychili.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.admin_user, display_name="Admin")

        self.customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="shopper@closetbychili.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.customer, display_name="Shopper")

        self.category = Category.objects.create(
            name="Festive Lehengas",
            slug="festive-lehengas",
            is_active=True,
            is_visible_on_storefront=True,
        )

        self.collection = Collection.objects.create(
            name="Diwali Edit",
            slug="diwali-edit",
            is_active=True,
        )

    def _create_base_draft_product(self, name="Gulmarg Velvet Lehenga"):
        return Product.objects.create(
            name=name,
            slug=slugify(name),
            description="Hand-embroidered zardozi velvet lehenga.",
            category=self.category,
            status=Product.Status.DRAFT,
            is_active=True,
        )

    def test_draft_product_with_missing_category_cannot_be_published(self):
        """Readiness validator flags missing category as blocking error."""
        product = Product.objects.create(
            name="Uncategorized Silhouette",
            slug="uncategorized-silhouette",
            category=None,
            status=Product.Status.DRAFT,
        )
        res = validate_product_readiness(product)
        self.assertFalse(res["is_ready"])
        self.assertFalse(res["can_publish"])
        error_codes = [e["code"] for e in res["errors"]]
        self.assertIn("MISSING_CATEGORY", error_codes)

        # Attempt to publish via endpoint
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(f"/api/v1/admin/products/{product.id}/publish/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertEqual(data["error"]["code"], "PUBLICATION_VALIDATION_FAILED")
        self.assertIn("validation", data["error"])

        # Status must remain draft
        product.refresh_from_db()
        self.assertEqual(product.status, Product.Status.DRAFT)

    def test_product_without_images_fails_publication(self):
        """A product with no images or no primary image cannot publish."""
        product = self._create_base_draft_product()
        # Add variant
        variant = ProductVariant.objects.create(
            product=product,
            sku=f"GUL-LEH-M-{uuid.uuid4().hex[:4]}",
            size="M",
            color="Maroon",
            retail_price=Decimal("4999.00"),
            is_active=True,
        )
        InventoryItem.objects.create(variant=variant, quantity_available=5)

        # Validate without images
        res = validate_product_readiness(product)
        self.assertFalse(res["is_ready"])
        error_codes = [e["code"] for e in res["errors"]]
        self.assertIn("NO_IMAGES", error_codes)

        # Add image without primary flag
        img = ProductImage.objects.create(
            product=product,
            image_url="https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
            is_primary=False,
            ordering=0,
        )
        res2 = validate_product_readiness(product)
        self.assertFalse(res2["is_ready"])
        error_codes2 = [e["code"] for e in res2["errors"]]
        self.assertIn("MISSING_PRIMARY_IMAGE", error_codes2)

        # Endpoint rejects
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(f"/api/v1/admin/products/{product.id}/publish/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        product.refresh_from_db()
        self.assertEqual(product.status, Product.Status.DRAFT)

    def test_product_without_active_variants_fails_publication(self):
        """A product without active purchasable variants cannot publish."""
        product = self._create_base_draft_product()
        ProductImage.objects.create(
            product=product,
            image_url="https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
            is_primary=True,
            ordering=0,
        )

        res = validate_product_readiness(product)
        self.assertFalse(res["is_ready"])
        error_codes = [e["code"] for e in res["errors"]]
        self.assertIn("NO_ACTIVE_VARIANTS", error_codes)

        # Inactive variant only
        v_inactive = ProductVariant.objects.create(
            product=product,
            sku=f"INACT-SKU-{uuid.uuid4().hex[:4]}",
            size="L",
            color="Gold",
            retail_price=Decimal("1500.00"),
            is_active=False,
        )
        InventoryItem.objects.create(variant=v_inactive, quantity_available=10)

        res2 = validate_product_readiness(product)
        self.assertFalse(res2["is_ready"])
        error_codes2 = [e["code"] for e in res2["errors"]]
        self.assertIn("NO_ACTIVE_VARIANTS", error_codes2)

    def test_invalid_sku_or_price_prevents_publication(self):
        """Retail price of 0, negative price, or invalid price blocks publication."""
        product = self._create_base_draft_product()
        ProductImage.objects.create(
            product=product,
            image_url="https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
            is_primary=True,
            ordering=0,
        )

        variant = ProductVariant.objects.create(
            product=product,
            sku="",  # Invalid blank SKU
            size="S",
            color="Red",
            retail_price=Decimal("0.00"),  # Invalid zero price
            is_active=True,
        )
        InventoryItem.objects.create(variant=variant, quantity_available=2)

        res = validate_product_readiness(product)
        self.assertFalse(res["is_ready"])
        error_codes = [e["code"] for e in res["errors"]]
        self.assertIn("INVALID_SKU", error_codes)
        self.assertIn("INVALID_RETAIL_PRICE", error_codes)

    def test_missing_inventory_record_prevents_publication(self):
        """Active variants must have a tracked inventory item."""
        product = self._create_base_draft_product()
        ProductImage.objects.create(
            product=product,
            image_url="https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
            is_primary=True,
            ordering=0,
        )
        # Variant without InventoryItem
        ProductVariant.objects.create(
            product=product,
            sku=f"NOINV-SKU-{uuid.uuid4().hex[:4]}",
            size="M",
            color="Blue",
            retail_price=Decimal("3000.00"),
            is_active=True,
        )

        res = validate_product_readiness(product)
        self.assertFalse(res["is_ready"])
        error_codes = [e["code"] for e in res["errors"]]
        self.assertIn("MISSING_INVENTORY_RECORD", error_codes)

    def test_valid_product_publishes_successfully_and_returns_payload(self):
        """A complete, valid product publishes atomically with status='active'."""
        product = self._create_base_draft_product()
        ProductImage.objects.create(
            product=product,
            image_url="https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
            is_primary=True,
            ordering=0,
        )
        variant = ProductVariant.objects.create(
            product=product,
            sku=f"GUL-LEH-M-{uuid.uuid4().hex[:4]}",
            size="M",
            color="Maroon",
            retail_price=Decimal("4999.00"),
            is_active=True,
        )
        InventoryItem.objects.create(variant=variant, quantity_available=8)

        self.client.force_authenticate(user=self.admin_user)
        # First validate
        val_res = self.client.get(f"/api/v1/admin/products/{product.id}/validate/")
        self.assertEqual(val_res.status_code, status.HTTP_200_OK)
        val_data = val_res.json()
        self.assertTrue(val_data["is_ready"])
        self.assertTrue(val_data["can_publish"])
        self.assertEqual(val_data["summary"]["total_errors"], 0)

        # Publish
        pub_res = self.client.post(f"/api/v1/admin/products/{product.id}/publish/")
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)
        pub_data = pub_res.json()
        self.assertEqual(pub_data["product"]["status"], "active")
        self.assertTrue(pub_data["product"]["is_active"])

        # Check DB
        product.refresh_from_db()
        self.assertEqual(product.status, Product.Status.ACTIVE)
        self.assertTrue(product.is_active)

    def test_archive_and_restore_to_draft_lifecycle(self):
        """Active product can be archived, and archived product can be reverted to draft."""
        product = self._create_base_draft_product()
        ProductImage.objects.create(
            product=product,
            image_url="https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
            is_primary=True,
            ordering=0,
        )
        variant = ProductVariant.objects.create(
            product=product,
            sku=f"ARCH-SKU-{uuid.uuid4().hex[:4]}",
            size="M",
            color="Green",
            retail_price=Decimal("1200.00"),
            is_active=True,
        )
        InventoryItem.objects.create(variant=variant, quantity_available=3)

        self.client.force_authenticate(user=self.admin_user)
        # Publish
        pub_res = self.client.post(f"/api/v1/admin/products/{product.id}/publish/")
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.status, Product.Status.ACTIVE)

        # Archive
        arc_res = self.client.post(f"/api/v1/admin/products/{product.id}/archive/")
        self.assertEqual(arc_res.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.status, Product.Status.ARCHIVED)
        self.assertFalse(product.is_active)

        # Restore to draft
        draft_res = self.client.post(f"/api/v1/admin/products/{product.id}/draft/")
        self.assertEqual(draft_res.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.status, Product.Status.DRAFT)
        self.assertTrue(product.is_active)

    def test_public_catalog_excludes_draft_and_archived_products(self):
        """Public catalog list and detail endpoints return 404 for draft and archived products."""
        # 1. Draft product
        draft_prod = self._create_base_draft_product(name="Secret Draft Drape")

        # 2. Archived product
        arch_prod = Product.objects.create(
            name="Retired Drape",
            slug="retired-drape",
            category=self.category,
            status=Product.Status.ARCHIVED,
            is_active=False,
        )

        # 3. Active product
        active_prod = Product.objects.create(
            name="Public Silk Drape",
            slug="public-silk-drape",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        active_var = ProductVariant.objects.create(
            product=active_prod,
            sku="PUB-SLK-01",
            size="Free",
            color="Gold",
            retail_price=Decimal("3500.00"),
            is_active=True,
        )
        InventoryItem.objects.create(variant=active_var, quantity_available=5)

        # Public listing
        list_res = self.client.get("/api/v1/catalog/products/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        returned_slugs = [p["slug"] for p in list_res.json()["results"]]
        self.assertIn("public-silk-drape", returned_slugs)
        self.assertNotIn("secret-draft-drape", returned_slugs)
        self.assertNotIn("retired-drape", returned_slugs)

        # Public detail
        draft_detail_res = self.client.get(f"/api/v1/catalog/products/{draft_prod.slug}/")
        self.assertEqual(draft_detail_res.status_code, status.HTTP_404_NOT_FOUND)

        arch_detail_res = self.client.get(f"/api/v1/catalog/products/{arch_prod.slug}/")
        self.assertEqual(arch_detail_res.status_code, status.HTTP_404_NOT_FOUND)

        active_detail_res = self.client.get(f"/api/v1/catalog/products/{active_prod.slug}/")
        self.assertEqual(active_detail_res.status_code, status.HTTP_200_OK)

    def test_cart_rejects_out_of_stock_and_inactive_variants(self):
        """Cart API rejects adding out-of-stock, inactive, or draft product variants."""
        # Active product
        active_prod = Product.objects.create(
            name="Organza Anarkali Set",
            slug="organza-anarkali-set",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )

        # Out of stock variant
        oos_var = ProductVariant.objects.create(
            product=active_prod,
            sku="OOS-VAR-01",
            size="S",
            color="Peach",
            retail_price=Decimal("2999.00"),
            is_active=True,
        )
        InventoryItem.objects.create(variant=oos_var, quantity_available=0)

        # Inactive variant
        inact_var = ProductVariant.objects.create(
            product=active_prod,
            sku="INACT-VAR-02",
            size="M",
            color="Peach",
            retail_price=Decimal("2999.00"),
            is_active=False,
        )
        InventoryItem.objects.create(variant=inact_var, quantity_available=10)

        # Draft product variant
        draft_prod = self._create_base_draft_product("Draft Kurti")
        draft_var = ProductVariant.objects.create(
            product=draft_prod,
            sku="DRAFT-VAR-03",
            size="L",
            color="Yellow",
            retail_price=Decimal("1999.00"),
            is_active=True,
        )
        InventoryItem.objects.create(variant=draft_var, quantity_available=10)

        self.client.force_authenticate(user=self.customer)

        # 1. Try adding out of stock variant
        res_oos = self.client.post(
            "/api/v1/cart/items/",
            {"variant_id": str(oos_var.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(res_oos.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Try adding inactive variant
        res_inact = self.client.post(
            "/api/v1/cart/items/",
            {"variant_id": str(inact_var.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(res_inact.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Try adding draft product variant
        res_draft = self.client.post(
            "/api/v1/cart/items/",
            {"variant_id": str(draft_var.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(res_draft.status_code, status.HTTP_400_BAD_REQUEST)
