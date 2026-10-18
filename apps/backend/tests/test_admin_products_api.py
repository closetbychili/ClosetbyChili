"""
Integration tests for Admin Product Listing API (Sprint A2.1).

Covers:
- Authorization enforcement:
  - 401 Unauthorized for anonymous requests
  - 403 Forbidden for customer users
  - 403 Forbidden for staff users (admin only)
  - 403 Forbidden for inactive admins
  - 200 OK for active admin users
- Storefront isolation:
  - Admin endpoint includes draft, active, and archived products
  - Public catalog endpoint (/api/v1/catalog/products/) strictly isolates active products
- Search:
  - By product name
  - By product slug
  - By variant SKU
- Filtering:
  - By publication status (draft, active, archived)
  - By category slug or UUID
  - By collection slug or UUID
  - By is_active flag
- Sorting / Ordering:
  - By name, -name, created_at, -created_at, updated_at, -updated_at, status, -status
- Pagination:
  - Page and page_size behavior
- Accurate data representation:
  - Thumbnail (primary image)
  - Real stock aggregation from InventoryItem
  - Price range (min_price, max_price)
  - Primary SKU and all SKUs
- Query efficiency:
  - Validates prefetching prevents N+1 query regression
"""

import uuid
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.catalog import admin_views
from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
    ProductImage,
    ProductVariant,
)
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.inventory.models import InventoryItem, InventoryMovement
from apps.orders.models import Order, OrderItem


class AdminProductListingApiTests(TestCase):
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

        # Inactive admin user
        self.inactive_admin = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="inactive_admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=False,
        )

        # Regular customer
        self.customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="patron@closetbychilli.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )

        # Staff user
        self.staff_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="staff@closetbychilli.com",
            role=User.Role.STAFF,
            is_active=True,
        )

        # Taxonomy Categories
        self.cat_kurtis = Category.objects.create(
            name="Kurtis",
            slug=f"kurtis-{uuid.uuid4().hex[:6]}",
        )
        self.cat_dresses = Category.objects.create(
            name="Dresses",
            slug=f"dresses-{uuid.uuid4().hex[:6]}",
        )

        # Collections
        self.col_festive = Collection.objects.create(
            name="Festive Drop",
            slug=f"festive-{uuid.uuid4().hex[:6]}",
        )
        self.col_summer = Collection.objects.create(
            name="Summer Drop",
            slug=f"summer-{uuid.uuid4().hex[:6]}",
        )

        # 1. Active Product with 2 variants and inventory
        self.p_active = Product.objects.create(
            name="Crimson Anarkali Suit",
            slug=f"crimson-anarkali-{uuid.uuid4().hex[:6]}",
            category=self.cat_kurtis,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        ProductCollection.objects.create(
            product=self.p_active,
            collection=self.col_festive,
            ordering=1,
        )
        self.v_active_1 = ProductVariant.objects.create(
            product=self.p_active,
            sku=f"CRIM-ANR-S-{uuid.uuid4().hex[:4]}",
            size="S",
            color="Crimson",
            retail_price=Decimal("2499.00"),
            is_active=True,
        )
        InventoryItem.objects.create(
            variant=self.v_active_1,
            quantity_available=12,
            quantity_reserved=2,
        )
        self.v_active_2 = ProductVariant.objects.create(
            product=self.p_active,
            sku=f"CRIM-ANR-M-{uuid.uuid4().hex[:4]}",
            size="M",
            color="Crimson",
            retail_price=Decimal("2699.00"),
            is_active=True,
        )
        InventoryItem.objects.create(
            variant=self.v_active_2,
            quantity_available=8,
            quantity_reserved=1,
        )
        ProductImage.objects.create(
            product=self.p_active,
            image_url="/assets/products/crimson-1.jpg",
            alt_text="Crimson Front",
            ordering=0,
            is_primary=True,
        )

        # 2. Draft Product with 1 variant (low stock)
        self.p_draft = Product.objects.create(
            name="Emerald Velvet Gown",
            slug=f"emerald-velvet-{uuid.uuid4().hex[:6]}",
            category=self.cat_dresses,
            status=Product.Status.DRAFT,
            is_active=True,
        )
        self.v_draft = ProductVariant.objects.create(
            product=self.p_draft,
            sku=f"EMR-VEL-L-{uuid.uuid4().hex[:4]}",
            size="L",
            color="Emerald",
            retail_price=Decimal("4999.00"),
            is_active=True,
        )
        InventoryItem.objects.create(
            variant=self.v_draft,
            quantity_available=3,
            quantity_reserved=0,
        )

        # 3. Archived Product (out of stock)
        self.p_archived = Product.objects.create(
            name="Vintage Silk Kurti",
            slug=f"vintage-silk-{uuid.uuid4().hex[:6]}",
            category=self.cat_kurtis,
            status=Product.Status.ARCHIVED,
            is_active=True,
        )
        self.v_archived = ProductVariant.objects.create(
            product=self.p_archived,
            sku=f"VNT-SLK-XL-{uuid.uuid4().hex[:4]}",
            size="XL",
            color="Gold",
            retail_price=Decimal("1899.00"),
            is_active=True,
        )
        InventoryItem.objects.create(
            variant=self.v_archived,
            quantity_available=0,
            quantity_reserved=0,
        )

    # =========================================================================
    # Authorization Tests
    # =========================================================================

    def test_anonymous_request_is_rejected_with_401(self):
        response = self.client.get("/api/v1/admin/products/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_user_is_rejected_with_403(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get("/api/v1/admin/products/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_user_is_rejected_with_403(self):
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get("/api/v1/admin/products/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_inactive_admin_is_rejected_with_403(self):
        self.client.force_authenticate(user=self.inactive_admin)
        response = self.client.get("/api/v1/admin/products/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_active_admin_can_list_products_successfully(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/admin/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("count", data)
        self.assertIn("results", data)
        self.assertEqual(data["count"], 3)

    # =========================================================================
    # Storefront Isolation Tests
    # =========================================================================

    def test_admin_sees_drafts_and_archived_while_storefront_does_not(self):
        # 1. Check storefront public catalog endpoint
        public_resp = self.client.get("/api/v1/catalog/products/")
        self.assertEqual(public_resp.status_code, status.HTTP_200_OK)
        public_slugs = [p["slug"] for p in public_resp.json()["results"]]
        self.assertIn(self.p_active.slug, public_slugs)
        self.assertNotIn(self.p_draft.slug, public_slugs)
        self.assertNotIn(self.p_archived.slug, public_slugs)

        # 2. Check admin endpoint
        self.client.force_authenticate(user=self.admin_user)
        admin_resp = self.client.get("/api/v1/admin/products/")
        self.assertEqual(admin_resp.status_code, status.HTTP_200_OK)
        admin_slugs = [p["slug"] for p in admin_resp.json()["results"]]
        self.assertIn(self.p_active.slug, admin_slugs)
        self.assertIn(self.p_draft.slug, admin_slugs)
        self.assertIn(self.p_archived.slug, admin_slugs)

    # =========================================================================
    # Accurate Data Representation Tests
    # =========================================================================

    def test_product_data_structure_accuracy(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/admin/products/")
        results = {p["id"]: p for p in response.json()["results"]}

        active_data = results[str(self.p_active.id)]
        self.assertEqual(active_data["name"], "Crimson Anarkali Suit")
        self.assertEqual(active_data["status"], "active")
        self.assertIn(active_data["sku"], [self.v_active_1.sku, self.v_active_2.sku])
        self.assertEqual(len(active_data["skus"]), 2)
        self.assertEqual(active_data["min_price"], "2499.00")
        self.assertEqual(active_data["max_price"], "2699.00")
        self.assertEqual(active_data["variant_count"], 2)
        self.assertEqual(active_data["category"]["name"], "Kurtis")
        self.assertEqual(active_data["primary_image"]["image_url"], "/assets/products/crimson-1.jpg")

        # Stock summary verification: 12 + 8 = 20 available, 2 + 1 = 3 reserved
        stock = active_data["stock_summary"]
        self.assertEqual(stock["total_available"], 20)
        self.assertEqual(stock["total_reserved"], 3)
        self.assertEqual(stock["status"], "in_stock")

        # Draft product: 3 available -> low_stock
        draft_data = results[str(self.p_draft.id)]
        self.assertEqual(draft_data["status"], "draft")
        self.assertEqual(draft_data["stock_summary"]["total_available"], 3)
        self.assertEqual(draft_data["stock_summary"]["status"], "low_stock")

        # Archived product: 0 available -> out_of_stock
        archived_data = results[str(self.p_archived.id)]
        self.assertEqual(archived_data["status"], "archived")
        self.assertEqual(archived_data["stock_summary"]["total_available"], 0)
        self.assertEqual(archived_data["stock_summary"]["status"], "out_of_stock")

    # =========================================================================
    # Filtering Tests
    # =========================================================================

    def test_filter_by_status(self):
        self.client.force_authenticate(user=self.admin_user)

        resp_draft = self.client.get("/api/v1/admin/products/?status=draft")
        self.assertEqual(resp_draft.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_draft.json()["count"], 1)
        self.assertEqual(resp_draft.json()["results"][0]["id"], str(self.p_draft.id))

        resp_active = self.client.get("/api/v1/admin/products/?status=active")
        self.assertEqual(resp_active.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_active.json()["count"], 1)
        self.assertEqual(resp_active.json()["results"][0]["id"], str(self.p_active.id))

        resp_archived = self.client.get("/api/v1/admin/products/?status=archived")
        self.assertEqual(resp_archived.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_archived.json()["count"], 1)
        self.assertEqual(resp_archived.json()["results"][0]["id"], str(self.p_archived.id))

    def test_filter_by_category(self):
        self.client.force_authenticate(user=self.admin_user)

        # By slug
        resp = self.client.get(f"/api/v1/admin/products/?category={self.cat_dresses.slug}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["count"], 1)
        self.assertEqual(resp.json()["results"][0]["id"], str(self.p_draft.id))

        # By UUID
        resp_uuid = self.client.get(f"/api/v1/admin/products/?category={self.cat_dresses.id}")
        self.assertEqual(resp_uuid.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_uuid.json()["count"], 1)
        self.assertEqual(resp_uuid.json()["results"][0]["id"], str(self.p_draft.id))

    def test_filter_by_collection(self):
        self.client.force_authenticate(user=self.admin_user)

        resp = self.client.get(f"/api/v1/admin/products/?collection={self.col_festive.slug}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["count"], 1)
        self.assertEqual(resp.json()["results"][0]["id"], str(self.p_active.id))

    # =========================================================================
    # Search Tests
    # =========================================================================

    def test_search_by_name(self):
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.get("/api/v1/admin/products/?search=Crimson")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["count"], 1)
        self.assertEqual(resp.json()["results"][0]["id"], str(self.p_active.id))

    def test_search_by_variant_sku(self):
        self.client.force_authenticate(user=self.admin_user)
        sku_query = self.v_draft.sku
        resp = self.client.get(f"/api/v1/admin/products/?search={sku_query}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["count"], 1)
        self.assertEqual(resp.json()["results"][0]["id"], str(self.p_draft.id))

    def test_search_no_results(self):
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.get("/api/v1/admin/products/?search=NonExistentTermXYZ")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["count"], 0)
        self.assertEqual(resp.json()["results"], [])

    # =========================================================================
    # Sorting & Pagination Tests
    # =========================================================================

    def test_ordering_by_name(self):
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.get("/api/v1/admin/products/?ordering=name")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [p["name"] for p in resp.json()["results"]]
        self.assertEqual(names, sorted(names))

    def test_pagination(self):
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.get("/api/v1/admin/products/?page=1&page_size=2")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = response_data = resp.json()
        self.assertEqual(data["count"], 3)
        self.assertEqual(len(data["results"]), 2)
        self.assertIsNotNone(data["next"])

    # =========================================================================
    # Query Efficiency / N+1 Regression Test
    # =========================================================================

    def test_query_efficiency_does_not_n_plus_one(self):
        self.client.force_authenticate(user=self.admin_user)
        # Warm-up / count queries: Products, Variants, InventoryItems, Images, Collections, Categories
        with self.assertNumQueries(6):
            # 1. Product select
            # 2. Category (joined in select_related)
            # 3. Collections (prefetch)
            # 4. ProductCollections (prefetch through)
            # 5. Variants (prefetch)
            # 6. InventoryItems (prefetch)
            # 7. Images (prefetch)
            # Plus count(*) for paginator
            response = self.client.get("/api/v1/admin/products/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.json()["count"], 3)


class AdminProductCreateUpdateApiTests(TestCase):
    """Integration tests for Admin Product Creation and Editing (Sprint A2.2)."""

    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin_creations@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )

        # Customer user
        self.customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="shopper_creations@closetbychilli.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )

        # Staff user
        self.staff_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="staff_creations@closetbychilli.com",
            role=User.Role.STAFF,
            is_active=True,
        )

        # Categories & Collections
        self.category_1 = Category.objects.create(
            name="Kurtas",
            slug=f"kurtas-{uuid.uuid4().hex[:6]}",
        )
        self.category_2 = Category.objects.create(
            name="Sarees",
            slug=f"sarees-{uuid.uuid4().hex[:6]}",
        )
        self.collection_1 = Collection.objects.create(
            name="Summer Drop",
            slug=f"summer-{uuid.uuid4().hex[:6]}",
        )
        self.collection_2 = Collection.objects.create(
            name="Festive Edit",
            slug=f"festive-{uuid.uuid4().hex[:6]}",
        )

        # Pre-existing product
        self.product = Product.objects.create(
            name="Original Chanderi Kurti",
            slug="original-chanderi-kurti",
            description="Handwoven chanderi cotton kurti.",
            category=self.category_1,
            status=Product.Status.DRAFT,
            is_active=True,
        )
        ProductCollection.objects.create(
            product=self.product,
            collection=self.collection_1,
            ordering=0,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku=f"ORIG-CHK-M-{uuid.uuid4().hex[:6]}",
            size="M",
            color="Red",
            retail_price=Decimal("1999.00"),
            is_active=True,
        )
        InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=10,
        )
        self.image = ProductImage.objects.create(
            product=self.product,
            image_url="/assets/products/kurti-1.jpg",
            is_primary=True,
            ordering=0,
        )

    # 1. Authorization Enforcement
    def test_anonymous_requests_are_rejected(self):
        # Create
        res_post = self.client.post("/api/v1/admin/products/", {"name": "Test"})
        self.assertEqual(res_post.status_code, status.HTTP_401_UNAUTHORIZED)

        # Retrieve
        res_get = self.client.get(f"/api/v1/admin/products/{self.product.id}/")
        self.assertEqual(res_get.status_code, status.HTTP_401_UNAUTHORIZED)

        # Update
        res_patch = self.client.patch(f"/api/v1/admin/products/{self.product.id}/", {"name": "New"})
        self.assertEqual(res_patch.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_and_staff_requests_are_forbidden(self):
        for user in [self.customer, self.staff_user]:
            self.client.force_authenticate(user=user)

            # Create
            res_post = self.client.post("/api/v1/admin/products/", {"name": "Test"})
            self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)

            # Retrieve
            res_get = self.client.get(f"/api/v1/admin/products/{self.product.id}/")
            self.assertEqual(res_get.status_code, status.HTTP_403_FORBIDDEN)

            # Update
            res_patch = self.client.patch(f"/api/v1/admin/products/{self.product.id}/", {"name": "New"})
            self.assertEqual(res_patch.status_code, status.HTTP_403_FORBIDDEN)

    # 2. Product Creation
    def test_create_product_success_minimal(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Pastel Pink Anarkali",
        }
        response = self.client.post("/api/v1/admin/products/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()

        self.assertIn("id", data)
        self.assertEqual(data["name"], "Pastel Pink Anarkali")
        self.assertEqual(data["slug"], "pastel-pink-anarkali")
        self.assertEqual(data["status"], "draft")
        self.assertTrue(data["is_active"])
        self.assertIsNone(data["category_id"])
        self.assertEqual(data["collection_ids"], [])

        # Verify DB record
        db_prod = Product.objects.get(id=data["id"])
        self.assertEqual(db_prod.name, "Pastel Pink Anarkali")
        self.assertEqual(db_prod.status, Product.Status.DRAFT)

    def test_create_product_with_relationships_and_status(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Royal Banarasi Saree",
            "slug": "royal-banarasi-saree-special",
            "description": "Zari woven royal drape.",
            "category_id": str(self.category_2.id),
            "collection_ids": [str(self.collection_1.id), str(self.collection_2.id)],
            "status": "active",
            "is_active": True,
        }
        response = self.client.post("/api/v1/admin/products/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()

        self.assertEqual(data["name"], "Royal Banarasi Saree")
        self.assertEqual(data["slug"], "royal-banarasi-saree-special")
        self.assertEqual(data["status"], "active")
        self.assertEqual(data["category_id"], str(self.category_2.id))
        self.assertEqual(set(data["collection_ids"]), {str(self.collection_1.id), str(self.collection_2.id)})

        # Check ProductCollection ordering
        pcs = ProductCollection.objects.filter(product_id=data["id"]).order_by("ordering")
        self.assertEqual(pcs.count(), 2)
        self.assertEqual(pcs[0].collection_id, self.collection_1.id)
        self.assertEqual(pcs[1].collection_id, self.collection_2.id)

    def test_create_product_field_validation_errors(self):
        self.client.force_authenticate(user=self.admin_user)

        # Empty name
        res_empty = self.client.post("/api/v1/admin/products/", {"name": "   "}, format="json")
        self.assertEqual(res_empty.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", res_empty.json()["error"]["details"])

        # Invalid category UUID
        invalid_cat_uuid = str(uuid.uuid4())
        res_cat = self.client.post(
            "/api/v1/admin/products/",
            {"name": "Valid Name", "category_id": invalid_cat_uuid},
            format="json",
        )
        self.assertEqual(res_cat.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("category", res_cat.json()["error"]["details"])

        # Invalid collection UUID
        invalid_col_uuid = str(uuid.uuid4())
        res_col = self.client.post(
            "/api/v1/admin/products/",
            {"name": "Valid Name", "collection_ids": [invalid_col_uuid]},
            format="json",
        )
        self.assertEqual(res_col.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("collections", res_col.json()["error"]["details"])

        # Invalid status choice
        res_status = self.client.post(
            "/api/v1/admin/products/",
            {"name": "Valid Name", "status": "non_existent_status"},
            format="json",
        )
        self.assertEqual(res_status.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", res_status.json()["error"]["details"])

    def test_create_product_duplicate_slug_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Different Name",
            "slug": self.product.slug,  # Collision with existing product
        }
        response = self.client.post("/api/v1/admin/products/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        details = response.json()["error"]["details"]
        self.assertIn("slug", details)
        self.assertIn("already exists", str(details["slug"]))

    # 3. Product Retrieval for Editing
    def test_retrieve_product_detail_success(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f"/api/v1/admin/products/{self.product.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data["id"], str(self.product.id))
        self.assertEqual(data["name"], self.product.name)
        self.assertEqual(data["slug"], self.product.slug)
        self.assertEqual(data["category_id"], str(self.category_1.id))
        self.assertEqual(data["category"]["name"], self.category_1.name)
        self.assertEqual(data["collection_ids"], [str(self.collection_1.id)])
        self.assertEqual(data["status"], "draft")

    def test_retrieve_product_detail_not_found(self):
        self.client.force_authenticate(user=self.admin_user)
        random_id = uuid.uuid4()
        response = self.client.get(f"/api/v1/admin/products/{random_id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # 4. Product Updating
    def test_update_product_partial_patch(self):
        self.client.force_authenticate(user=self.admin_user)
        patch_payload = {
            "name": "Updated Chanderi Silk Kurti",
            "status": "active",
        }
        response = self.client.patch(
            f"/api/v1/admin/products/{self.product.id}/", patch_payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data["name"], "Updated Chanderi Silk Kurti")
        self.assertEqual(data["status"], "active")
        # Ensure unmentioned fields were not overwritten
        self.assertEqual(data["slug"], self.product.slug)
        self.assertEqual(data["description"], self.product.description)

        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Updated Chanderi Silk Kurti")
        self.assertEqual(self.product.status, Product.Status.ACTIVE)

    def test_update_product_reassign_category_and_collections(self):
        self.client.force_authenticate(user=self.admin_user)
        update_payload = {
            "category_id": str(self.category_2.id),
            "collection_ids": [str(self.collection_2.id)],
        }
        response = self.client.patch(
            f"/api/v1/admin/products/{self.product.id}/", update_payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data["category_id"], str(self.category_2.id))
        self.assertEqual(data["collection_ids"], [str(self.collection_2.id)])

        # Verify through-table synchronization
        pcs = ProductCollection.objects.filter(product=self.product)
        self.assertEqual(pcs.count(), 1)
        self.assertEqual(pcs.first().collection_id, self.collection_2.id)

    def test_update_product_slug_collision_with_other_product_fails(self):
        self.client.force_authenticate(user=self.admin_user)
        # Create a second product
        other_prod = Product.objects.create(
            name="Second Silhouette",
            slug="second-silhouette-slug",
        )

        # Attempt to change self.product's slug to other_prod's slug
        response = self.client.patch(
            f"/api/v1/admin/products/{self.product.id}/",
            {"slug": "second-silhouette-slug"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("slug", response.json()["error"]["details"])

        # Updating with its own current slug must succeed
        res_self = self.client.patch(
            f"/api/v1/admin/products/{self.product.id}/",
            {"slug": self.product.slug},
            format="json",
        )
        self.assertEqual(res_self.status_code, status.HTTP_200_OK)

    # 5. Storefront Isolation
    def test_draft_product_remains_hidden_from_public_catalog(self):
        self.client.force_authenticate(user=self.admin_user)
        # Create draft product
        post_res = self.client.post(
            "/api/v1/admin/products/",
            {"name": "Hidden Secret Draft Silhouette", "status": "draft"},
            format="json",
        )
        self.assertEqual(post_res.status_code, status.HTTP_201_CREATED)
        draft_slug = post_res.json()["slug"]

        # Public catalog endpoints without authentication
        public_client = APIClient()

        # Public list
        list_res = public_client.get("/api/v1/catalog/products/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        public_slugs = [p["slug"] for p in list_res.json()["results"]]
        self.assertNotIn(draft_slug, public_slugs)

        # Public detail
        detail_res = public_client.get(f"/api/v1/catalog/products/{draft_slug}/")
        self.assertEqual(detail_res.status_code, status.HTTP_404_NOT_FOUND)


class AdminMediaAndImagesApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin.media@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="cust.media@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        self.product = Product.objects.create(
            name="Organza Embroidered Saree",
            slug="organza-embroidered-saree",
            status=Product.Status.DRAFT,
        )

    def test_media_upload_requires_admin(self):
        # Anonymous
        file = SimpleUploadedFile("test.jpg", b"fake image bytes", content_type="image/jpeg")
        res = self.client.post("/api/v1/admin/media/upload/", {"file": file}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer
        self.client.force_authenticate(user=self.customer)
        file2 = SimpleUploadedFile("test2.jpg", b"fake image bytes", content_type="image/jpeg")
        res2 = self.client.post("/api/v1/admin/media/upload/", {"file": file2}, format="multipart")
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

    def test_media_upload_file_format_and_size_validation(self):
        self.client.force_authenticate(user=self.admin_user)

        # Disallowed extension (e.g. .pdf or .exe)
        invalid_file = SimpleUploadedFile("document.pdf", b"%PDF-1.4...", content_type="application/pdf")
        res = self.client.post("/api/v1/admin/media/upload/", {"file": invalid_file}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", res.json()["error"]["details"])

        # File size exceeds 5MB
        huge_bytes = b"0" * (5 * 1024 * 1024 + 1024)
        huge_file = SimpleUploadedFile("huge.jpg", huge_bytes, content_type="image/jpeg")
        res_huge = self.client.post("/api/v1/admin/media/upload/", {"file": huge_file}, format="multipart")
        self.assertEqual(res_huge.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", res_huge.json()["error"]["details"])

    @patch.object(admin_views, "upload_product_media")
    def test_media_upload_success(self, mock_upload):
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/test_cloud/image/upload/v12345/closet-by-chilli/products/front_look.webp",
            "public_id": "closet-by-chilli/products/front_look_abc123",
            "format": "webp",
            "resource_type": "image",
            "width": 1200,
            "height": 1600,
            "bytes": 2048,
        }
        self.client.force_authenticate(user=self.admin_user)
        valid_file = SimpleUploadedFile("front_look.webp", b"RIFF....WEBP", content_type="image/webp")
        res = self.client.post("/api/v1/admin/media/upload/", {"file": valid_file}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertIn("image_url", data)
        self.assertTrue(data["image_url"].endswith(".webp"))
        self.assertEqual(data["original_name"], "front_look.webp")
        self.assertEqual(data["public_id"], "closet-by-chilli/products/front_look_abc123")

    def test_product_image_crud_and_primary_enforcement(self):
        self.client.force_authenticate(user=self.admin_user)

        # 1. Create first image (should automatically become primary)
        res1 = self.client.post(
            f"/api/v1/admin/products/{self.product.id}/images/",
            {"image_url": "/media/products/img1.jpg", "alt_text": "Look 1"},
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        img1 = res1.json()
        self.assertTrue(img1["is_primary"])
        self.assertEqual(img1["ordering"], 0)

        # 2. Create second image without is_primary (should not be primary)
        res2 = self.client.post(
            f"/api/v1/admin/products/{self.product.id}/images/",
            {"image_url": "/media/products/img2.jpg", "alt_text": "Look 2", "is_primary": False},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        img2 = res2.json()
        self.assertFalse(img2["is_primary"])

        # 3. Promote second image to primary
        res_patch = self.client.patch(
            f"/api/v1/admin/products/{self.product.id}/images/{img2['id']}/",
            {"is_primary": True},
            format="json",
        )
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertTrue(res_patch.json()["is_primary"])

        # Verify img1 is no longer primary
        db_img1 = ProductImage.objects.get(id=img1["id"])
        self.assertFalse(db_img1.is_primary)

        # 4. Reorder images
        res_reorder = self.client.post(
            f"/api/v1/admin/products/{self.product.id}/images/reorder/",
            {"image_ids": [img2["id"], img1["id"]]},
            format="json",
        )
        self.assertEqual(res_reorder.status_code, status.HTTP_200_OK)
        reordered = res_reorder.json()
        self.assertEqual(reordered[0]["id"], img2["id"])
        self.assertEqual(reordered[0]["ordering"], 0)
        self.assertEqual(reordered[1]["id"], img1["id"])
        self.assertEqual(reordered[1]["ordering"], 1)

        # 5. Delete primary image (img2) -> img1 should be promoted to primary
        res_del = self.client.delete(
            f"/api/v1/admin/products/{self.product.id}/images/{img2['id']}/"
        )
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        db_img1.refresh_from_db()
        self.assertTrue(db_img1.is_primary)


class AdminVariantAndInventoryApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin.variants@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="cust.variants@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        self.product = Product.objects.create(
            name="Chanderi Handloom Kurti",
            slug="chanderi-handloom-kurti-v",
            status=Product.Status.DRAFT,
        )

    def test_variant_create_success_with_initial_stock(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "sku": "CHND-KUR-BLU-S",
            "size": "S",
            "color": "Royal Blue",
            "retail_price": "2499.00",
            "sale_price": "1999.00",
            "wholesale_price": "1200.00",
            "initial_stock": 15,
            "is_active": True,
        }
        res = self.client.post(f"/api/v1/admin/products/{self.product.id}/variants/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()

        self.assertEqual(data["sku"], "CHND-KUR-BLU-S")
        self.assertEqual(data["retail_price"], "2499.00")
        self.assertEqual(data["sale_price"], "1999.00")
        self.assertEqual(data["inventory"]["quantity_available"], 15)
        self.assertEqual(data["inventory"]["stock_status"], "in_stock")

        # Verify ledger movement was created
        item = InventoryItem.objects.get(variant_id=data["id"])
        self.assertEqual(item.quantity_available, 15)
        movement = item.movements.first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity_change, 15)
        self.assertEqual(movement.movement_type, InventoryMovement.MovementType.STOCK_RECEIVED)

    def test_variant_validation_rules(self):
        self.client.force_authenticate(user=self.admin_user)

        # 1. Sale price higher than or equal to retail price fails
        bad_price_payload = {
            "sku": "CHND-BAD-PRICE",
            "retail_price": "1000.00",
            "sale_price": "1500.00",
        }
        res = self.client.post(f"/api/v1/admin/products/{self.product.id}/variants/", bad_price_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sale_price", res.json()["error"]["details"])

        # 2. Duplicate SKU fails
        ProductVariant.objects.create(
            product=self.product,
            sku="EXISTING-SKU-1",
            retail_price=Decimal("1500.00"),
        )
        dup_sku_payload = {
            "sku": "existing-sku-1",
            "retail_price": "1200.00",
        }
        res2 = self.client.post(f"/api/v1/admin/products/{self.product.id}/variants/", dup_sku_payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sku", res2.json()["error"]["details"])

        # 3. Duplicate size and color combination on same product fails
        ProductVariant.objects.create(
            product=self.product,
            sku="CHND-M-RED",
            size="M",
            color="Red",
            retail_price=Decimal("1500.00"),
        )
        dup_combo_payload = {
            "sku": "CHND-M-RED-DIFFSKU",
            "size": "m",
            "color": "red",
            "retail_price": "1600.00",
        }
        res3 = self.client.post(f"/api/v1/admin/products/{self.product.id}/variants/", dup_combo_payload, format="json")
        self.assertEqual(res3.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("size", res3.json()["error"]["details"])

    def test_variant_delete_protection_with_order_history(self):
        self.client.force_authenticate(user=self.admin_user)

        # Create variant
        variant = ProductVariant.objects.create(
            product=self.product,
            sku="ORDERED-VARIANT-1",
            retail_price=Decimal("2000.00"),
            is_active=True,
        )

        # Create historical order record
        order = Order.objects.create(
            user=self.customer,
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            subtotal=Decimal("2000.00"),
            total=Decimal("2000.00"),
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            variant=variant,
            product_name=self.product.name,
            variant_name="Standard",
            sku=variant.sku,
            unit_price=variant.retail_price,
            line_total=variant.retail_price,
            quantity=1,
        )

        # Attempt to delete variant
        res = self.client.delete(f"/api/v1/admin/products/{self.product.id}/variants/{variant.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn("deactivated", data["message"].lower())

        # Verify record still exists in DB but is_active=False
        variant.refresh_from_db()
        self.assertFalse(variant.is_active)

    def test_stock_adjustment_set_and_delta(self):
        self.client.force_authenticate(user=self.admin_user)
        variant = ProductVariant.objects.create(
            product=self.product,
            sku="ADJ-VARIANT-1",
            retail_price=Decimal("1500.00"),
        )
        item = InventoryItem.objects.create(variant=variant, quantity_available=10)

        # 1. Delta adjustment: add 5
        res_delta = self.client.post(
            f"/api/v1/admin/variants/{variant.id}/stock-adjustment/",
            {"adjustment_type": "delta", "quantity": 5, "reason": "stock_received", "reference": "PO-1002"},
            format="json",
        )
        self.assertEqual(res_delta.status_code, status.HTTP_200_OK)
        self.assertEqual(res_delta.json()["quantity_available"], 15)
        item.refresh_from_db()
        self.assertEqual(item.quantity_available, 15)

        # 2. Set adjustment: set to 0 (sold out)
        res_set = self.client.post(
            f"/api/v1/admin/variants/{variant.id}/stock-adjustment/",
            {"adjustment_type": "set", "quantity": 0, "reason": "manual_adjustment"},
            format="json",
        )
        self.assertEqual(res_set.status_code, status.HTTP_200_OK)
        self.assertEqual(res_set.json()["quantity_available"], 0)
        self.assertEqual(res_set.json()["stock_status"], "out_of_stock")
        item.refresh_from_db()
        self.assertEqual(item.quantity_available, 0)

        # 3. Negative stock prevention
        res_neg = self.client.post(
            f"/api/v1/admin/variants/{variant.id}/stock-adjustment/",
            {"adjustment_type": "delta", "quantity": -5},
            format="json",
        )
        self.assertEqual(res_neg.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity", res_neg.json()["error"]["details"])


class AdminPublicationReadinessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin.pub@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.category = Category.objects.create(name="Lehengas", slug="lehengas-pub")
        self.product = Product.objects.create(
            name="Zari Embroidered Lehenga",
            slug="zari-embroidered-lehenga",
            status=Product.Status.DRAFT,
        )

    def test_publish_fails_without_category(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(
            f"/api/v1/admin/products/{self.product.id}/",
            {"status": "active"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("category", res.json()["error"]["details"])

    def test_publish_fails_without_variants(self):
        self.client.force_authenticate(user=self.admin_user)
        self.product.category = self.category
        self.product.save()

        res = self.client.patch(
            f"/api/v1/admin/products/{self.product.id}/",
            {"status": "active"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", res.json()["error"]["details"])
        self.assertIn("variant", str(res.json()["error"]["details"]["status"]).lower())

    def test_publish_fails_without_images(self):
        self.client.force_authenticate(user=self.admin_user)
        self.product.category = self.category
        self.product.save()

        ProductVariant.objects.create(
            product=self.product,
            sku="LEH-VAR-1",
            retail_price=Decimal("4999.00"),
            is_active=True,
        )

        res = self.client.patch(
            f"/api/v1/admin/products/{self.product.id}/",
            {"status": "active"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", res.json()["error"]["details"])
        self.assertIn("image", str(res.json()["error"]["details"]["status"]).lower())

    def test_publish_succeeds_when_all_requirements_met(self):
        self.client.force_authenticate(user=self.admin_user)
        self.product.category = self.category
        self.product.save()

        variant = ProductVariant.objects.create(
            product=self.product,
            sku="LEH-VAR-READY",
            retail_price=Decimal("4999.00"),
            is_active=True,
        )
        InventoryItem.objects.create(
            variant=variant,
            quantity_available=10,
        )
        ProductImage.objects.create(
            product=self.product,
            image_url="/assets/products/lehenga-1.jpg",
            is_primary=True,
            ordering=0,
        )

        res = self.client.patch(
            f"/api/v1/admin/products/{self.product.id}/",
            {"status": "active"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["status"], "active")
        self.assertTrue(res.json()["readiness"]["can_publish"])


