"""
Catalog REST API Integration Tests.

Covers:
- CategoryViewSet: list, detail, search, ordering, pagination, 404, 405
- CollectionViewSet: list, detail, search, ordering, 404, 405
- ProductViewSet: list, detail (by slug), category filter, collection filter,
  search, ordering, pagination, visibility rules (draft/archived hidden),
  inactive product hidden, inactive variants excluded,
  wholesale_price NOT in public response, 404, 405
- Query efficiency (basic N+1 regression check using assertNumQueries)
"""

from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
    ProductVariant,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_product(
    name: str,
    slug: str,
    category=None,
    status_val=Product.Status.ACTIVE,
    is_active=True,
) -> Product:
    return Product.objects.create(
        name=name,
        slug=slug,
        category=category,
        status=status_val,
        is_active=is_active,
    )


def make_variant(
    product: Product,
    sku: str,
    retail_price="999.00",
    wholesale_price=None,
    is_active=True,
) -> ProductVariant:
    return ProductVariant.objects.create(
        product=product,
        sku=sku,
        retail_price=Decimal(retail_price),
        wholesale_price=Decimal(wholesale_price) if wholesale_price else None,
        is_active=is_active,
    )


# ===========================================================================
# Category API Tests
# ===========================================================================


class CategoryListAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cat1 = Category.objects.create(name="Kurtis", slug="kurtis")
        self.cat2 = Category.objects.create(name="Dresses", slug="dresses")
        self.inactive = Category.objects.create(
            name="Hidden", slug="hidden", is_active=False
        )

    def test_list_returns_200(self):
        r = self.client.get("/api/v1/catalog/categories/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_list_excludes_inactive(self):
        r = self.client.get("/api/v1/catalog/categories/")
        slugs = [c["slug"] for c in r.json()["results"]]
        self.assertIn("kurtis", slugs)
        self.assertIn("dresses", slugs)
        self.assertNotIn("hidden", slugs)

    def test_list_is_paginated(self):
        r = self.client.get("/api/v1/catalog/categories/")
        data = r.json()
        self.assertIn("count", data)
        self.assertIn("results", data)

    def test_list_search(self):
        r = self.client.get("/api/v1/catalog/categories/?search=Kurti")
        data = r.json()
        slugs = [c["slug"] for c in data["results"]]
        self.assertIn("kurtis", slugs)
        self.assertNotIn("dresses", slugs)

    def test_list_ordering(self):
        r = self.client.get("/api/v1/catalog/categories/?ordering=name")
        names = [c["name"] for c in r.json()["results"]]
        self.assertEqual(names, sorted(names))

    def test_list_method_not_allowed_post(self):
        r = self.client.post("/api/v1/catalog/categories/", {})
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertIn("error", r.json())

    def test_list_method_not_allowed_delete(self):
        r = self.client.delete("/api/v1/catalog/categories/")
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class CategoryDetailAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.parent = Category.objects.create(name="Bottom Wear", slug="bottom-wear")
        self.child = Category.objects.create(
            name="Palazzo", slug="palazzo", parent=self.parent
        )

    def test_detail_by_id_returns_200(self):
        r = self.client.get(f"/api/v1/catalog/categories/{self.parent.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = r.json()
        self.assertEqual(data["slug"], "bottom-wear")

    def test_detail_has_children(self):
        r = self.client.get(f"/api/v1/catalog/categories/{self.parent.id}/")
        data = r.json()
        child_slugs = [c["slug"] for c in data["children"]]
        self.assertIn("palazzo", child_slugs)

    def test_detail_child_has_parent_slug(self):
        r = self.client.get(f"/api/v1/catalog/categories/{self.child.id}/")
        self.assertEqual(r.json()["parent_slug"], "bottom-wear")

    def test_detail_404_on_missing(self):
        import uuid

        fake_id = uuid.uuid4()
        r = self.client.get(f"/api/v1/catalog/categories/{fake_id}/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", r.json())
        self.assertEqual(r.json()["error"]["code"], "NOT_FOUND")

    def test_detail_put_not_allowed(self):
        r = self.client.put(f"/api/v1/catalog/categories/{self.parent.id}/", {})
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


# ===========================================================================
# Collection API Tests
# ===========================================================================


class CollectionListAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.col1 = Collection.objects.create(name="New Arrivals", slug="new-arrivals")
        self.col2 = Collection.objects.create(name="Bestsellers", slug="bestsellers")
        self.inactive = Collection.objects.create(
            name="Archived Col", slug="archived-col", is_active=False
        )

    def test_list_returns_200(self):
        r = self.client.get("/api/v1/catalog/collections/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_list_excludes_inactive(self):
        response = self.client.get("/api/v1/catalog/collections/")
        slugs = [c["slug"] for c in response.json()["results"]]
        self.assertIn("new-arrivals", slugs)
        self.assertNotIn("archived-col", slugs)

    def test_list_search(self):
        r = self.client.get("/api/v1/catalog/collections/?search=Bestseller")
        slugs = [c["slug"] for c in r.json()["results"]]
        self.assertIn("bestsellers", slugs)
        self.assertNotIn("new-arrivals", slugs)

    def test_list_post_not_allowed(self):
        r = self.client.post("/api/v1/catalog/collections/", {})
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(r.json()["error"]["code"], "METHOD_NOT_ALLOWED")


class CollectionDetailAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.col = Collection.objects.create(
            name="Festive Collection", slug="festive-collection"
        )

    def test_detail_returns_200(self):
        r = self.client.get(f"/api/v1/catalog/collections/{self.col.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["slug"], "festive-collection")

    def test_detail_404(self):
        import uuid

        r = self.client.get(f"/api/v1/catalog/collections/{uuid.uuid4()}/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(r.json()["error"]["code"], "NOT_FOUND")


# ===========================================================================
# Product API Tests
# ===========================================================================


class ProductListAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cat_kurtis = Category.objects.create(name="Kurtis", slug="kurtis")
        self.cat_dresses = Category.objects.create(name="Dresses", slug="dresses")
        self.col_new = Collection.objects.create(
            name="New Arrivals", slug="new-arrivals"
        )

        self.p1 = make_product("Silk Kurti", "silk-kurti", category=self.cat_kurtis)
        self.p2 = make_product(
            "Summer Dress", "summer-dress", category=self.cat_dresses
        )
        self.draft = make_product(
            "Draft Product", "draft-product", status_val=Product.Status.DRAFT
        )
        self.archived = make_product(
            "Archived Product",
            "archived-product",
            status_val=Product.Status.ARCHIVED,
        )
        self.inactive = make_product(
            "Inactive Active", "inactive-active", is_active=False
        )
        ProductCollection.objects.create(
            product=self.p1, collection=self.col_new, ordering=1
        )
        make_variant(self.p1, "SKT-001", "1299.00")
        make_variant(self.p2, "DRS-001", "2499.00")

    # --- Visibility rules ---

    def test_list_returns_200(self):
        r = self.client.get("/api/v1/catalog/products/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_list_only_active_products(self):
        r = self.client.get("/api/v1/catalog/products/")
        slugs = [p["slug"] for p in r.json()["results"]]
        self.assertIn("silk-kurti", slugs)
        self.assertIn("summer-dress", slugs)
        self.assertNotIn("draft-product", slugs)
        self.assertNotIn("archived-product", slugs)
        self.assertNotIn("inactive-active", slugs)

    # --- Pagination ---

    def test_list_is_paginated(self):
        data = self.client.get("/api/v1/catalog/products/").json()
        self.assertIn("count", data)
        self.assertIn("results", data)
        self.assertIn("next", data)
        self.assertIn("previous", data)

    def test_pagination_page_size(self):
        r = self.client.get("/api/v1/catalog/products/?page_size=1")
        data = r.json()
        self.assertEqual(len(data["results"]), 1)
        self.assertIsNotNone(data["next"])

    # --- Filters ---

    def test_filter_by_category_slug(self):
        r = self.client.get("/api/v1/catalog/products/?category=kurtis")
        slugs = [p["slug"] for p in r.json()["results"]]
        self.assertIn("silk-kurti", slugs)
        self.assertNotIn("summer-dress", slugs)

    def test_filter_by_unknown_category_slug_returns_empty(self):
        r = self.client.get("/api/v1/catalog/products/?category=nonexistent-cat")
        self.assertEqual(r.json()["count"], 0)

    def test_filter_by_collection_slug(self):
        r = self.client.get("/api/v1/catalog/products/?collection=new-arrivals")
        slugs = [p["slug"] for p in r.json()["results"]]
        self.assertIn("silk-kurti", slugs)
        self.assertNotIn("summer-dress", slugs)

    # --- Search ---

    def test_search_by_name(self):
        r = self.client.get("/api/v1/catalog/products/?search=Silk")
        slugs = [p["slug"] for p in r.json()["results"]]
        self.assertIn("silk-kurti", slugs)
        self.assertNotIn("summer-dress", slugs)

    def test_search_no_match_returns_empty(self):
        r = self.client.get("/api/v1/catalog/products/?search=XYZ_NONEXISTENT")
        self.assertEqual(r.json()["count"], 0)

    # --- Ordering ---

    def test_ordering_by_name(self):
        r = self.client.get("/api/v1/catalog/products/?ordering=name")
        names = [p["name"] for p in r.json()["results"]]
        self.assertEqual(names, sorted(names))

    def test_ordering_by_name_desc(self):
        r = self.client.get("/api/v1/catalog/products/?ordering=-name")
        names = [p["name"] for p in r.json()["results"]]
        self.assertEqual(names, sorted(names, reverse=True))

    # --- Methods ---

    def test_post_not_allowed(self):
        r = self.client.post("/api/v1/catalog/products/", {})
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(r.json()["error"]["code"], "METHOD_NOT_ALLOWED")

    # --- Wholesale price must NOT appear in list responses ---

    def test_wholesale_price_not_in_list_response(self):
        r = self.client.get("/api/v1/catalog/products/")
        for product in r.json()["results"]:
            # min_price is computed, not the field itself
            self.assertNotIn("wholesale_price", product)


class ProductDetailAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cat = Category.objects.create(name="Anarkali", slug="anarkali")
        self.col = Collection.objects.create(name="Festive", slug="festive")
        self.product = make_product(
            "Royal Anarkali", "royal-anarkali", category=self.cat
        )
        ProductCollection.objects.create(
            product=self.product, collection=self.col, ordering=1
        )
        self.v_active = make_variant(
            self.product, "RYL-M", "3500.00", wholesale_price="2000.00", is_active=True
        )
        self.v_inactive = make_variant(
            self.product, "RYL-XL", "3500.00", is_active=False
        )

    def test_detail_by_slug_returns_200(self):
        r = self.client.get("/api/v1/catalog/products/royal-anarkali/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["slug"], "royal-anarkali")

    def test_detail_contains_category(self):
        data = self.client.get("/api/v1/catalog/products/royal-anarkali/").json()
        self.assertEqual(data["category"]["slug"], "anarkali")

    def test_detail_contains_collections(self):
        data = self.client.get("/api/v1/catalog/products/royal-anarkali/").json()
        col_slugs = [c["slug"] for c in data["collections"]]
        self.assertIn("festive", col_slugs)

    def test_detail_only_active_variants(self):
        data = self.client.get("/api/v1/catalog/products/royal-anarkali/").json()
        skus = [v["sku"] for v in data["variants"]]
        self.assertIn("RYL-M", skus)
        self.assertNotIn("RYL-XL", skus)  # Inactive variant must not appear

    # --- Wholesale price must NOT appear in variant detail responses ---

    def test_wholesale_price_not_in_variants(self):
        data = self.client.get("/api/v1/catalog/products/royal-anarkali/").json()
        for variant in data["variants"]:
            self.assertNotIn(
                "wholesale_price",
                variant,
                "wholesale_price must not be exposed in public catalog API",
            )

    def test_detail_has_retail_price(self):
        data = self.client.get("/api/v1/catalog/products/royal-anarkali/").json()
        self.assertEqual(data["variants"][0]["retail_price"], "3500.00")

    def test_detail_404_on_unknown_slug(self):
        r = self.client.get("/api/v1/catalog/products/nonexistent-slug/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        data = r.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "NOT_FOUND")

    def test_detail_404_on_draft_product(self):
        make_product("Draft Item", "draft-item", status_val=Product.Status.DRAFT)
        r = self.client.get("/api/v1/catalog/products/draft-item/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_detail_404_on_archived_product(self):
        make_product("Old Item", "old-item", status_val=Product.Status.ARCHIVED)
        r = self.client.get("/api/v1/catalog/products/old-item/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_detail_put_not_allowed(self):
        r = self.client.put("/api/v1/catalog/products/royal-anarkali/", {})
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(r.json()["error"]["code"], "METHOD_NOT_ALLOWED")

    def test_detail_patch_not_allowed(self):
        r = self.client.patch("/api/v1/catalog/products/royal-anarkali/", {})
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_detail_delete_not_allowed(self):
        r = self.client.delete("/api/v1/catalog/products/royal-anarkali/")
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


# ===========================================================================
# Query Efficiency Regression Test
# ===========================================================================


class ProductQueryEfficiencyTest(TestCase):
    """
    Regression test to detect N+1 query regressions in the product list endpoint.

    Baseline: creating N products with category + collection should not
    produce O(N) DB queries when listing. The prefetch_related/select_related
    in ProductViewSet.get_queryset() should collapse these into a constant
    number of queries regardless of result count.
    """

    def setUp(self):
        self.client = APIClient()
        cat = Category.objects.create(name="Kurtis", slug="kurtis-q")
        col = Collection.objects.create(name="New Arrivals", slug="new-arr-q")
        for i in range(5):
            p = make_product(f"Product {i}", f"product-query-{i}", category=cat)
            ProductCollection.objects.create(product=p, collection=col, ordering=i)
            make_variant(p, f"SKU-Q{i}", "999.00")

    def test_product_list_query_count_is_bounded(self):
        """
        Verify that listing 5 products with category + collection + variant does not
        produce O(N) queries. The select_related/prefetch_related in
        ProductViewSet.get_queryset() collapses all fetches into exactly 5 queries:
          1. COUNT for pagination
          2. SELECT products (with category via LEFT JOIN / select_related)
          3. SELECT collections (prefetch_related via JOIN through ProductCollection)
          4. SELECT variants (prefetch_related)
          5. SELECT product_collections (prefetch_related)
        This is constant regardless of the number of products in the result set.
        """
        with self.assertNumQueries(5):
            r = self.client.get("/api/v1/catalog/products/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["count"], 5)
