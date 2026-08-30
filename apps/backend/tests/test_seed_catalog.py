"""
Unit and integration tests for Catalog & Inventory Seed Data.

Verifies:
- seed command populates all models with expected counts
- category hierarchies and product-collection relationships
- 1:1 inventory record creation
- idempotency (running seed multiple times produces no duplicates)
- Catalog API endpoints return real data against seeded database
"""

from decimal import Decimal

from django.core.management import call_command
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.management.commands.seed_catalog import run_catalog_seed
from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductVariant,
)
from apps.inventory.models import InventoryItem


class CatalogSeedCommandTest(TestCase):
    """Test seed execution, integrity, and idempotency."""

    def test_seed_creates_expected_records(self):
        """Verify all domain entities are created with accurate counts."""
        counts = run_catalog_seed()

        self.assertEqual(counts["categories"], 11)
        self.assertEqual(counts["collections"], 5)
        self.assertEqual(counts["products"], 9)
        self.assertEqual(counts["variants"], 34)
        self.assertEqual(counts["inventory_items"], 34)

        # Verify database model counts
        self.assertEqual(Category.objects.count(), 11)
        self.assertEqual(Collection.objects.count(), 5)
        self.assertEqual(Product.objects.count(), 9)
        self.assertEqual(ProductVariant.objects.count(), 34)
        self.assertEqual(InventoryItem.objects.count(), 34)

    def test_seed_idempotency(self):
        """Verify executing the seed command multiple times causes zero duplicate records."""
        # First execution
        call_command("seed_catalog")
        initial_cat_count = Category.objects.count()
        initial_col_count = Collection.objects.count()
        initial_prod_count = Product.objects.count()
        initial_var_count = ProductVariant.objects.count()
        initial_inv_count = InventoryItem.objects.count()

        # Second execution
        call_command("seed_catalog")
        self.assertEqual(Category.objects.count(), initial_cat_count)
        self.assertEqual(Collection.objects.count(), initial_col_count)
        self.assertEqual(Product.objects.count(), initial_prod_count)
        self.assertEqual(ProductVariant.objects.count(), initial_var_count)
        self.assertEqual(InventoryItem.objects.count(), initial_inv_count)

    def test_category_hierarchy_relationships(self):
        """Verify subcategories correctly reference their parent categories."""
        run_catalog_seed()

        kurtis = Category.objects.get(slug="kurtis")
        printed_kurtis = Category.objects.get(slug="printed-kurtis")
        self.assertEqual(printed_kurtis.parent, kurtis)

        kurta_sets = Category.objects.get(slug="kurta-sets")
        two_piece = Category.objects.get(slug="2-piece-sets")
        self.assertEqual(two_piece.parent, kurta_sets)

    def test_inventory_and_pricing_integrity(self):
        """Verify inventory quantities are non-negative and prices satisfy decimal precision."""
        run_catalog_seed()

        for variant in ProductVariant.objects.all():
            self.assertGreaterEqual(variant.retail_price, Decimal("0.00"))
            if variant.wholesale_price is not None:
                self.assertGreaterEqual(variant.wholesale_price, Decimal("0.00"))

            # Check 1:1 inventory item
            inv = InventoryItem.objects.get(variant=variant)
            self.assertGreaterEqual(inv.quantity_available, 0)
            self.assertEqual(inv.quantity_reserved, 0)


class SeededCatalogApiVerificationTest(TestCase):
    """Verify Catalog REST API responses when populated with seed data."""

    def setUp(self):
        self.client = APIClient()
        run_catalog_seed()

    def test_api_categories_list(self):
        """GET /api/v1/catalog/categories/ returns seeded categories."""
        response = self.client.get("/api/v1/catalog/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["count"], 11)

        slugs = [c["slug"] for c in data["results"]]
        self.assertIn("kurtis", slugs)
        self.assertIn("anarkali-sets", slugs)
        self.assertIn("dresses", slugs)

    def test_api_collections_list(self):
        """GET /api/v1/catalog/collections/ returns seeded collections."""
        response = self.client.get("/api/v1/catalog/collections/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["count"], 5)

        slugs = [c["slug"] for c in data["results"]]
        self.assertIn("new-arrivals", slugs)
        self.assertIn("festive-collection", slugs)
        self.assertIn("bestsellers", slugs)

    def test_api_products_list_and_visibility(self):
        """GET /api/v1/catalog/products/ returns only active products (8 of 9 seeded)."""
        response = self.client.get("/api/v1/catalog/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # 9 seeded, 8 active, 1 draft ('upcoming-silk-saree')
        self.assertEqual(data["count"], 8)

        slugs = [p["slug"] for p in data["results"]]
        self.assertIn("sunflower-block-print-kurti", slugs)
        self.assertIn("royal-silk-anarkali-set", slugs)
        self.assertNotIn("upcoming-silk-saree", slugs)

    def test_api_product_detail_endpoint(self):
        """GET /api/v1/catalog/products/{slug}/ returns full detail with active variants."""
        response = self.client.get(
            "/api/v1/catalog/products/sunflower-block-print-kurti/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data["name"], "Sunflower Block Print Kurti")
        self.assertEqual(data["category"]["slug"], "printed-kurtis")
        col_slugs = [c["slug"] for c in data["collections"]]
        self.assertIn("new-arrivals", col_slugs)
        self.assertIn("summer-essentials", col_slugs)

        # 5 variants seeded (4 active, 1 inactive 'SBP-KRT-GRN-M')
        self.assertEqual(len(data["variants"]), 4)
        var_skus = [v["sku"] for v in data["variants"]]
        self.assertIn("SBP-KRT-YEL-S", var_skus)
        self.assertNotIn("SBP-KRT-GRN-M", var_skus)
