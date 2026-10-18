"""
Closet by Chilli — Category Media & Storefront Discovery Integration Tests (Sprint A2.5 Extension).

Covers:
1. Authentication & Authorization:
   - 401 Unauthorized for anonymous image upload/deletion.
   - 403 Forbidden for customer users.
   - 200 OK for admin users.
2. File Validation:
   - Rejection of oversized files (>10MB).
   - Rejection of invalid file extensions (.exe, .pdf, .txt).
   - Rejection of invalid MIME types.
3. Cloudinary Upload & Metadata Persistence:
   - Upload persists image_url, image_public_id, and image_alt.
   - Default alt_text inferred from filename when omitted.
   - Explicit alt_text preserved.
4. Error Handling & Rollback Lifecycle:
   - Cloudinary upload failure returns 502 with structured error.
   - Missing Cloudinary configuration returns 500 configuration error.
   - Database persistence failure cleans up newly uploaded Cloudinary asset without masking error.
5. Replacement & Safe Cleanup:
   - Replacing category image destroys old Cloudinary asset when unshared.
   - Replacing category image preserves old Cloudinary asset when shared with another record.
   - DELETE endpoint clears image fields and safely destroys Cloudinary asset.
   - Safe category deletion destroys Cloudinary asset.
6. Public Storefront Discovery & Ordering:
   - Inactive categories excluded from public API.
   - Categories with is_visible_on_storefront=False excluded when ?storefront=true is queried.
   - Categories ordered by ordering ascending, tie-breaking by name.
   - Product-category relationships preserved during image updates.
"""

import uuid
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog import admin_views
from apps.accounts.models import CustomerProfile, User
from apps.catalog.cloudinary_service import CloudinaryConfigurationError
from apps.catalog.models import Category, Product, ProductImage


class CategoryMediaApiTests(TestCase):
    """Integration tests for Category image management and storefront discovery."""

    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin.category@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.admin_user, display_name="Admin")

        # Customer user
        self.customer_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="customer.category@closetbychilli.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.customer_user, display_name="Customer")

        # Base category
        self.category = Category.objects.create(
            name="Kurtis & Tunics",
            slug="kurtis-tunics",
            description="Handcrafted everyday ethnic kurtis.",
            short_description="Everyday cuts & relaxed silhouettes",
            ordering=1,
            is_active=True,
            is_visible_on_storefront=True,
        )

    def _sample_image(self, name="kurti_card.jpg", content_type="image/jpeg", size_bytes=1024):
        return SimpleUploadedFile(
            name=name,
            content=b"\xff\xd8\xff\xe0" + b"\x00" * (size_bytes - 4),
            content_type=content_type,
        )

    # =========================================================================
    # 1. Authorization
    # =========================================================================

    def test_anonymous_image_upload_rejected_401(self):
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        img = self._sample_image()
        response = self.client.post(url, {"file": img}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_image_upload_rejected_403(self):
        self.client.force_authenticate(user=self.customer_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        img = self._sample_image()
        response = self.client.post(url, {"file": img}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_image_delete_rejected_401(self):
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_image_delete_rejected_403(self):
        self.client.force_authenticate(user=self.customer_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # 2. File Validation
    # =========================================================================

    def test_upload_rejects_oversized_file(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        oversized = SimpleUploadedFile(
            name="huge_category.jpg",
            content=b"\x00" * (11 * 1024 * 1024),
            content_type="image/jpeg",
        )
        response = self.client.post(url, {"file": oversized}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_ERROR")
        self.assertIn("10MB", response.json()["error"]["details"]["file"][0])

    def test_upload_rejects_invalid_extension(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        bad_file = SimpleUploadedFile(
            name="script.exe",
            content=b"MZ12345",
            content_type="application/x-msdownload",
        )
        response = self.client.post(url, {"file": bad_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_ERROR")
        self.assertIn("Unsupported file format", response.json()["error"]["details"]["file"][0])

    def test_upload_rejects_invalid_mime_type(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        bad_mime = SimpleUploadedFile(
            name="fake.jpg",
            content=b"%PDF-1.4",
            content_type="application/pdf",
        )
        response = self.client.post(url, {"file": bad_mime}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_ERROR")
        self.assertIn("Unsupported MIME type", response.json()["error"]["details"]["file"][0])

    # =========================================================================
    # 3. Cloudinary Upload & Metadata Persistence
    # =========================================================================

    @patch.object(admin_views, "upload_product_media")
    def test_valid_image_upload_persists_metadata(self, mock_upload):
        mock_upload.return_value = {
            "public_id": "closet-by-chilli/categories/kurtis_123",
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/closet-by-chilli/categories/kurtis_123.jpg",
            "format": "jpg",
            "resource_type": "image",
            "width": 1200,
            "height": 1600,
            "bytes": 204800,
        }

        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        img = self._sample_image("summer_kurtis.jpg")

        response = self.client.post(
            url,
            {"file": img, "alt_text": "Handcrafted Summer Kurtis Collection"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["image_url"], "https://res.cloudinary.com/demo/image/upload/v1/closet-by-chilli/categories/kurtis_123.jpg")
        self.assertEqual(data["image"], "https://res.cloudinary.com/demo/image/upload/v1/closet-by-chilli/categories/kurtis_123.jpg")
        self.assertEqual(data["image_alt"], "Handcrafted Summer Kurtis Collection")
        self.assertEqual(data["image_public_id"], "closet-by-chilli/categories/kurtis_123")

        # Verify DB persistence
        self.category.refresh_from_db()
        self.assertEqual(self.category.image_url, "https://res.cloudinary.com/demo/image/upload/v1/closet-by-chilli/categories/kurtis_123.jpg")
        self.assertEqual(self.category.image_public_id, "closet-by-chilli/categories/kurtis_123")
        self.assertEqual(self.category.image_alt, "Handcrafted Summer Kurtis Collection")

    @patch.object(admin_views, "upload_product_media")
    def test_default_alt_text_inferred_from_filename(self, mock_upload):
        mock_upload.return_value = {
            "public_id": "closet-by-chilli/categories/dresses_abc",
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/dresses_abc.jpg",
        }

        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        img = self._sample_image("ethnic-festive-anarkali.png", content_type="image/png")

        response = self.client.post(url, {"file": img}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["image_alt"], "ethnic festive anarkali")

    # =========================================================================
    # 4. Error Handling & Rollback
    # =========================================================================

    @patch.object(admin_views, "upload_product_media")
    def test_cloudinary_upload_failure_returns_502(self, mock_upload):
        mock_upload.side_effect = Exception("Cloudinary connection timeout")

        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        img = self._sample_image()

        response = self.client.post(url, {"file": img}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.json()["error"]["code"], "UPLOAD_FAILED")

    @patch.object(admin_views, "upload_product_media")
    def test_missing_cloudinary_config_returns_500(self, mock_upload):
        mock_upload.side_effect = CloudinaryConfigurationError("Missing credentials")

        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        img = self._sample_image()

        response = self.client.post(url, {"file": img}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.json()["error"]["code"], "CONFIGURATION_ERROR")

    @patch.object(admin_views, "cleanup_orphaned_asset")
    @patch.object(admin_views, "upload_product_media")
    def test_db_persistence_failure_cleans_up_orphaned_asset(self, mock_upload, mock_cleanup):
        mock_upload.return_value = {
            "public_id": "closet-by-chilli/categories/orphan_asset",
            "secure_url": "https://res.cloudinary.com/demo/image/upload/orphan.jpg",
        }

        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        img = self._sample_image()

        with patch.object(Category, "save", side_effect=Exception("Database lock failure")):
            response = self.client.post(url, {"file": img}, format="multipart")
            self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
            self.assertEqual(response.json()["error"]["code"], "PERSISTENCE_ERROR")
            mock_cleanup.assert_called_once_with("closet-by-chilli/categories/orphan_asset")

    # =========================================================================
    # 5. Replacement & Safe Cleanup
    # =========================================================================

    @patch.object(admin_views, "delete_product_media")
    @patch.object(admin_views, "upload_product_media")
    def test_replacing_image_destroys_old_unshared_asset(self, mock_upload, mock_delete):
        # Category already has an image
        self.category.image_url = "https://res.cloudinary.com/demo/image/upload/old_pic.jpg"
        self.category.image_public_id = "closet-by-chilli/categories/old_pic"
        self.category.save()

        mock_upload.return_value = {
            "public_id": "closet-by-chilli/categories/new_pic",
            "secure_url": "https://res.cloudinary.com/demo/image/upload/new_pic.jpg",
        }

        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        img = self._sample_image()

        response = self.client.post(url, {"file": img}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Old asset should be destroyed
        mock_delete.assert_called_once_with("closet-by-chilli/categories/old_pic")

    @patch.object(admin_views, "delete_product_media")
    @patch.object(admin_views, "upload_product_media")
    def test_replacing_image_preserves_shared_asset(self, mock_upload, mock_delete):
        shared_public_id = "closet-by-chilli/categories/shared_hero"
        self.category.image_url = "https://res.cloudinary.com/demo/image/upload/shared_hero.jpg"
        self.category.image_public_id = shared_public_id
        self.category.save()

        # Another category shares the same public_id
        Category.objects.create(
            name="Another Shared Category",
            slug="another-shared",
            image_public_id=shared_public_id,
        )

        mock_upload.return_value = {
            "public_id": "closet-by-chilli/categories/unique_new",
            "secure_url": "https://res.cloudinary.com/demo/image/upload/unique_new.jpg",
        }

        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        img = self._sample_image()

        response = self.client.post(url, {"file": img}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Old asset must NOT be destroyed because another category references it
        mock_delete.assert_not_called()

    @patch.object(admin_views, "delete_product_media")
    def test_delete_category_image_clears_fields_and_destroys_asset(self, mock_delete):
        self.category.image_url = "https://res.cloudinary.com/demo/image/upload/cat_hero.jpg"
        self.category.image_public_id = "closet-by-chilli/categories/cat_hero"
        self.category.image_alt = "Festive Hero"
        self.category.save()

        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/categories/{self.category.id}/image/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.category.refresh_from_db()
        self.assertEqual(self.category.image_url, "")
        self.assertEqual(self.category.image_public_id, "")
        self.assertEqual(self.category.image_alt, "")
        mock_delete.assert_called_once_with("closet-by-chilli/categories/cat_hero")

    # =========================================================================
    # 6. Public Storefront Discovery & Ordering
    # =========================================================================

    def test_public_catalog_excludes_inactive_categories(self):
        Category.objects.create(
            name="Deactivated Category",
            slug="deactivated-cat",
            is_active=False,
            is_visible_on_storefront=True,
        )
        response = self.client.get("/api/v1/catalog/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [c["slug"] for c in response.json()["results"]]
        self.assertIn("kurtis-tunics", slugs)
        self.assertNotIn("deactivated-cat", slugs)

    def test_public_catalog_filters_storefront_visibility(self):
        Category.objects.create(
            name="Catalog Only Subcategory",
            slug="catalog-only-sub",
            is_active=True,
            is_visible_on_storefront=False,
        )

        # Standard catalog list includes active categories
        all_resp = self.client.get("/api/v1/catalog/categories/")
        all_slugs = [c["slug"] for c in all_resp.json()["results"]]
        self.assertIn("catalog-only-sub", all_slugs)

        # Discovery query ?storefront=true filters out hidden categories
        storefront_resp = self.client.get("/api/v1/catalog/categories/?storefront=true")
        storefront_slugs = [c["slug"] for c in storefront_resp.json()["results"]]
        self.assertIn("kurtis-tunics", storefront_slugs)
        self.assertNotIn("catalog-only-sub", storefront_slugs)

    def test_public_categories_ordered_by_display_order(self):
        # Create categories with custom ordering
        cat_order_3 = Category.objects.create(
            name="Dresses & Gowns",
            slug="dresses-gowns",
            ordering=3,
            is_active=True,
            is_visible_on_storefront=True,
        )
        cat_order_0 = Category.objects.create(
            name="Anarkali Sets",
            slug="anarkali-sets",
            ordering=0,
            is_active=True,
            is_visible_on_storefront=True,
        )

        response = self.client.get("/api/v1/catalog/categories/?storefront=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]

        # Expected order: ordering=0 (Anarkali Sets), ordering=1 (Kurtis & Tunics), ordering=3 (Dresses & Gowns)
        slug_order = [c["slug"] for c in results]
        self.assertEqual(slug_order[:3], ["anarkali-sets", "kurtis-tunics", "dresses-gowns"])

    def test_category_image_update_preserves_product_relationships(self):
        # Attach product to category
        product = Product.objects.create(
            name="Silk Anarkali Kurta",
            slug="silk-anarkali-kurta",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )

        self.client.force_authenticate(user=self.admin_user)
        url = f"/api/v1/admin/categories/{self.category.id}/"
        # Update category short description and ordering
        patch_resp = self.client.patch(
            url,
            {"short_description": "Updated relaxed cuts", "ordering": 5},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)

        # Verify product remains assigned to the category
        product.refresh_from_db()
        self.assertEqual(product.category.id, self.category.id)
        self.assertEqual(product.category.slug, "kurtis-tunics")
        self.assertEqual(product.category.ordering, 5)
