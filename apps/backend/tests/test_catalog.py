"""
Tests for Catalog domain models.
"""

import uuid
from decimal import Decimal

from django.db import IntegrityError
from django.test import TestCase

from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
    ProductVariant,
)


class CategoryModelTest(TestCase):
    """Test Category model functionality."""

    def test_create_category(self):
        cat = Category.objects.create(
            name="Kurtis",
            slug="kurtis",
            description="Traditional and contemporary kurtis",
        )
        self.assertIsInstance(cat.id, uuid.UUID)
        self.assertEqual(str(cat), "Kurtis")
        self.assertTrue(cat.is_active)

    def test_category_hierarchy(self):
        parent = Category.objects.create(name="Bottom Wear", slug="bottom-wear")
        child = Category.objects.create(name="Palazzo", slug="palazzo", parent=parent)
        self.assertEqual(child.parent, parent)
        self.assertIn(child, parent.children.all())

    def test_category_slug_unique(self):
        Category.objects.create(name="Dresses", slug="dresses")
        with self.assertRaises(IntegrityError):
            Category.objects.create(name="Other Dresses", slug="dresses")


class CollectionModelTest(TestCase):
    """Test Collection model functionality."""

    def test_create_collection(self):
        col = Collection.objects.create(
            name="New Arrivals",
            slug="new-arrivals",
            description="Latest additions",
        )
        self.assertIsInstance(col.id, uuid.UUID)
        self.assertEqual(str(col), "New Arrivals")
        self.assertTrue(col.is_active)

    def test_collection_slug_unique(self):
        Collection.objects.create(name="Festive", slug="festive")
        with self.assertRaises(IntegrityError):
            Collection.objects.create(name="Festive 2026", slug="festive")


class ProductModelTest(TestCase):
    """Test Product model functionality."""

    def setUp(self):
        self.category = Category.objects.create(
            name="Anarkali Sets", slug="anarkali-sets"
        )
        self.collection = Collection.objects.create(
            name="Bestsellers", slug="bestsellers"
        )

    def test_create_product(self):
        prod = Product.objects.create(
            name="Floral Anarkali Set",
            slug="floral-anarkali-set",
            description="Cotton floral anarkali set with dupatta",
            category=self.category,
            status=Product.Status.ACTIVE,
        )
        self.assertIsInstance(prod.id, uuid.UUID)
        self.assertEqual(str(prod), "Floral Anarkali Set")
        self.assertEqual(prod.status, Product.Status.ACTIVE)
        self.assertTrue(prod.is_active)

    def test_product_collection_relationship(self):
        prod = Product.objects.create(
            name="Silk Kurta Set",
            slug="silk-kurta-set",
            category=self.category,
        )
        pc = ProductCollection.objects.create(
            product=prod,
            collection=self.collection,
            ordering=1,
            is_active=True,
        )
        self.assertIn(self.collection, prod.collections.all())
        self.assertEqual(str(pc), f"{prod} in {self.collection}")

    def test_product_collection_unique_constraint(self):
        prod = Product.objects.create(
            name="Unique Kurta Set",
            slug="unique-kurta-set",
            category=self.category,
        )
        ProductCollection.objects.create(
            product=prod, collection=self.collection, ordering=1
        )
        with self.assertRaises(IntegrityError):
            ProductCollection.objects.create(
                product=prod, collection=self.collection, ordering=2
            )

    def test_product_slug_unique(self):
        Product.objects.create(
            name="Product A", slug="dup-slug", category=self.category
        )
        with self.assertRaises(IntegrityError):
            Product.objects.create(
                name="Product B", slug="dup-slug", category=self.category
            )


class ProductVariantModelTest(TestCase):
    """Test ProductVariant model functionality."""

    def setUp(self):
        self.product = Product.objects.create(
            name="Embroidered Kurti", slug="embroidered-kurti"
        )

    def test_create_variant(self):
        variant = ProductVariant.objects.create(
            product=self.product,
            sku="EMB-KRT-PNK-S",
            size="S",
            color="Pink",
            retail_price=Decimal("1499.00"),
            wholesale_price=Decimal("899.00"),
            is_active=True,
        )
        self.assertIsInstance(variant.id, uuid.UUID)
        self.assertEqual(str(variant), "EMB-KRT-PNK-S / S / Pink")
        self.assertEqual(variant.retail_price, Decimal("1499.00"))
        self.assertEqual(variant.wholesale_price, Decimal("899.00"))

    def test_sku_unique(self):
        ProductVariant.objects.create(
            product=self.product,
            sku="UNIQUE-SKU-001",
            size="M",
            color="Blue",
            retail_price=Decimal("999.00"),
        )
        with self.assertRaises(IntegrityError):
            ProductVariant.objects.create(
                product=self.product,
                sku="UNIQUE-SKU-001",
                size="L",
                color="Blue",
                retail_price=Decimal("999.00"),
            )
