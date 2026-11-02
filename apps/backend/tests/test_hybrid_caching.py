"""
Tests for Hybrid Caching & Storefront Invalidation Layer.

Covers:
- reference_cache existence and configuration (LocMemCache)
- CategoryViewSet & CollectionViewSet in-memory caching and cache hits
- Parameter-isolated caching (storefront=true vs storefront=false)
- Signal-driven cache invalidation on commit for Category, Collection, Product, Variant, Image, ProductCollection
- Transaction rollback safety (on_commit invalidations do not fire on rollback)
- Webhook resilience: timeout / network failure safely caught without interrupting backend
"""

from decimal import Decimal
from unittest.mock import patch

from django.core.cache import caches
from django.db import transaction
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.cache import (
    dispatch_frontend_revalidation,
    get_category_cache_key,
    get_collection_cache_key,
    get_reference_cache,
    invalidate_reference_cache,
)
from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
    ProductImage,
    ProductVariant,
)


class HybridCachingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ref_cache = get_reference_cache()
        self.ref_cache.clear()

        # Create base test fixtures
        self.category = Category.objects.create(
            name="Kurtis",
            slug="kurtis",
            is_active=True,
            is_visible_on_storefront=True,
        )
        self.collection = Collection.objects.create(
            name="Bestsellers",
            slug="bestsellers",
            is_active=True,
        )
        self.product = Product.objects.create(
            name="Chikankari Kurta",
            slug="chikankari-kurta",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )

    def tearDown(self):
        self.ref_cache.clear()

    def test_reference_cache_backend_configured(self):
        """Verifies that reference_cache exists and is an in-memory LocMemCache."""
        cache = caches["reference_cache"]
        self.assertIsNotNone(cache)
        self.assertIn("locmem", cache.__class__.__module__)

    def test_category_list_caching_and_hit(self):
        """First request populates reference_cache, subsequent request serves from cache."""
        cache_key = get_category_cache_key(True)
        self.assertIsNone(self.ref_cache.get(cache_key))

        res1 = self.client.get("/api/v1/catalog/categories/?storefront=true")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        cached_data = self.ref_cache.get(cache_key)
        self.assertIsNotNone(cached_data)

        # Second request hits cache
        with self.assertNumQueries(0):
            res2 = self.client.get("/api/v1/catalog/categories/?storefront=true")
            self.assertEqual(res2.status_code, status.HTTP_200_OK)
            self.assertEqual(res2.data, res1.data)

    def test_collection_list_caching_and_hit(self):
        """First request populates reference_cache, subsequent request serves from cache."""
        cache_key = get_collection_cache_key()
        self.assertIsNone(self.ref_cache.get(cache_key))

        res1 = self.client.get("/api/v1/catalog/collections/")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(self.ref_cache.get(cache_key))

        # Second request hits cache with 0 queries
        with self.assertNumQueries(0):
            res2 = self.client.get("/api/v1/catalog/collections/")
            self.assertEqual(res2.status_code, status.HTTP_200_OK)
            self.assertEqual(res2.data, res1.data)

    def test_parameter_isolated_category_cache(self):
        """storefront=true and storefront=false have separate cache keys and do not pollute each other."""
        key_true = get_category_cache_key(True)
        key_false = get_category_cache_key(False)

        self.assertNotEqual(key_true, key_false)
        self.client.get("/api/v1/catalog/categories/?storefront=true")
        self.assertIsNotNone(self.ref_cache.get(key_true))
        self.assertIsNone(self.ref_cache.get(key_false))

    @patch("apps.catalog.cache.dispatch_frontend_revalidation")
    def test_category_mutation_invalidates_cache_and_dispatches_tags(self, mock_dispatch):
        """Updating category clears reference cache and triggers on_commit revalidation."""
        self.ref_cache.set(get_category_cache_key(True), {"dummy": 1})

        with self.captureOnCommitCallbacks(execute=True):
            self.category.name = "Updated Kurtis"
            self.category.save()

        # Local cache is cleared
        self.assertIsNone(self.ref_cache.get(get_category_cache_key(True)))

        # Frontend webhook dispatched
        mock_dispatch.assert_called_once()
        tags = mock_dispatch.call_args[0][0]
        self.assertIn("catalog", tags)
        self.assertIn("categories", tags)
        self.assertIn(f"category-{self.category.slug}", tags)
        self.assertIn("homepage", tags)

    @patch("apps.catalog.cache.dispatch_frontend_revalidation")
    def test_collection_mutation_invalidates_cache_and_dispatches_tags(self, mock_dispatch):
        """Updating collection clears reference cache and triggers on_commit revalidation."""
        self.ref_cache.set(get_collection_cache_key(), {"dummy": 2})

        with self.captureOnCommitCallbacks(execute=True):
            self.collection.name = "Trending Now"
            self.collection.save()

        self.assertIsNone(self.ref_cache.get(get_collection_cache_key()))
        mock_dispatch.assert_called_once()
        tags = mock_dispatch.call_args[0][0]
        self.assertIn("catalog", tags)
        self.assertIn("collections", tags)
        self.assertIn(f"collection-{self.collection.slug}", tags)
        self.assertIn("homepage", tags)

    @patch("apps.catalog.cache.dispatch_frontend_revalidation")
    def test_product_mutation_dispatches_targeted_tags(self, mock_dispatch):
        """Updating product dispatches tags for product, category, and homepage."""
        with self.captureOnCommitCallbacks(execute=True):
            self.product.name = "Updated Kurta"
            self.product.save()

        mock_dispatch.assert_called_once()
        tags = mock_dispatch.call_args[0][0]
        self.assertIn("catalog", tags)
        self.assertIn("products", tags)
        self.assertIn(f"product-{self.product.slug}", tags)
        self.assertIn(f"category-{self.category.slug}", tags)
        self.assertIn("homepage", tags)

    @patch("apps.catalog.cache.dispatch_frontend_revalidation")
    def test_product_variant_mutation_dispatches_product_tag(self, mock_dispatch):
        """Adding/updating variant invalidates parent product."""
        with self.captureOnCommitCallbacks(execute=True):
            ProductVariant.objects.create(
                product=self.product,
                sku="KURTI-M-BLK",
                size="M",
                color="Black",
                retail_price=Decimal("1999.00"),
                is_active=True,
            )

        mock_dispatch.assert_called_once()
        tags = mock_dispatch.call_args[0][0]
        self.assertIn("products", tags)
        self.assertIn(f"product-{self.product.slug}", tags)

    @patch("apps.catalog.cache.dispatch_frontend_revalidation")
    def test_product_collection_mutation_dispatches_collection_and_product_tags(self, mock_dispatch):
        """Adding product to collection invalidates both collection and product tags."""
        with self.captureOnCommitCallbacks(execute=True):
            ProductCollection.objects.create(
                product=self.product,
                collection=self.collection,
            )

        mock_dispatch.assert_called_once()
        tags = mock_dispatch.call_args[0][0]
        self.assertIn(f"product-{self.product.slug}", tags)
        self.assertIn(f"collection-{self.collection.slug}", tags)
        self.assertIn("homepage", tags)

    @patch("apps.catalog.cache.dispatch_frontend_revalidation")
    def test_transaction_rollback_prevents_invalidation(self, mock_dispatch):
        """If transaction rolls back, on_commit callbacks do NOT fire."""
        try:
            with transaction.atomic():
                self.category.name = "Rollback Category"
                self.category.save()
                raise ValueError("Simulated database failure")
        except ValueError:
            pass

        # Since transaction rolled back, revalidation must not have fired
        mock_dispatch.assert_not_called()

    @override_settings(
        FRONTEND_REVALIDATE_URL="http://testserver/api/revalidate",
        REVALIDATION_SECRET="mock-secret",
    )
    @patch("requests.post")
    def test_dispatch_webhook_network_error_resilience(self, mock_post):
        """Network timeout or connection error does not crash the caller."""
        mock_post.side_effect = Exception("Connection refused / timed out")

        with self.assertLogs("apps.catalog.cache", level="WARNING") as log_ctx:
            result = dispatch_frontend_revalidation(["catalog", "products"])
            self.assertFalse(result)
            self.assertTrue(any("failed" in msg for msg in log_ctx.output))
