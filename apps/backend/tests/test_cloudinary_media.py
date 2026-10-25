"""
Tests for Cloudinary Product Media Integration (Sprint A2.4).

Covers:
1. Authentication & Authorization:
   - 401 Unauthorized for anonymous uploads and image mutations.
   - 403 Forbidden for customer and staff users.
   - 200/201 OK for admin users.
2. File Validation:
   - Rejection of disallowed file extensions (e.g., .exe, .pdf, .txt).
   - Rejection of disallowed MIME types.
   - Rejection of oversized files (>5MB limit).
3. Cloudinary Upload & Metadata Persistence:
   - Valid direct upload via multipart form-data.
   - Correct extraction and persistence of public_id, secure_url, format, dimensions, bytes.
   - Auto-assignment of primary flag to the first image.
4. Error Handling & Cleanup Lifecycle:
   - Cloudinary upload failure (returns 502 with error message).
   - Missing Cloudinary credentials (returns 500 configuration error).
   - Database persistence failure after upload -> invokes cleanup_orphaned_asset to destroy orphaned Cloudinary asset.
5. Image Management & Primary Image Constraint:
   - Promoting a second image to primary demotes the first image.
   - Reordering images via ID list and via list of {id, ordering} objects.
   - Reordering prevents constraint collisions.
6. Safe Deletion & Cross-Product Security:
   - Deleting an image destroys the Cloudinary asset when not referenced elsewhere.
   - Deleting an image skips Cloudinary asset destruction if the same public_id is referenced by another record.
   - Promoting the next image to primary when the primary image is deleted.
   - Cross-product isolation: modifying or deleting an image using another product's URL path returns 404.
"""

import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.catalog.cloudinary_service import (
    CloudinaryConfigurationError,
    cleanup_orphaned_asset,
    delete_product_media,
    is_cloudinary_configured,
    upload_product_media,
    validate_cloudinary_configuration,
)
from apps.catalog.models import Category, Product, ProductImage, ProductVariant


class CloudinaryMediaServiceUnitTests(TestCase):
    """Unit tests for the Cloudinary service functions."""

    @override_settings(
        CLOUDINARY_CLOUD_NAME="",
        CLOUDINARY_API_KEY="",
        CLOUDINARY_API_SECRET="",
        CLOUDINARY_URL="",
    )
    def test_missing_configuration_raises_error(self):
        self.assertFalse(is_cloudinary_configured())
        with self.assertRaises(CloudinaryConfigurationError) as ctx:
            validate_cloudinary_configuration()
        self.assertIn("Cloudinary configuration is missing", str(ctx.exception))

        dummy_file = SimpleUploadedFile("test.jpg", b"dummy bytes", content_type="image/jpeg")
        with self.assertRaises(CloudinaryConfigurationError):
            upload_product_media(dummy_file)

        with self.assertRaises(CloudinaryConfigurationError):
            delete_product_media("some_public_id")

    @override_settings(
        CLOUDINARY_CLOUD_NAME="demo_cloud",
        CLOUDINARY_API_KEY="123456",
        CLOUDINARY_API_SECRET="secret789",
        CLOUDINARY_FOLDER="closet-by-chilli/products",
    )
    @patch("cloudinary.uploader.upload")
    def test_upload_product_media_success(self, mock_upload):
        mock_upload.return_value = {
            "public_id": "closet-by-chilli/products/sample_img_123",
            "secure_url": "https://res.cloudinary.com/demo_cloud/image/upload/v1/closet-by-chilli/products/sample_img_123.jpg",
            "url": "http://res.cloudinary.com/demo_cloud/image/upload/v1/closet-by-chilli/products/sample_img_123.jpg",
            "format": "jpg",
            "resource_type": "image",
            "width": 1000,
            "height": 1400,
            "bytes": 54321,
            "created_at": "2026-10-18T10:00:00Z",
        }

        dummy_file = SimpleUploadedFile("sample.jpg", b"image-content", content_type="image/jpeg")
        result = upload_product_media(dummy_file)

        self.assertEqual(result["public_id"], "closet-by-chilli/products/sample_img_123")
        self.assertTrue(result["secure_url"].startswith("https://"))
        self.assertEqual(result["format"], "jpg")
        self.assertEqual(result["width"], 1000)
        self.assertEqual(result["height"], 1400)
        self.assertEqual(result["bytes"], 54321)

    @override_settings(
        CLOUDINARY_CLOUD_NAME="demo_cloud",
        CLOUDINARY_API_KEY="123456",
        CLOUDINARY_API_SECRET="secret789",
    )
    @patch("cloudinary.uploader.destroy")
    def test_delete_product_media_success(self, mock_destroy):
        mock_destroy.return_value = {"result": "ok"}
        res = delete_product_media("closet-by-chilli/products/sample_img_123")
        self.assertEqual(res["result"], "ok")
        mock_destroy.assert_called_once_with(
            "closet-by-chilli/products/sample_img_123",
            resource_type="image",
            invalidate=True,
        )

    @patch("apps.catalog.cloudinary_service.delete_product_media")
    def test_cleanup_orphaned_asset_swallows_exception(self, mock_delete):
        mock_delete.side_effect = Exception("Cloudinary connection reset")
        # Should not raise exception
        cleanup_orphaned_asset("orphaned_id_123")
        mock_delete.assert_called_once_with("orphaned_id_123")


class AdminCloudinaryIntegrationApiTests(TestCase):
    """End-to-end API tests for Cloudinary media upload and management endpoints."""

    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )

        # Staff user
        self.staff_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="staff@closetbychilli.com",
            role=User.Role.STAFF,
            is_active=True,
        )

        # Customer user
        self.customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="customer@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )

        self.category = Category.objects.create(name="Kurtis", slug="kurtis")
        self.product = Product.objects.create(
            name="Jaipuri Hand-Block Kurti",
            slug="jaipuri-hand-block-kurti",
            category=self.category,
            status=Product.Status.ACTIVE,
        )
        self.other_product = Product.objects.create(
            name="Anarkali Gown",
            slug="anarkali-gown",
            category=self.category,
            status=Product.Status.ACTIVE,
        )

    # 1. Authorization
    def test_unauthorized_upload_and_management_rejected(self):
        file = SimpleUploadedFile("look.jpg", b"bytes", content_type="image/jpeg")

        # Anonymous upload
        res = self.client.post("/api/v1/admin/media/upload/", {"file": file}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Anonymous product image creation
        res = self.client.post(
            f"/api/v1/admin/products/{self.product.id}/images/",
            {"file": file},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer upload
        self.client.force_authenticate(user=self.customer)
        res = self.client.post("/api/v1/admin/media/upload/", {"file": file}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Staff upload
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.post("/api/v1/admin/media/upload/", {"file": file}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # 2. File Validation
    def test_invalid_file_extension_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        bad_file = SimpleUploadedFile("malicious.exe", b"MZ...", content_type="application/octet-stream")
        res = self.client.post(
            f"/api/v1/admin/products/{self.product.id}/images/",
            {"file": bad_file},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", res.json()["error"]["details"])

    def test_invalid_mime_type_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        pdf_file = SimpleUploadedFile("doc.pdf", b"%PDF-1.4", content_type="application/pdf")
        res = self.client.post(
            f"/api/v1/admin/products/{self.product.id}/images/",
            {"file": pdf_file},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_file_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        oversized = SimpleUploadedFile(
            "large.jpg",
            b"0" * (5 * 1024 * 1024 + 100),
            content_type="image/jpeg",
        )
        res = self.client.post(
            f"/api/v1/admin/products/{self.product.id}/images/",
            {"file": oversized},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # 3. Direct Multipart Product Image Upload & Metadata Persistence
    @patch("apps.catalog.admin_views.upload_product_media")
    def test_valid_product_image_upload_and_persistence(self, mock_upload):
        mock_upload.return_value = {
            "public_id": "closet-by-chilli/products/kurti_front_123",
            "secure_url": "https://res.cloudinary.com/test-cloud/image/upload/v1/closet-by-chilli/products/kurti_front_123.jpg",
            "format": "jpg",
            "resource_type": "image",
            "width": 1200,
            "height": 1600,
            "bytes": 102400,
        }

        self.client.force_authenticate(user=self.admin_user)
        file = SimpleUploadedFile("kurti_front.jpg", b"img-bytes", content_type="image/jpeg")
        res = self.client.post(
            f"/api/v1/admin/products/{self.product.id}/images/",
            {"file": file, "alt_text": "Kurti front look"},
            format="multipart",
        )

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertEqual(data["image_url"], "https://res.cloudinary.com/test-cloud/image/upload/v1/closet-by-chilli/products/kurti_front_123.jpg")
        self.assertEqual(data["public_id"], "closet-by-chilli/products/kurti_front_123")
        self.assertEqual(data["alt_text"], "Kurti front look")
        self.assertTrue(data["is_primary"])  # First image must be primary
        self.assertEqual(data["ordering"], 0)
        self.assertEqual(data["width"], 1200)
        self.assertEqual(data["height"], 1600)
        self.assertEqual(data["format"], "jpg")

        # Verify DB record
        db_img = ProductImage.objects.get(id=data["id"])
        self.assertEqual(db_img.public_id, "closet-by-chilli/products/kurti_front_123")
        self.assertTrue(db_img.is_primary)
        self.assertEqual(db_img.bytes, 102400)

    # 4. Cloudinary Upload Failure
    @patch("apps.catalog.admin_views.upload_product_media")
    def test_cloudinary_upload_failure_returns_502(self, mock_upload):
        mock_upload.side_effect = Exception("Cloudinary connection timed out")
        self.client.force_authenticate(user=self.admin_user)
        file = SimpleUploadedFile("kurti.png", b"png-bytes", content_type="image/png")

        res = self.client.post(
            f"/api/v1/admin/products/{self.product.id}/images/",
            {"file": file},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(res.json()["error"]["code"], "UPLOAD_FAILED")
        self.assertEqual(ProductImage.objects.filter(product=self.product).count(), 0)

    # 5. DB Persistence Failure triggers Orphan Asset Cleanup
    @patch("apps.catalog.admin_views.cleanup_orphaned_asset")
    @patch("apps.catalog.admin_views.AdminProductImageSerializer.save")
    @patch("apps.catalog.admin_views.upload_product_media")
    def test_db_persistence_failure_cleans_up_orphaned_asset(
        self, mock_upload, mock_save, mock_cleanup
    ):
        mock_upload.return_value = {
            "public_id": "closet-by-chilli/products/orphan_asset_777",
            "secure_url": "https://res.cloudinary.com/test-cloud/image/upload/v1/orphan_asset_777.jpg",
            "format": "jpg",
            "resource_type": "image",
            "width": 800,
            "height": 1000,
            "bytes": 50000,
        }
        mock_save.side_effect = Exception("Database constraint violation")

        self.client.force_authenticate(user=self.admin_user)
        file = SimpleUploadedFile("photo.jpg", b"photo-bytes", content_type="image/jpeg")

        res = self.client.post(
            f"/api/v1/admin/products/{self.product.id}/images/",
            {"file": file},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(res.json()["error"]["code"], "PERSISTENCE_ERROR")
        # Verify cleanup was triggered with the uploaded public_id
        mock_cleanup.assert_called_once_with("closet-by-chilli/products/orphan_asset_777")

    # 6. Primary Image Promotion and Ordering Constraints
    def test_primary_image_promotion_and_reordering(self):
        self.client.force_authenticate(user=self.admin_user)

        # Image 1
        img1 = ProductImage.objects.create(
            product=self.product,
            image_url="https://res.cloudinary.com/test/img1.jpg",
            public_id="products/img1",
            is_primary=True,
            ordering=0,
        )

        # Image 2
        img2 = ProductImage.objects.create(
            product=self.product,
            image_url="https://res.cloudinary.com/test/img2.jpg",
            public_id="products/img2",
            is_primary=False,
            ordering=1,
        )

        # Patch img2 to is_primary = True
        res = self.client.patch(
            f"/api/v1/admin/products/{self.product.id}/images/{img2.id}/",
            {"is_primary": True},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.json()["is_primary"])

        img1.refresh_from_db()
        img2.refresh_from_db()
        self.assertFalse(img1.is_primary)
        self.assertTrue(img2.is_primary)

        # Reorder images via {"images": [{"id": ..., "ordering": ...}]} format
        res_reorder = self.client.post(
            f"/api/v1/admin/products/{self.product.id}/images/reorder/",
            {"images": [{"id": str(img2.id), "ordering": 0}, {"id": str(img1.id), "ordering": 1}]},
            format="json",
        )
        self.assertEqual(res_reorder.status_code, status.HTTP_200_OK)
        reordered = res_reorder.json()
        self.assertEqual(reordered[0]["id"], str(img2.id))
        self.assertEqual(reordered[0]["ordering"], 0)
        self.assertEqual(reordered[1]["id"], str(img1.id))
        self.assertEqual(reordered[1]["ordering"], 1)

    # 7. Safe Deletion & Coordinated Lifecycle
    @patch("apps.catalog.admin_views.delete_product_media")
    def test_image_deletion_and_cloudinary_cleanup(self, mock_delete_media):
        self.client.force_authenticate(user=self.admin_user)

        img1 = ProductImage.objects.create(
            product=self.product,
            image_url="https://res.cloudinary.com/test/img1.jpg",
            public_id="products/asset_unique_1",
            is_primary=True,
            ordering=0,
        )
        img2 = ProductImage.objects.create(
            product=self.product,
            image_url="https://res.cloudinary.com/test/img2.jpg",
            public_id="products/asset_unique_2",
            is_primary=False,
            ordering=1,
        )

        # Delete img1 (primary)
        res = self.client.delete(f"/api/v1/admin/products/{self.product.id}/images/{img1.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Asset destruction was requested for unique public_id
        mock_delete_media.assert_called_once_with("products/asset_unique_1")

        # Img2 promoted to primary
        img2.refresh_from_db()
        self.assertTrue(img2.is_primary)

    @patch("apps.catalog.admin_views.delete_product_media")
    def test_image_deletion_skips_asset_destroy_when_shared(self, mock_delete_media):
        self.client.force_authenticate(user=self.admin_user)

        # Two products share the same public_id
        img1 = ProductImage.objects.create(
            product=self.product,
            image_url="https://res.cloudinary.com/test/shared.jpg",
            public_id="products/shared_asset",
            is_primary=True,
            ordering=0,
        )
        ProductImage.objects.create(
            product=self.other_product,
            image_url="https://res.cloudinary.com/test/shared.jpg",
            public_id="products/shared_asset",
            is_primary=True,
            ordering=0,
        )

        # Delete img1 from self.product
        res = self.client.delete(f"/api/v1/admin/products/{self.product.id}/images/{img1.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Because other_product still references "products/shared_asset", Cloudinary destroy should NOT be called
        mock_delete_media.assert_not_called()

    # 8. Cross-Product Image Access Rejection
    def test_cross_product_image_access_rejected(self):
        self.client.force_authenticate(user=self.admin_user)

        other_img = ProductImage.objects.create(
            product=self.other_product,
            image_url="https://res.cloudinary.com/test/other.jpg",
            public_id="products/other",
            is_primary=True,
            ordering=0,
        )

        # Try to modify other_product's image through self.product's route
        res = self.client.patch(
            f"/api/v1/admin/products/{self.product.id}/images/{other_img.id}/",
            {"alt_text": "Hacked"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Try to delete other_product's image through self.product's route
        res_del = self.client.delete(
            f"/api/v1/admin/products/{self.product.id}/images/{other_img.id}/"
        )
        self.assertEqual(res_del.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(ProductImage.objects.filter(id=other_img.id).exists())

        # Try to reorder with an image belonging to another product
        res_reorder = self.client.post(
            f"/api/v1/admin/products/{self.product.id}/images/reorder/",
            {"image_ids": [str(other_img.id)]},
            format="json",
        )
        self.assertEqual(res_reorder.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("image_ids", res_reorder.json()["error"]["details"])
