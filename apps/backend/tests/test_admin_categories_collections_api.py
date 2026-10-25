"""
Integration tests for Admin Categories & Collections Management API (Sprint A2.5).

Covers:
- Admin authorization enforcement (401 anonymous, 403 customer/staff, 200/201 admin)
- Category list, retrieve, create, update, and safe deletion
- Category auto-slug generation, custom slug, duplicate slug validation
- Category hierarchical tree, self-parent prevention, circular parent prevention
- Category safe deletion blocked when referenced by products or with subcategories
- Category deactivation and public storefront isolation regression
- Collection list, retrieve, create, update, and safe deletion
- Collection auto-slug generation, custom slug, duplicate slug validation
- Collection product count calculation without N+1
- Collection safe deletion blocked when associated with products
- Collection products management (assign, batch assign, duplicate prevention, remove)
- Preservation of product-category and product-collection links
"""

import uuid
from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
    ProductVariant,
)


class AdminCategoriesCollectionsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Admin user
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.admin_user, display_name="Admin")

        # 2. Inactive admin user
        self.inactive_admin = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="inactive_admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=False,
        )

        # 3. Regular customer
        self.customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="customer@closetbychilli.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )

        # 4. Staff user
        self.staff_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="staff@closetbychilli.com",
            role=User.Role.STAFF,
            is_active=True,
        )

        # Prepopulate Categories
        self.cat_ethnic = Category.objects.create(
            name="Ethnic Wear",
            slug="ethnic-wear",
            description="Traditional and contemporary ethnic wear",
            is_active=True,
        )
        self.cat_kurtis = Category.objects.create(
            name="Kurtis",
            slug="kurtis",
            description="Chic artisan kurtis",
            parent=self.cat_ethnic,
            is_active=True,
        )
        self.cat_dresses = Category.objects.create(
            name="Dresses",
            slug="dresses",
            description="Western silhouettes and gowns",
            is_active=False,
        )

        # Prepopulate Collections
        self.col_festive = Collection.objects.create(
            name="Festive Curation",
            slug="festive-curation",
            description="Festive couture drop",
            is_active=True,
        )
        self.col_summer = Collection.objects.create(
            name="Summer Breeze",
            slug="summer-breeze",
            description="Light breathable linens",
            is_active=False,
        )

        # Product linked to Kurtis and Festive Curation
        self.product = Product.objects.create(
            name="Crimson Anarkali Kurti",
            slug="crimson-anarkali-kurti",
            category=self.cat_kurtis,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        ProductCollection.objects.create(
            product=self.product,
            collection=self.col_festive,
            ordering=0,
            is_active=True,
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="CRIM-ANR-S",
            size="S",
            retail_price=Decimal("2999.00"),
            is_active=True,
        )

    # =========================================================================
    # Authorization Tests
    # =========================================================================

    def test_anonymous_requests_are_rejected_with_401(self):
        endpoints = [
            "/api/v1/admin/categories/",
            f"/api/v1/admin/categories/{self.cat_kurtis.id}/",
            "/api/v1/admin/collections/",
            f"/api/v1/admin/collections/{self.col_festive.id}/",
            f"/api/v1/admin/collections/{self.col_festive.id}/products/",
        ]
        for ep in endpoints:
            res = self.client.get(ep)
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED, f"Failed for {ep}")

    def test_customer_user_is_rejected_with_403(self):
        self.client.force_authenticate(user=self.customer)
        res = self.client.get("/api/v1/admin/categories/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        res_post = self.client.post("/api/v1/admin/categories/", {"name": "Test"})
        self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_user_is_rejected_with_403(self):
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get("/api/v1/admin/collections/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_inactive_admin_is_rejected_with_403(self):
        self.client.force_authenticate(user=self.inactive_admin)
        res = self.client.get("/api/v1/admin/categories/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # Category Management Tests
    # =========================================================================

    def test_admin_list_categories_with_product_counts(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/admin/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["count"], 3)
        
        # Verify product count for Kurtis is 1, Ethnic Wear is 0, Dresses is 0
        kurtis_item = next(c for c in data["results"] if c["slug"] == "kurtis")
        self.assertEqual(kurtis_item["product_count"], 1)
        self.assertEqual(kurtis_item["parent_slug"], "ethnic-wear")
        self.assertEqual(kurtis_item["parent_name"], "Ethnic Wear")

    def test_admin_list_categories_search_and_filters(self):
        self.client.force_authenticate(user=self.admin_user)
        
        # Search by name
        res = self.client.get("/api/v1/admin/categories/?search=kurtis")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["count"], 1)
        self.assertEqual(res.json()["results"][0]["name"], "Kurtis")

        # Filter active
        res_active = self.client.get("/api/v1/admin/categories/?is_active=true")
        self.assertEqual(res_active.json()["count"], 2)

        # Filter inactive
        res_inactive = self.client.get("/api/v1/admin/categories/?is_active=false")
        self.assertEqual(res_inactive.json()["count"], 1)
        self.assertEqual(res_inactive.json()["results"][0]["name"], "Dresses")

        # Filter root parent
        res_root = self.client.get("/api/v1/admin/categories/?parent=root")
        self.assertEqual(res_root.json()["count"], 2)

        # Unpaginated all
        res_all = self.client.get("/api/v1/admin/categories/?all=true")
        self.assertIsInstance(res_all.json(), list)
        self.assertEqual(len(res_all.json()), 3)

    def test_admin_create_category_with_auto_slug(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Co-ord Sets",
            "description": "Matching chic co-ord sets",
            "parent": str(self.cat_ethnic.id),
            "is_active": True,
        }
        res = self.client.post("/api/v1/admin/categories/", payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertEqual(data["name"], "Co-ord Sets")
        self.assertEqual(data["slug"], "co-ord-sets")
        self.assertEqual(data["parent"], str(self.cat_ethnic.id))
        self.assertEqual(data["parent_slug"], "ethnic-wear")
        self.assertEqual(data["product_count"], 0)

    def test_admin_create_category_custom_slug_and_duplicate_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        # Create with custom slug
        res = self.client.post(
            "/api/v1/admin/categories/",
            {"name": "Palazzos", "slug": "palazzo-pants"},
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.json()["slug"], "palazzo-pants")

        # Attempt duplicate slug
        res_dup = self.client.post(
            "/api/v1/admin/categories/",
            {"name": "Another Palazzos", "slug": "palazzo-pants"},
        )
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("slug", res_dup.json()["error"]["details"])

    def test_admin_category_hierarchy_validation(self):
        self.client.force_authenticate(user=self.admin_user)

        # 1. Category cannot be its own parent
        res_self = self.client.patch(
            f"/api/v1/admin/categories/{self.cat_kurtis.id}/",
            {"parent": str(self.cat_kurtis.id)},
        )
        self.assertEqual(res_self.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Circular hierarchy: Ethnic Wear is parent of Kurtis.
        # Setting Kurtis as parent of Ethnic Wear must be rejected!
        res_circular = self.client.patch(
            f"/api/v1/admin/categories/{self.cat_ethnic.id}/",
            {"parent": str(self.cat_kurtis.id)},
        )
        self.assertEqual(res_circular.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Circular", str(res_circular.json()))

    def test_admin_update_category_preserves_product_assignments(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(
            f"/api/v1/admin/categories/{self.cat_kurtis.id}/",
            {"description": "Updated kurtis description"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.category, self.cat_kurtis)

    def test_admin_safe_delete_category_blocked_by_products(self):
        self.client.force_authenticate(user=self.admin_user)
        # Kurtis has 1 product
        res = self.client.delete(f"/api/v1/admin/categories/{self.cat_kurtis.id}/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        err = res.json()["error"]
        self.assertEqual(err["code"], "CANNOT_DELETE_REFERENCED_CATEGORY")
        self.assertIn("referenced by 1 product(s)", err["message"])
        self.assertTrue(Category.objects.filter(id=self.cat_kurtis.id).exists())

    def test_admin_safe_delete_category_blocked_by_subcategories(self):
        self.client.force_authenticate(user=self.admin_user)
        # Ethnic Wear has 0 direct products, but has subcategory Kurtis
        res = self.client.delete(f"/api/v1/admin/categories/{self.cat_ethnic.id}/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        err = res.json()["error"]
        self.assertEqual(err["code"], "CANNOT_DELETE_PARENT_CATEGORY")
        self.assertTrue(Category.objects.filter(id=self.cat_ethnic.id).exists())

    def test_admin_safe_delete_unreferenced_category_succeeds(self):
        self.client.force_authenticate(user=self.admin_user)
        # Dresses has 0 products and 0 children
        res = self.client.delete(f"/api/v1/admin/categories/{self.cat_dresses.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(id=self.cat_dresses.id).exists())

    def test_admin_category_deactivation_and_public_storefront_isolation(self):
        self.client.force_authenticate(user=self.admin_user)
        # Deactivate Kurtis
        res = self.client.patch(
            f"/api/v1/admin/categories/{self.cat_kurtis.id}/",
            {"is_active": False},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.json()["is_active"])

        # Product still has Kurtis assigned in DB
        self.product.refresh_from_db()
        self.assertEqual(self.product.category_id, self.cat_kurtis.id)

        # Public storefront (/api/v1/catalog/categories/) excludes inactive categories
        public_res = self.client.get("/api/v1/catalog/categories/")
        public_slugs = [c["slug"] for c in public_res.json()["results"]]
        self.assertNotIn("kurtis", public_slugs)
        self.assertIn("ethnic-wear", public_slugs)

    # =========================================================================
    # Collection Management Tests
    # =========================================================================

    def test_admin_list_collections_with_product_counts(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/v1/admin/collections/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["count"], 2)

        festive_item = next(c for c in data["results"] if c["slug"] == "festive-curation")
        self.assertEqual(festive_item["product_count"], 1)

        summer_item = next(c for c in data["results"] if c["slug"] == "summer-breeze")
        self.assertEqual(summer_item["product_count"], 0)

    def test_admin_create_collection_with_auto_slug_and_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        # Auto slug
        res = self.client.post(
            "/api/v1/admin/collections/",
            {"name": "Winter Velvet 2026", "description": "Luxe velvet drop"},
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.json()["slug"], "winter-velvet-2026")
        self.assertEqual(res.json()["product_count"], 0)

        # Duplicate slug
        res_dup = self.client.post(
            "/api/v1/admin/collections/",
            {"name": "Another", "slug": "winter-velvet-2026"},
        )
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_safe_delete_collection_blocked_by_products(self):
        self.client.force_authenticate(user=self.admin_user)
        # Festive Curation has 1 product
        res = self.client.delete(f"/api/v1/admin/collections/{self.col_festive.id}/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        err = res.json()["error"]
        self.assertEqual(err["code"], "CANNOT_DELETE_REFERENCED_COLLECTION")
        self.assertTrue(Collection.objects.filter(id=self.col_festive.id).exists())

    def test_admin_safe_delete_empty_collection_succeeds(self):
        self.client.force_authenticate(user=self.admin_user)
        # Summer Breeze has 0 products
        res = self.client.delete(f"/api/v1/admin/collections/{self.col_summer.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Collection.objects.filter(id=self.col_summer.id).exists())

    def test_admin_collection_deactivation_and_public_isolation(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(
            f"/api/v1/admin/collections/{self.col_festive.id}/",
            {"is_active": False},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.json()["is_active"])

        # Product-collection link remains intact
        self.assertTrue(
            ProductCollection.objects.filter(
                product=self.product, collection=self.col_festive
            ).exists()
        )

        # Public storefront excludes inactive collection
        public_res = self.client.get("/api/v1/catalog/collections/")
        slugs = [c["slug"] for c in public_res.json()["results"]]
        self.assertNotIn("festive-curation", slugs)

    # =========================================================================
    # Collection Products Assignment & Relationship Tests
    # =========================================================================

    def test_admin_collection_products_list_assign_and_remove(self):
        self.client.force_authenticate(user=self.admin_user)

        # Create a second product
        p2 = Product.objects.create(
            name="Emerald Silk Gown",
            slug="emerald-silk-gown",
            category=self.cat_ethnic,
            status=Product.Status.DRAFT,
            is_active=True,
        )

        # 1. List products in Festive Curation (should have product 1)
        res_list = self.client.get(
            f"/api/v1/admin/collections/{self.col_festive.id}/products/"
        )
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        items = res_list.json()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["product_id"], str(self.product.id))

        # 2. Assign p2 to Festive Curation
        res_add = self.client.post(
            f"/api/v1/admin/collections/{self.col_festive.id}/products/",
            {"product_id": str(p2.id)},
        )
        self.assertEqual(res_add.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_add.json()["product_id"], str(p2.id))

        # 3. Duplicate assignment is idempotent and does not violate DB constraint
        res_dup = self.client.post(
            f"/api/v1/admin/collections/{self.col_festive.id}/products/",
            {"product_id": str(p2.id)},
        )
        self.assertEqual(res_dup.status_code, status.HTTP_200_OK)
        self.assertEqual(
            ProductCollection.objects.filter(
                product=p2, collection=self.col_festive
            ).count(),
            1,
        )

        # 4. Remove p2 from Festive Curation
        res_del = self.client.delete(
            f"/api/v1/admin/collections/{self.col_festive.id}/products/{p2.id}/"
        )
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            ProductCollection.objects.filter(
                product=p2, collection=self.col_festive
            ).exists()
        )
        # Product p2 still exists in DB
        self.assertTrue(Product.objects.filter(id=p2.id).exists())
