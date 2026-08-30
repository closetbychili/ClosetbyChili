"""
Unit tests for Catalog domain serializers.

Verifies:
- CategorySerializer (hierarchy, summaries, self-parent validation)
- CollectionSerializer (summaries, fields)
- ProductVariantSerializer (SKU normalization, decimal pricing, precision)
- ProductListSerializer (category/collection summaries, min_price, variant_count)
- ProductDetailSerializer (nested variants, exclusion of inactive variants)
- ProductWriteSerializer (validation, slug normalization)
- Edge cases (products without category, collections, or variants)
"""

from decimal import Decimal

from django.test import TestCase

from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
    ProductVariant,
)
from apps.catalog.serializers import (
    CategorySerializer,
    CategorySummarySerializer,
    CollectionSerializer,
    CollectionSummarySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductVariantSerializer,
    ProductVariantSummarySerializer,
    ProductWriteSerializer,
)


class CategorySerializerTest(TestCase):
    """Test serialization and validation for Category."""

    def test_category_serialization(self):
        """Verify CategorySerializer fields and structure."""
        cat = Category.objects.create(
            name="Kurtis",
            slug="kurtis",
            description="Traditional kurtis",
        )
        serializer = CategorySerializer(cat)
        data = serializer.data

        self.assertEqual(data["id"], str(cat.id))
        self.assertEqual(data["name"], "Kurtis")
        self.assertEqual(data["slug"], "kurtis")
        self.assertEqual(data["description"], "Traditional kurtis")
        self.assertIsNone(data["parent"])
        self.assertIsNone(data["parent_slug"])
        self.assertEqual(data["children"], [])
        self.assertTrue(data["is_active"])
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)

    def test_category_hierarchy_serialization(self):
        """Verify parent and children serialization."""
        parent = Category.objects.create(name="Bottom Wear", slug="bottom-wear")
        child = Category.objects.create(name="Palazzo", slug="palazzo", parent=parent)

        child_serializer = CategorySerializer(child)
        self.assertEqual(child_serializer.data["parent"], parent.id)
        self.assertEqual(child_serializer.data["parent_slug"], "bottom-wear")

        parent_serializer = CategorySerializer(parent)
        self.assertEqual(len(parent_serializer.data["children"]), 1)
        self.assertEqual(parent_serializer.data["children"][0]["slug"], "palazzo")

    def test_category_self_parent_validation(self):
        """Verify category cannot be set as its own parent."""
        cat = Category.objects.create(name="Dresses", slug="dresses")
        serializer = CategorySerializer(
            instance=cat,
            data={"name": "Dresses", "slug": "dresses", "parent": cat.id},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("parent", serializer.errors)

    def test_category_summary_serializer(self):
        """Verify minimal CategorySummarySerializer contains only id, name, slug."""
        cat = Category.objects.create(name="Dupattas", slug="dupattas")
        serializer = CategorySummarySerializer(cat)
        self.assertEqual(set(serializer.data.keys()), {"id", "name", "slug"})


class CollectionSerializerTest(TestCase):
    """Test serialization and validation for Collection."""

    def test_collection_serialization(self):
        """Verify CollectionSerializer output format."""
        col = Collection.objects.create(
            name="New Arrivals",
            slug="new-arrivals",
            description="Latest festive trends",
        )
        serializer = CollectionSerializer(col)
        data = serializer.data

        self.assertEqual(data["id"], str(col.id))
        self.assertEqual(data["name"], "New Arrivals")
        self.assertEqual(data["slug"], "new-arrivals")
        self.assertTrue(data["is_active"])

    def test_collection_summary_serializer(self):
        """Verify CollectionSummarySerializer contains only id, name, slug."""
        col = Collection.objects.create(name="Bestsellers", slug="bestsellers")
        serializer = CollectionSummarySerializer(col)
        self.assertEqual(set(serializer.data.keys()), {"id", "name", "slug"})


class ProductVariantSerializerTest(TestCase):
    """Test serialization and validation for ProductVariant."""

    def setUp(self):
        self.product = Product.objects.create(
            name="Silk Anarkali", slug="silk-anarkali"
        )

    def test_variant_serialization_and_price_precision(self):
        """Verify monetary fields preserve precision as strings."""
        variant = ProductVariant.objects.create(
            product=self.product,
            sku="SLK-ANR-RED-M",
            size="M",
            color="Red",
            retail_price=Decimal("2499.00"),
            wholesale_price=Decimal("1500.50"),
        )
        serializer = ProductVariantSerializer(variant)
        data = serializer.data

        self.assertEqual(data["sku"], "SLK-ANR-RED-M")
        self.assertEqual(data["retail_price"], "2499.00")
        self.assertEqual(data["wholesale_price"], "1500.50")
        self.assertEqual(data["product"], self.product.id)

    def test_variant_sku_normalization(self):
        """Verify SKU is trimmed and uppercased during validation."""
        serializer = ProductVariantSerializer(
            data={
                "product": self.product.id,
                "sku": "  slk-anr-blu-l  ",
                "size": "L",
                "color": "Blue",
                "retail_price": "1899.00",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["sku"], "SLK-ANR-BLU-L")

    def test_variant_negative_price_validation(self):
        """Verify negative retail price raises ValidationError."""
        serializer = ProductVariantSerializer(
            data={
                "product": self.product.id,
                "sku": "TEST-SKU",
                "retail_price": "-10.00",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("retail_price", serializer.errors)

    def test_variant_summary_serializer(self):
        """Verify ProductVariantSummarySerializer excludes product FK reference."""
        variant = ProductVariant.objects.create(
            product=self.product,
            sku="SLK-ANR-PNK-S",
            size="S",
            color="Pink",
            retail_price=Decimal("1299.00"),
        )
        serializer = ProductVariantSummarySerializer(variant)
        data = serializer.data

        self.assertNotIn("product", data)
        self.assertEqual(data["sku"], "SLK-ANR-PNK-S")
        self.assertEqual(data["retail_price"], "1299.00")


class ProductListSerializerTest(TestCase):
    """Test ProductListSerializer output and calculated fields."""

    def setUp(self):
        self.category = Category.objects.create(name="Anarkali", slug="anarkali")
        self.collection = Collection.objects.create(name="Festive", slug="festive")
        self.product = Product.objects.create(
            name="Royal Anarkali Set",
            slug="royal-anarkali-set",
            description="Pure silk embroidered anarkali",
            category=self.category,
            status=Product.Status.ACTIVE,
        )
        ProductCollection.objects.create(
            product=self.product,
            collection=self.collection,
            ordering=1,
        )
        # 2 active variants, 1 inactive variant
        ProductVariant.objects.create(
            product=self.product,
            sku="RYL-ANR-GLD-M",
            retail_price=Decimal("4500.00"),
            is_active=True,
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="RYL-ANR-GLD-S",
            retail_price=Decimal("3999.00"),
            is_active=True,
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="RYL-ANR-GLD-XL",
            retail_price=Decimal("2999.00"),
            is_active=False,  # Inactive - should not count towards min_price
        )

    def test_product_list_serialization(self):
        """Verify ProductListSerializer computes min_price and variant_count."""
        serializer = ProductListSerializer(self.product)
        data = serializer.data

        self.assertEqual(data["name"], "Royal Anarkali Set")
        self.assertEqual(data["slug"], "royal-anarkali-set")
        self.assertEqual(data["status"], "active")
        self.assertEqual(data["category"]["slug"], "anarkali")
        self.assertEqual(len(data["collections"]), 1)
        self.assertEqual(data["collections"][0]["slug"], "festive")
        self.assertEqual(data["min_price"], "3999.00")  # Lowest ACTIVE price
        self.assertEqual(data["variant_count"], 2)  # 2 active variants

    def test_product_without_category_and_collections(self):
        """Verify serialization when category and collections are empty."""
        prod = Product.objects.create(
            name="Standalone Product", slug="standalone-product"
        )
        serializer = ProductListSerializer(prod)
        data = serializer.data

        self.assertIsNone(data["category"])
        self.assertEqual(data["collections"], [])
        self.assertIsNone(data["min_price"])
        self.assertEqual(data["variant_count"], 0)


class ProductDetailSerializerTest(TestCase):
    """Test ProductDetailSerializer with nested active variants."""

    def test_product_detail_variants_nesting(self):
        """Verify ProductDetailSerializer embeds active variants only."""
        product = Product.objects.create(
            name="Embroidered Kurti", slug="embroidered-kurti"
        )
        ProductVariant.objects.create(
            product=product,
            sku="EMB-KRT-M",
            size="M",
            color="Teal",
            retail_price=Decimal("1800.00"),
            is_active=True,
        )
        ProductVariant.objects.create(
            product=product,
            sku="EMB-KRT-L",
            size="L",
            color="Teal",
            retail_price=Decimal("1800.00"),
            is_active=False,  # Inactive
        )

        serializer = ProductDetailSerializer(product)
        data = serializer.data

        self.assertEqual(len(data["variants"]), 1)
        self.assertEqual(data["variants"][0]["sku"], "EMB-KRT-M")


class ProductWriteSerializerTest(TestCase):
    """Test ProductWriteSerializer input validation."""

    def test_product_slug_normalization(self):
        """Verify slug is lowercased during validation."""
        category = Category.objects.create(name="Kurtis", slug="kurtis")
        serializer = ProductWriteSerializer(
            data={
                "name": "Casual Kurti",
                "slug": "  CASUAL-KURTI  ",
                "category": category.id,
                "status": "draft",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["slug"], "casual-kurti")
