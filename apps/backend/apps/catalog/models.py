"""
Closet by Chilli — Catalog Domain Models

Entities defined by 05-database-architecture.md and 06-domain-model.md:
- Category: Product taxonomy with hierarchical parent/child support.
- Collection: Merchandising groupings (New Arrivals, Bestsellers, etc.).
- Product: Merchandise concept displayed in the storefront.
- ProductCollection: M2M relationship with ordering and active state.
- ProductVariant: Purchasable configuration (size/color) with unique SKU.
- ProductImage: Ordered media assets attached to a Product (Sprint 0.3).
"""

import uuid

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class Category(models.Model):
    """
    Product taxonomy category.

    Supports hierarchical parent/child relationships for subcategories.
    Soft-deletable via is_active flag (05-database-architecture.md §9).

    Examples: Kurtis, Kurta Sets, Dresses, Bottom Wear.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, default="")
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "catalog_categories"
        verbose_name_plural = "categories"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"], name="idx_category_slug"),
            models.Index(fields=["parent"], name="idx_category_parent"),
        ]

    def __str__(self) -> str:
        return self.name


class Collection(models.Model):
    """
    Merchandising grouping separate from category taxonomy.

    Collections answer: "How do we want to merchandise these products right now?"
    Soft-deletable via is_active flag (05-database-architecture.md §9).

    Examples: New Arrivals, Bestsellers, Festive Collection.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "catalog_collections"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"], name="idx_collection_slug"),
        ]

    def __str__(self) -> str:
        return self.name


class Product(models.Model):
    """
    Merchandise concept displayed in the storefront.

    A Product is not the exact inventory unit — that is the ProductVariant.
    Products own product-level information: name, description, category,
    and merchandising state.

    Lifecycle: Draft → Active → Archived (06-domain-model.md §56).
    Soft-deletable via is_active flag (05-database-architecture.md §9).
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, default="")
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    collections: models.ManyToManyField[Collection, "ProductCollection"] = (
        models.ManyToManyField(
            Collection,
            through="ProductCollection",
            related_name="products",
            blank=True,
        )
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "catalog_products"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["slug"], name="idx_product_slug"),
            models.Index(fields=["status"], name="idx_product_status"),
        ]

    def __str__(self) -> str:
        return self.name


class ProductCollection(models.Model):
    """
    Product-to-Collection relationship supporting ordering and active state.

    Defined by 05-database-architecture.md §15:
    - Ordering
    - Active/inactive state
    - Collection-specific merchandising
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="product_collections",
    )
    collection = models.ForeignKey(
        Collection,
        on_delete=models.CASCADE,
        related_name="product_collections",
    )
    ordering = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "catalog_product_collections"
        ordering = ["ordering"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "collection"],
                name="uq_product_collection",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.product} in {self.collection}"


class ProductVariant(models.Model):
    """
    Purchasable configuration of a Product.

    Differs by size, color, or other options (06-domain-model.md §8).
    Each variant has a unique, non-empty, stable SKU (05-database-architecture.md §12).
    Pricing uses NUMERIC/DECIMAL types (05-database-architecture.md §20).

    Variant availability is independent of product visibility
    (06-domain-model.md §57).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants",
    )
    sku = models.CharField(max_length=100, unique=True)
    size = models.CharField(max_length=50, blank=True, default="")
    color = models.CharField(max_length=100, blank=True, default="")
    retail_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    wholesale_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "catalog_product_variants"
        ordering = ["sku"]
        indexes = [
            models.Index(fields=["sku"], name="idx_variant_sku"),
            models.Index(fields=["product"], name="idx_variant_product"),
        ]

    def __str__(self) -> str:
        parts = [self.sku]
        if self.size:
            parts.append(self.size)
        if self.color:
            parts.append(self.color)
        return " / ".join(parts)


class ProductImage(models.Model):
    """
    Ordered media asset attached to a Product (Sprint 0.3).

    Stores a relative frontend asset path (e.g. /assets/products/kurti-1.jpg)
    in `image_url` so the value is environment-agnostic — the frontend resolves
    it relative to its own origin.  Absolute URLs (Cloudinary, S3) are equally
    valid once a media service is introduced.

    Ordering rules:
    - `ordering` controls display order (ascending).
    - Exactly one image per product may have `is_primary=True`; this is the
      image shown on product listing cards.  Enforced at the DB level via a
      partial unique constraint.
    - The (product, ordering) pair is unique, which gives the seed command a
      stable, deterministic key for `update_or_create`.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
    )
    # Relative path or absolute URL — stored as plain text.
    # Using CharField instead of URLField to allow relative paths such as
    # /assets/products/kurti-1.jpg without requiring an environment-specific
    # domain prefix.
    image_url = models.CharField(max_length=2048)
    alt_text = models.CharField(max_length=512, blank=True, default="")
    ordering = models.IntegerField(default=0)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "catalog_product_images"
        ordering = ["ordering", "created_at"]
        indexes = [
            models.Index(fields=["product"], name="idx_product_image_product"),
        ]
        constraints = [
            # Seed command uses (product, ordering) as update_or_create key.
            models.UniqueConstraint(
                fields=["product", "ordering"],
                name="uq_product_image_ordering",
            ),
            # At most one primary image per product (enforced via partial index).
            models.UniqueConstraint(
                fields=["product"],
                condition=Q(is_primary=True),
                name="uq_product_primary_image",
            ),
        ]

    def __str__(self) -> str:
        flag = " [primary]" if self.is_primary else ""
        return f"{self.product} — image {self.ordering}{flag}"
