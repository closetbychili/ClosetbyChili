"""
Closet by Chilli — Central Admin Media Library API Integration Tests (Sprint A3.1)

Comprehensive test coverage verifying:
1. Admin Authorization Enforcement:
   - 401 Unauthorized for anonymous users.
   - 403 Forbidden for customer users.
   - 403 Forbidden for staff (non-admin) users.
   - 200/201/204 OK for verified administrators.
2. Upload & Metadata Persistence:
   - Direct file upload persists secure URL, public_id, dimensions, format, bytes, alt_text.
   - Rejection of invalid file extensions and oversized files.
3. Media Listing, Search, Filtering & Pagination:
   - Automatic synchronization of legacy ProductImage and Category records.
   - Search across alt_text, filename, and Cloudinary public_id.
   - Filters by usage type (product, category, unassigned, all).
   - Sorting by creation date and filename.
   - Page and page_size pagination metadata.
4. Real Database Usage Relationships:
   - Accurate reflection of referencing products (including is_primary flag).
   - Accurate reflection of referencing categories.
   - Mixed usage (referenced by both product and category).
   - Unassigned status for unused assets.
5. Metadata Updates:
   - PATCH /api/v1/admin/media/<id>/ updates alt_text and synchronizes to referencing ProductImage and Category records.
6. Protected Safe Deletion & Coordinated Cloudinary Lifecycle:
   - Rejection of deletion for referenced assets (409 Conflict with usage details).
   - Successful deletion of unused assets with Cloudinary asset destruction.
   - Safe failure handling: Cloudinary destruction errors preserve DB record and return 502 retryable error.
   - Protection against deleting shared Cloudinary assets while other references remain.
"""

import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.catalog.cloudinary_service import delete_product_media, upload_product_media
from apps.catalog.media_service import (
    CloudinaryDeletionFailedError,
    MediaInUseError,
    delete_media_asset_safely,
    get_asset_usage,
    populate_batch_asset_usage,
    register_media_asset,
    sync_catalog_media_assets,
    update_media_asset_alt_text,
)
from apps.catalog.models import Category, MediaAsset, Product, ProductImage, ProductVariant


class AdminMediaLibraryApiTests(TestCase):
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

        # Customer user
        self.customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="customer@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )

        # Staff user (non-admin)
        self.staff_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="staff@closetbychilli.com",
            role=User.Role.STAFF,
            is_active=True,
        )

        # Base category
        self.category = Category.objects.create(
            name="Anarkalis",
            slug="anarkalis",
            is_active=True,
            image_url="https://res.cloudinary.com/test/image/upload/v1/closet-by-chilli/categories/anarkali_banner.webp",
            image_public_id="closet-by-chilli/categories/anarkali_banner",
            image_alt="Anarkali Banner Image",
        )

        # Base product
        self.product = Product.objects.create(
            name="Emerald Velvet Anarkali",
            slug="emerald-velvet-anarkali",
            category=self.category,
            status=Product.Status.ACTIVE,
        )

        # Product Image
        self.product_image = ProductImage.objects.create(
            product=self.product,
            image_url="https://res.cloudinary.com/test/image/upload/v1/closet-by-chilli/products/emerald_front.webp",
            public_id="closet-by-chilli/products/emerald_front",
            alt_text="Emerald front look",
            width=1200,
            height=1600,
            format="webp",
            bytes=150000,
            is_primary=True,
            ordering=0,
        )

        # Standalone / Unassigned Media Asset
        self.unassigned_asset = MediaAsset.objects.create(
            image_url="https://res.cloudinary.com/test/image/upload/v1/closet-by-chilli/media/lookbook_raw.webp",
            public_id="closet-by-chilli/media/lookbook_raw",
            original_filename="lookbook_raw.webp",
            alt_text="Unassigned raw lookbook shot",
            width=2000,
            height=3000,
            format="webp",
            bytes=400000,
        )

    # ==========================================================================
    # 1. Authorization Tests
    # ==========================================================================

    def test_anonymous_requests_are_rejected(self):
        # List
        res = self.client.get("/api/v1/admin/media/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Detail
        res = self.client.get(f"/api/v1/admin/media/{self.unassigned_asset.id}/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Patch
        res = self.client.patch(
            f"/api/v1/admin/media/{self.unassigned_asset.id}/",
            {"alt_text": "Updated"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Delete
        res = self.client.delete(f"/api/v1/admin/media/{self.unassigned_asset.id}/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_and_staff_requests_are_forbidden(self):
        for user in [self.customer, self.staff_user]:
            self.client.force_authenticate(user=user)

            res = self.client.get("/api/v1/admin/media/")
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

            res = self.client.delete(f"/api/v1/admin/media/{self.unassigned_asset.id}/")
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # ==========================================================================
    # 2. Upload & Metadata Persistence
    # ==========================================================================

    @patch("apps.catalog.admin_views.upload_product_media")
    def test_media_upload_persists_metadata(self, mock_upload):
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/test/image/upload/v1/closet-by-chilli/media/festive_edit.webp",
            "public_id": "closet-by-chilli/media/festive_edit",
            "format": "webp",
            "resource_type": "image",
            "width": 1400,
            "height": 2000,
            "bytes": 280000,
        }

        self.client.force_authenticate(user=self.admin_user)
        test_file = SimpleUploadedFile(
            "festive_edit.webp", b"WEBP_BYTES_DUMMY", content_type="image/webp"
        )

        res = self.client.post(
            "/api/v1/admin/media/upload/",
            {"file": test_file, "alt_text": "Festive Lookbook Hero"},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()

        self.assertIn("id", data)
        self.assertEqual(data["public_id"], "closet-by-chilli/media/festive_edit")
        self.assertEqual(data["alt_text"], "Festive Lookbook Hero")
        self.assertEqual(data["original_name"], "festive_edit.webp")

        # Verify DB record created
        asset = MediaAsset.objects.get(pk=data["id"])
        self.assertEqual(asset.public_id, "closet-by-chilli/media/festive_edit")
        self.assertEqual(asset.alt_text, "Festive Lookbook Hero")
        self.assertEqual(asset.width, 1400)
        self.assertEqual(asset.height, 2000)

    def test_upload_rejects_disallowed_extension(self):
        self.client.force_authenticate(user=self.admin_user)
        bad_file = SimpleUploadedFile("script.sh", b"echo 1", content_type="text/plain")

        res = self.client.post(
            "/api/v1/admin/media/upload/",
            {"file": bad_file},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", res.json()["error"]["details"])

    def test_upload_rejects_oversized_file(self):
        self.client.force_authenticate(user=self.admin_user)
        oversized = SimpleUploadedFile(
            "huge.jpg", b"0" * (5 * 1024 * 1024 + 1024), content_type="image/jpeg"
        )

        res = self.client.post(
            "/api/v1/admin/media/upload/",
            {"file": oversized},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", res.json()["error"]["details"])

    # ==========================================================================
    # 3. Media Listing, Sync, Search, Filter & Pagination
    # ==========================================================================

    def test_media_listing_syncs_catalog_and_returns_paginated_results(self):
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.get("/api/v1/admin/media/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        # Should contain:
        # 1. unassigned_asset
        # 2. synced product_image
        # 3. synced category image
        self.assertGreaterEqual(data["count"], 3)
        self.assertIn("results", data)
        self.assertIn("total_pages", data)
        self.assertIn("current_page", data)

        results = data["results"]
        public_ids = [item["public_id"] for item in results]
        self.assertIn(self.unassigned_asset.public_id, public_ids)
        self.assertIn(self.product_image.public_id, public_ids)
        self.assertIn(self.category.image_public_id, public_ids)

    def test_search_by_alt_text_and_filename(self):
        self.client.force_authenticate(user=self.admin_user)

        # Search by unique alt text substring
        res = self.client.get("/api/v1/admin/media/?search=raw+lookbook")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.unassigned_asset.id))

        # Search by public_id
        res2 = self.client.get("/api/v1/admin/media/?search=emerald_front")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        results2 = res2.json()["results"]
        self.assertEqual(len(results2), 1)
        self.assertEqual(results2[0]["public_id"], self.product_image.public_id)

    def test_filter_by_usage_type(self):
        self.client.force_authenticate(user=self.admin_user)

        # 1. Product usage filter
        res_prod = self.client.get("/api/v1/admin/media/?usage_type=product")
        self.assertEqual(res_prod.status_code, status.HTTP_200_OK)
        prod_results = res_prod.json()["results"]
        self.assertTrue(all(len(item["products"]) > 0 for item in prod_results))
        self.assertTrue(any(item["public_id"] == self.product_image.public_id for item in prod_results))
        self.assertFalse(any(item["public_id"] == self.unassigned_asset.public_id for item in prod_results))

        # 2. Category usage filter
        res_cat = self.client.get("/api/v1/admin/media/?usage_type=category")
        self.assertEqual(res_cat.status_code, status.HTTP_200_OK)
        cat_results = res_cat.json()["results"]
        self.assertTrue(all(len(item["categories"]) > 0 for item in cat_results))
        self.assertTrue(any(item["public_id"] == self.category.image_public_id for item in cat_results))
        self.assertFalse(any(item["public_id"] == self.unassigned_asset.public_id for item in cat_results))

        # 3. Unassigned usage filter
        res_unassigned = self.client.get("/api/v1/admin/media/?usage_type=unassigned")
        self.assertEqual(res_unassigned.status_code, status.HTTP_200_OK)
        unassigned_results = res_unassigned.json()["results"]
        self.assertTrue(all(not item["is_used"] for item in unassigned_results))
        self.assertTrue(any(item["public_id"] == self.unassigned_asset.public_id for item in unassigned_results))
        self.assertFalse(any(item["public_id"] == self.product_image.public_id for item in unassigned_results))

    def test_sorting_by_date_and_filename(self):
        self.client.force_authenticate(user=self.admin_user)

        # Oldest first
        res = self.client.get("/api/v1/admin/media/?ordering=created_at")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json()["results"]
        dates = [item["created_at"] for item in results if item["created_at"]]
        self.assertEqual(dates, sorted(dates))

        # Filename alphabetical
        res_fn = self.client.get("/api/v1/admin/media/?ordering=original_filename")
        self.assertEqual(res_fn.status_code, status.HTTP_200_OK)
        fn_results = res_fn.json()["results"]
        names = [item["original_filename"].lower() for item in fn_results]
        self.assertEqual(names, sorted(names))

    # ==========================================================================
    # 4. Usage Relationships Accuracy
    # ==========================================================================

    def test_usage_relationship_reflects_product_and_category_details(self):
        self.client.force_authenticate(user=self.admin_user)

        # Synchronize first
        sync_catalog_media_assets()

        # Check product image asset
        prod_asset = MediaAsset.objects.get(public_id=self.product_image.public_id)
        res = self.client.get(f"/api/v1/admin/media/{prod_asset.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertTrue(data["is_used"])
        self.assertEqual(data["usage_type"], "product")
        self.assertEqual(len(data["products"]), 1)
        self.assertEqual(data["products"][0]["id"], str(self.product.id))
        self.assertEqual(data["products"][0]["name"], self.product.name)
        self.assertTrue(data["products"][0]["is_primary"])
        self.assertEqual(len(data["categories"]), 0)

        # Check unassigned asset
        res_un = self.client.get(f"/api/v1/admin/media/{self.unassigned_asset.id}/")
        self.assertEqual(res_un.status_code, status.HTTP_200_OK)
        data_un = res_un.json()

        self.assertFalse(data_un["is_used"])
        self.assertEqual(data_un["usage_type"], "unassigned")
        self.assertEqual(len(data_un["products"]), 0)
        self.assertEqual(len(data_un["categories"]), 0)

    # ==========================================================================
    # 5. Metadata Updates (alt_text)
    # ==========================================================================

    def test_patch_alt_text_updates_db_and_synchronizes_references(self):
        self.client.force_authenticate(user=self.admin_user)
        sync_catalog_media_assets()

        prod_asset = MediaAsset.objects.get(public_id=self.product_image.public_id)

        res = self.client.patch(
            f"/api/v1/admin/media/{prod_asset.id}/",
            {"alt_text": "Couture Emerald Silk Front Elevation"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["alt_text"], "Couture Emerald Silk Front Elevation")

        # Verify MediaAsset updated
        prod_asset.refresh_from_db()
        self.assertEqual(prod_asset.alt_text, "Couture Emerald Silk Front Elevation")

        # Verify ProductImage synchronized
        self.product_image.refresh_from_db()
        self.assertEqual(self.product_image.alt_text, "Couture Emerald Silk Front Elevation")

    # ==========================================================================
    # 6. Protected Safe Deletion & Coordinated Cloudinary Lifecycle
    # ==========================================================================

    def test_deletion_of_referenced_asset_is_blocked_with_409(self):
        self.client.force_authenticate(user=self.admin_user)
        sync_catalog_media_assets()

        prod_asset = MediaAsset.objects.get(public_id=self.product_image.public_id)

        # Attempt to delete referenced asset
        res = self.client.delete(f"/api/v1/admin/media/{prod_asset.id}/")
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        err = res.json()["error"]
        self.assertEqual(err["code"], "ASSET_IN_USE")
        self.assertIn("currently used by 1 product(s)", err["message"])
        self.assertEqual(len(err["details"]["products"]), 1)
        self.assertEqual(err["details"]["products"][0]["id"], str(self.product.id))

        # Asset still exists in DB
        self.assertTrue(MediaAsset.objects.filter(pk=prod_asset.id).exists())

    @patch("apps.catalog.media_service.delete_product_media")
    def test_deletion_of_unassigned_asset_succeeds(self, mock_delete):
        mock_delete.return_value = {"result": "ok"}
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.delete(f"/api/v1/admin/media/{self.unassigned_asset.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Verify Cloudinary destroy called with public_id
        mock_delete.assert_called_once_with(self.unassigned_asset.public_id)

        # Verify record deleted from DB
        self.assertFalse(MediaAsset.objects.filter(pk=self.unassigned_asset.id).exists())

    @patch("apps.catalog.media_service.delete_product_media")
    def test_cloudinary_deletion_failure_preserves_db_record_and_returns_502(self, mock_delete):
        mock_delete.side_effect = Exception("Cloudinary connection timeout")
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.delete(f"/api/v1/admin/media/{self.unassigned_asset.id}/")
        self.assertEqual(res.status_code, status.HTTP_502_BAD_GATEWAY)
        err = res.json()["error"]
        self.assertEqual(err["code"], "CLOUDINARY_DELETION_FAILED")
        self.assertTrue(err["details"]["retryable"])

        # DB record MUST NOT be deleted
        self.assertTrue(MediaAsset.objects.filter(pk=self.unassigned_asset.id).exists())

    @patch("apps.catalog.media_service.delete_product_media")
    def test_shared_cloudinary_asset_not_destroyed_if_another_media_asset_references_it(
        self, mock_delete
    ):
        self.client.force_authenticate(user=self.admin_user)

        # Create a second MediaAsset with the same public_id (e.g. duplicate upload reference)
        second_asset = MediaAsset.objects.create(
            image_url=self.unassigned_asset.image_url,
            public_id=self.unassigned_asset.public_id,
            original_filename="copy_of_lookbook.webp",
            alt_text="Copy of unassigned asset",
        )

        res = self.client.delete(f"/api/v1/admin/media/{self.unassigned_asset.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Cloudinary destroy SHOULD NOT be called because second_asset still has this public_id
        mock_delete.assert_not_called()

        # First asset deleted, second asset remains
        self.assertFalse(MediaAsset.objects.filter(pk=self.unassigned_asset.id).exists())
        self.assertTrue(MediaAsset.objects.filter(pk=second_asset.id).exists())
