"""
Closet by Chilli — Catalog Domain Serializers.

Defines public and administrative API representations for:
- Categories (including parent/child relationships and summaries)
- Collections (merchandising groupings)
- Product Variants (SKU, size, color, decimal pricing)
- Products (List and Detail representations with nested summaries and variants)

Adheres to:
- 04-backend-architecture.md
- 07-api-architecture.md
- 23-search-catalog-architecture.md
- 35-api-error-response-standards.md
"""

from decimal import Decimal

from rest_framework import serializers

from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductImage,
    ProductVariant,
)

# ==============================================================================
# Category Serializers
# ==============================================================================


class CategorySummarySerializer(serializers.ModelSerializer):
    """
    Minimal representation of Category for embedding in nested responses.

    Prevents circular references and redundant payload bloat.
    """

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
        ]
        read_only_fields = fields


class CategorySerializer(serializers.ModelSerializer):
    """
    Standard representation of a product taxonomy Category.

    Supports hierarchical categories via parent ID reference and parent slug.
    """

    parent_slug = serializers.CharField(
        source="parent.slug", read_only=True, allow_null=True
    )
    children = CategorySummarySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "parent",
            "parent_slug",
            "children",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_parent(self, value: Category | None) -> Category | None:
        """Prevent self-referential parent assignment."""
        if self.instance and value and self.instance.pk == value.pk:
            raise serializers.ValidationError("A category cannot be its own parent.")
        return value


# ==============================================================================
# Collection Serializers
# ==============================================================================


class CollectionSummarySerializer(serializers.ModelSerializer):
    """
    Minimal representation of Collection for embedding in nested responses.
    """

    class Meta:
        model = Collection
        fields = [
            "id",
            "name",
            "slug",
        ]
        read_only_fields = fields


class CollectionSerializer(serializers.ModelSerializer):
    """
    Standard representation of a merchandising Collection.
    """

    class Meta:
        model = Collection
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ==============================================================================
# Product Variant Serializers
# ==============================================================================


class ProductVariantSerializer(serializers.ModelSerializer):
    """
    Purchasable configuration of a Product (specific SKU, size, color, price).

    Monetary values preserve precision via string-coerced DecimalField.
    """

    retail_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
    )
    wholesale_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "product",
            "sku",
            "size",
            "color",
            "retail_price",
            "wholesale_price",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_sku(self, value: str) -> str:
        """Normalize SKU to uppercase and strip whitespace."""
        normalized = value.strip().upper()
        if not normalized:
            raise serializers.ValidationError("SKU cannot be blank.")
        return normalized


class ProductVariantSummarySerializer(serializers.ModelSerializer):
    """
    Nested variant representation for public Product Detail API responses.

    WHOLESALE PRICING DECISION:
    `wholesale_price` is intentionally excluded from this public serializer.
    The field exists on the model and is included in the admin-only
    `ProductVariantSerializer`, but must not be exposed over unauthenticated
    public catalog responses. Wholesale price visibility will be enforced
    server-side via a dedicated wholesale-authenticated serializer path
    when Supabase Auth / wholesale roles are implemented (future sprint).
    See: docs/23-search-catalog-architecture.md §9, docs/06-domain-model.md.
    """

    retail_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        coerce_to_string=True,
    )

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "sku",
            "size",
            "color",
            "retail_price",
            "is_active",
        ]
        read_only_fields = fields


# ==============================================================================
# Product Image Serializer
# ==============================================================================


class ProductImageSerializer(serializers.ModelSerializer):
    """
    Read-only representation of a ProductImage asset.

    Used as:
    - A single `primary_image` object in ProductListSerializer (card thumbnail).
    - A full `images` array in ProductDetailSerializer (PDP gallery).
    """

    class Meta:
        model = ProductImage
        fields = ["id", "image_url", "alt_text", "ordering", "is_primary"]
        read_only_fields = fields


# ==============================================================================
# Product Serializers
# ==============================================================================


class ProductListSerializer(serializers.ModelSerializer):
    """
    Optimized representation of Product for catalog listings and grids.

    Includes category and collections summaries for filtering and display.
    """

    category = CategorySummarySerializer(read_only=True)
    collections = CollectionSummarySerializer(many=True, read_only=True)
    min_price = serializers.SerializerMethodField()
    variant_count = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "status",
            "is_active",
            "category",
            "collections",
            "min_price",
            "variant_count",
            "primary_image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_min_price(self, obj: Product) -> str | None:
        """Calculate the lowest active variant retail price."""
        # Use prefetched variants if available in context to avoid N+1 queries
        active_variants = [v for v in obj.variants.all() if v.is_active]
        if not active_variants:
            return None
        min_p = min(v.retail_price for v in active_variants)
        return f"{min_p:.2f}"

    def get_variant_count(self, obj: Product) -> int:
        """Count total active sellable variants."""
        return len([v for v in obj.variants.all() if v.is_active])

    def get_primary_image(self, obj: Product) -> dict | None:
        """
        Return the primary image for product listing cards.

        Uses the prefetched `images` queryset — no extra DB query.
        Falls back to the first image by ordering if none is flagged primary.
        Returns None when the product has no images.
        """
        images = list(obj.images.all())
        if not images:
            return None
        primary = next((img for img in images if img.is_primary), images[0])
        return ProductImageSerializer(primary).data


class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Comprehensive representation of Product for Product Detail Pages (PDP).

    Embeds full category details, active collections, and purchasable variants.
    """

    category = CategorySummarySerializer(read_only=True)
    collections = CollectionSummarySerializer(many=True, read_only=True)
    variants = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "status",
            "is_active",
            "category",
            "collections",
            "variants",
            "images",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_variants(self, obj: Product) -> list[dict]:
        """Return serialized list of active variants."""
        active_variants = obj.variants.filter(is_active=True)
        return list(ProductVariantSummarySerializer(active_variants, many=True).data)


class ProductWriteSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating Products with relationship IDs.
    """

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category",
            "status",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_slug(self, value: str) -> str:
        """Normalize slug to lowercase."""
        return value.strip().lower()
