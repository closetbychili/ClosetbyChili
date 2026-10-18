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
from typing import Any

from django.db import models, transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
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
    image = serializers.CharField(source="image_url", read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "short_description",
            "image_url",
            "image",
            "image_alt",
            "ordering",
            "is_visible_on_storefront",
            "parent",
            "parent_slug",
            "children",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_parent(self, value: Category | None) -> Category | None:
        """Prevent self-referential parent assignment and circular hierarchy."""
        if not value:
            return None
        if self.instance:
            if self.instance.pk == value.pk:
                raise serializers.ValidationError("A category cannot be its own parent.")
            curr = value
            visited = {self.instance.pk}
            while curr is not None:
                if curr.pk in visited:
                    raise serializers.ValidationError(
                        "Circular parent category relationship detected. A category cannot have itself or one of its descendants as its parent."
                    )
                visited.add(curr.pk)
                curr = curr.parent
        return value


class AdminCategorySerializer(serializers.ModelSerializer):
    """
    Administrative representation of a product Category (Sprint A2.5).

    Supports:
    - Hierarchical parent/child relationships with full circular validation
    - Slug auto-generation from name if omitted/blank
    - Slug uniqueness enforcement
    - Direct parent name and slug references
    - Subcategory children summaries
    - Aggregated product count
    - Storefront card configuration (image, alt text, short description, ordering, storefront visibility)
    """

    parent = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
    )
    parent_slug = serializers.CharField(
        source="parent.slug", read_only=True, allow_null=True
    )
    parent_name = serializers.CharField(
        source="parent.name", read_only=True, allow_null=True
    )
    children = CategorySummarySerializer(many=True, read_only=True)
    product_count = serializers.IntegerField(read_only=True, default=0)
    image = serializers.CharField(source="image_url", read_only=True)
    slug = serializers.SlugField(
        max_length=255,
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "short_description",
            "image_url",
            "image",
            "image_public_id",
            "image_alt",
            "ordering",
            "is_visible_on_storefront",
            "parent",
            "parent_slug",
            "parent_name",
            "children",
            "is_active",
            "product_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Category name is required.")
        if len(trimmed) > 255:
            raise serializers.ValidationError("Category name cannot exceed 255 characters.")
        return trimmed

    def validate_slug(self, value: str) -> str:
        trimmed = value.strip().lower()
        if not trimmed:
            return ""
        qs = Category.objects.filter(slug=trimmed)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A category with this slug already exists.")
        return trimmed

    def validate_parent(self, value: Category | None) -> Category | None:
        if not value:
            return None
        if self.instance:
            if self.instance.pk == value.pk:
                raise serializers.ValidationError("A category cannot be its own parent.")
            curr = value
            visited = {self.instance.pk}
            while curr is not None:
                if curr.pk in visited:
                    raise serializers.ValidationError(
                        "Circular parent category relationship detected. A category cannot have itself or one of its descendants as its parent."
                    )
                visited.add(curr.pk)
                curr = curr.parent
        return value

    def validate(self, attrs):
        slug = attrs.get("slug")
        if not slug:
            if not self.instance:
                name = attrs.get("name", "")
                base_slug = slugify(name) or "category"
                candidate = base_slug
                counter = 1
                while Category.objects.filter(slug=candidate).exists():
                    candidate = f"{base_slug}-{counter}"
                    counter += 1
                attrs["slug"] = candidate
            else:
                if "slug" in attrs:
                    name = attrs.get("name", self.instance.name)
                    base_slug = slugify(name) or "category"
                    candidate = base_slug
                    counter = 1
                    while (
                        Category.objects.filter(slug=candidate)
                        .exclude(pk=self.instance.pk)
                        .exists()
                    ):
                        candidate = f"{base_slug}-{counter}"
                        counter += 1
                    attrs["slug"] = candidate
        return attrs


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


class AdminCollectionSerializer(serializers.ModelSerializer):
    """
    Administrative representation of a merchandising Collection (Sprint A2.5).

    Supports:
    - Slug auto-generation from name if omitted/blank
    - Slug uniqueness enforcement
    - Aggregated product count
    - Active/inactive toggle state
    """

    product_count = serializers.IntegerField(read_only=True, default=0)
    slug = serializers.SlugField(
        max_length=255,
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = Collection
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_active",
            "product_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Collection name is required.")
        if len(trimmed) > 255:
            raise serializers.ValidationError("Collection name cannot exceed 255 characters.")
        return trimmed

    def validate_slug(self, value: str) -> str:
        trimmed = value.strip().lower()
        if not trimmed:
            return ""
        qs = Collection.objects.filter(slug=trimmed)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A collection with this slug already exists.")
        return trimmed

    def validate(self, attrs):
        slug = attrs.get("slug")
        if not slug:
            if not self.instance:
                name = attrs.get("name", "")
                base_slug = slugify(name) or "collection"
                candidate = base_slug
                counter = 1
                while Collection.objects.filter(slug=candidate).exists():
                    candidate = f"{base_slug}-{counter}"
                    counter += 1
                attrs["slug"] = candidate
            else:
                if "slug" in attrs:
                    name = attrs.get("name", self.instance.name)
                    base_slug = slugify(name) or "collection"
                    candidate = base_slug
                    counter = 1
                    while (
                        Collection.objects.filter(slug=candidate)
                        .exclude(pk=self.instance.pk)
                        .exists()
                    ):
                        candidate = f"{base_slug}-{counter}"
                        counter += 1
                    attrs["slug"] = candidate
        return attrs


class AdminCollectionProductSerializer(serializers.ModelSerializer):
    """
    Representation of a product within a collection, with ordering and status.
    """

    product_id = serializers.UUIDField(source="product.id", read_only=True)
    name = serializers.CharField(source="product.name", read_only=True)
    slug = serializers.CharField(source="product.slug", read_only=True)
    status = serializers.CharField(source="product.status", read_only=True)
    sku = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    is_product_active = serializers.BooleanField(source="product.is_active", read_only=True)

    class Meta:
        model = ProductCollection
        fields = [
            "id",
            "product_id",
            "name",
            "slug",
            "status",
            "sku",
            "primary_image",
            "is_product_active",
            "ordering",
            "is_active",
            "created_at",
        ]
        read_only_fields = fields

    def get_sku(self, obj: ProductCollection) -> str | None:
        variants = list(obj.product.variants.all())
        active = [v for v in variants if v.is_active]
        return active[0].sku if active else (variants[0].sku if variants else None)

    def get_primary_image(self, obj: ProductCollection) -> Any:
        images = list(obj.product.images.all())
        if not images:
            return None
        primary = next((img for img in images if img.is_primary), images[0])
        return dict(ProductImageSerializer(primary).data)


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
    sale_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
        required=False,
        allow_null=True,
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
            "sale_price",
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

    def validate(self, attrs):
        retail_price = attrs.get("retail_price")
        if retail_price is None and self.instance:
            retail_price = self.instance.retail_price

        sale_price = attrs.get("sale_price")
        if sale_price is not None and retail_price is not None:
            if sale_price >= retail_price:
                raise serializers.ValidationError({
                    "sale_price": "Sale price must be strictly lower than regular retail price."
                })
        return attrs


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
    sale_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        coerce_to_string=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "sku",
            "size",
            "color",
            "retail_price",
            "sale_price",
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
        fields = [
            "id",
            "image_url",
            "alt_text",
            "ordering",
            "is_primary",
            "public_id",
            "width",
            "height",
            "format",
            "resource_type",
            "bytes",
        ]
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
        min_p = min(
            v.sale_price if (v.sale_price is not None and v.sale_price < v.retail_price) else v.retail_price
            for v in active_variants
        )
        return f"{min_p:.2f}"

    def get_variant_count(self, obj: Product) -> int:
        """Count total active sellable variants."""
        return len([v for v in obj.variants.all() if v.is_active])

    def get_primary_image(self, obj: Product) -> Any:
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
        return dict(ProductImageSerializer(primary).data)


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


# ==============================================================================
# Admin Product Serializers (Sprint A2.1)
# ==============================================================================


class AdminProductStockSummarySerializer(serializers.Serializer):
    """
    Real-time stock aggregation across active product variants.
    """

    total_available = serializers.IntegerField()
    total_reserved = serializers.IntegerField()
    status = serializers.ChoiceField(
        choices=["in_stock", "low_stock", "out_of_stock", "untracked", "no_variants"]
    )


class AdminProductListSerializer(serializers.ModelSerializer):
    """
    Comprehensive administrative representation of Product for backoffice management.

    Includes all publication statuses (draft, active, archived), primary SKU,
    price range, variant count, prefetched primary image, and reliable stock summary.
    """

    category = CategorySummarySerializer(read_only=True)
    collections = CollectionSummarySerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    sku = serializers.SerializerMethodField()
    skus = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    max_price = serializers.SerializerMethodField()
    variant_count = serializers.SerializerMethodField()
    stock_summary = serializers.SerializerMethodField()

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
            "primary_image",
            "sku",
            "skus",
            "min_price",
            "max_price",
            "variant_count",
            "stock_summary",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_primary_image(self, obj: Product) -> Any:
        """Return the primary image for listing thumbnail."""
        images = list(obj.images.all())
        if not images:
            return None
        primary = next((img for img in images if img.is_primary), images[0])
        return dict(ProductImageSerializer(primary).data)

    def get_sku(self, obj: Product) -> str | None:
        """Return primary active variant SKU, or first available SKU."""
        variants = list(obj.variants.all())
        if not variants:
            return None
        active = [v for v in variants if v.is_active]
        return active[0].sku if active else variants[0].sku

    def get_skus(self, obj: Product) -> list[str]:
        """Return list of all variant SKUs."""
        return [v.sku for v in obj.variants.all()]

    def get_min_price(self, obj: Product) -> str | None:
        """Calculate the lowest active variant retail price."""
        variants = [v for v in obj.variants.all() if v.is_active] or list(obj.variants.all())
        if not variants:
            return None
        min_p = min(v.retail_price for v in variants)
        return f"{min_p:.2f}"

    def get_max_price(self, obj: Product) -> str | None:
        """Calculate the highest active variant retail price."""
        variants = [v for v in obj.variants.all() if v.is_active] or list(obj.variants.all())
        if not variants:
            return None
        max_p = max(v.retail_price for v in variants)
        return f"{max_p:.2f}"

    def get_variant_count(self, obj: Product) -> int:
        """Count total variants associated with this product."""
        return len(obj.variants.all())

    def get_stock_summary(self, obj: Product) -> dict:
        """
        Aggregate available and reserved inventory counts across all variants.
        Provides accurate, verifiable inventory counts directly from ledger items.
        """
        variants = list(obj.variants.all())
        if not variants:
            return {
                "total_available": 0,
                "total_reserved": 0,
                "status": "no_variants",
            }

        total_available = 0
        total_reserved = 0
        has_inventory = False

        for v in variants:
            try:
                inv = getattr(v, "inventory", None)
            except Exception:
                inv = None
            if inv is not None:
                has_inventory = True
                total_available += inv.quantity_available
                total_reserved += inv.quantity_reserved

        if not has_inventory:
            return {
                "total_available": 0,
                "total_reserved": 0,
                "status": "untracked",
            }

        if total_available <= 0:
            stock_status = "out_of_stock"
        elif total_available <= 5:
            stock_status = "low_stock"
        else:
            stock_status = "in_stock"

        return {
            "total_available": total_available,
            "total_reserved": total_reserved,
            "status": stock_status,
        }


class AdminProductImageSerializer(serializers.ModelSerializer):
    """
    Administrative serializer for managing product images and gallery ordering.
    """

    ordering = serializers.IntegerField(required=False, default=None, allow_null=True)

    class Meta:
        model = ProductImage
        fields = [
            "id",
            "product",
            "image_url",
            "public_id",
            "width",
            "height",
            "format",
            "resource_type",
            "bytes",
            "alt_text",
            "ordering",
            "is_primary",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        validators = []

    def validate_image_url(self, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Image URL cannot be blank.")
        return trimmed

    @transaction.atomic
    def create(self, validated_data):
        product = validated_data["product"]
        is_primary = validated_data.get("is_primary", False)
        ordering = validated_data.get("ordering")

        if ordering is None:
            max_order = ProductImage.objects.filter(product=product).aggregate(
                max_order=models.Max("ordering")
            )["max_order"]
            ordering = (max_order + 1) if max_order is not None else 0
            validated_data["ordering"] = ordering
        elif ProductImage.objects.filter(product=product, ordering=ordering).exists():
            ProductImage.objects.filter(product=product, ordering__gte=ordering).update(
                ordering=models.F("ordering") + 1
            )

        if not ProductImage.objects.filter(product=product).exists():
            is_primary = True
            validated_data["is_primary"] = True

        if is_primary:
            ProductImage.objects.filter(product=product, is_primary=True).update(is_primary=False)

        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        is_primary = validated_data.get("is_primary")
        if is_primary is True:
            ProductImage.objects.filter(product=instance.product, is_primary=True).exclude(
                pk=instance.pk
            ).update(is_primary=False)

        new_ordering = validated_data.get("ordering")
        if new_ordering is not None and new_ordering != instance.ordering:
            if ProductImage.objects.filter(
                product=instance.product, ordering=new_ordering
            ).exclude(pk=instance.pk).exists():
                ProductImage.objects.filter(
                    product=instance.product, ordering__gte=new_ordering
                ).exclude(pk=instance.pk).update(ordering=models.F("ordering") + 1)

        return super().update(instance, validated_data)


class AdminProductVariantSerializer(serializers.ModelSerializer):
    """
    Administrative serializer for managing product variants and inventory units.
    """

    retail_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
    )
    sale_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
        required=False,
        allow_null=True,
    )
    wholesale_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
        required=False,
        allow_null=True,
    )
    initial_stock = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
        write_only=True,
    )
    inventory = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "product",
            "sku",
            "size",
            "color",
            "retail_price",
            "sale_price",
            "wholesale_price",
            "is_active",
            "initial_stock",
            "inventory",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "inventory", "created_at", "updated_at"]

    def get_inventory(self, obj: ProductVariant) -> dict:
        item = getattr(obj, "inventory", None)
        avail = item.quantity_available if item else 0
        res = item.quantity_reserved if item else 0
        if avail <= 0:
            status = "out_of_stock"
        elif avail <= 5:
            status = "low_stock"
        else:
            status = "in_stock"
        return {
            "quantity_available": avail,
            "quantity_reserved": res,
            "stock_status": status,
        }

    def validate_sku(self, value: str) -> str:
        trimmed = value.strip().upper()
        if not trimmed:
            raise serializers.ValidationError("SKU cannot be blank.")
        qs = ProductVariant.objects.filter(sku=trimmed)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A variant with this SKU already exists.")
        return trimmed

    def validate(self, attrs):
        retail_price = attrs.get("retail_price")
        if retail_price is None and self.instance:
            retail_price = self.instance.retail_price

        sale_price = attrs.get("sale_price")
        if sale_price is not None and retail_price is not None:
            if sale_price >= retail_price:
                raise serializers.ValidationError({
                    "sale_price": "Sale price must be strictly lower than regular retail price."
                })

        product = attrs.get("product") or (self.instance.product if self.instance else None)
        size = attrs.get("size", self.instance.size if self.instance else "").strip().upper()
        color = attrs.get("color", self.instance.color if self.instance else "").strip().title()

        if product and (size or color):
            qs = ProductVariant.objects.filter(
                product=product,
                size__iexact=size,
                color__iexact=color,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    "size": f"A variant with size '{size}' and color '{color}' already exists on this product."
                })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        from apps.inventory.models import InventoryItem, InventoryMovement

        initial_stock = validated_data.pop("initial_stock", 0)
        variant = ProductVariant.objects.create(**validated_data)
        item, _ = InventoryItem.objects.get_or_create(
            variant=variant,
            defaults={"quantity_available": initial_stock, "quantity_reserved": 0},
        )
        if initial_stock > 0:
            InventoryMovement.objects.create(
                inventory_item=item,
                movement_type=InventoryMovement.MovementType.STOCK_RECEIVED,
                quantity_change=initial_stock,
                reference="Initial variant creation stock",
            )
        return variant


class AdminStockAdjustmentSerializer(serializers.Serializer):
    """
    Serializer for safe, auditable variant stock adjustments.
    """

    adjustment_type = serializers.ChoiceField(choices=["set", "delta"])
    quantity = serializers.IntegerField()
    reason = serializers.CharField(required=False, default="manual_adjustment")
    reference = serializers.CharField(required=False, allow_blank=True, default="")


class AdminProductWriteSerializer(serializers.ModelSerializer):
    """
    Administrative serializer for creating and updating Products (Sprint A2.2).

    Supports:
    - Setting category (via `category` or `category_id`)
    - Setting merchandising collections (via `collections` or `collection_ids`)
    - Name presence & length validation
    - Slug uniqueness and auto-generation
    - Publication status choices (draft, active, archived)
    - Storefront publication readiness enforcement
    - Full relational representation with variants, images, and inventory
    - Safe transactional relational synchronization
    """

    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
    )
    collections = serializers.PrimaryKeyRelatedField(
        queryset=Collection.objects.all(),
        many=True,
        required=False,
    )
    status = serializers.ChoiceField(
        choices=Product.Status.choices,
        default=Product.Status.DRAFT,
    )
    slug = serializers.SlugField(
        max_length=255,
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category",
            "collections",
            "status",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_internal_value(self, data):
        # Support aliases category_id and collection_ids
        mutable = data.copy() if hasattr(data, "copy") else dict(data)
        if "category_id" in mutable and "category" not in mutable:
            mutable["category"] = mutable["category_id"]
        if mutable.get("category") == "":
            mutable["category"] = None

        if "collection_ids" in mutable and "collections" not in mutable:
            mutable["collections"] = mutable["collection_ids"]

        return super().to_internal_value(mutable)

    def validate_name(self, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Product name is required.")
        if len(trimmed) > 255:
            raise serializers.ValidationError("Product name cannot exceed 255 characters.")
        return trimmed

    def validate_slug(self, value: str) -> str:
        trimmed = value.strip().lower()
        if not trimmed:
            return ""
        # Check uniqueness against other products
        qs = Product.objects.filter(slug=trimmed)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A product with this slug already exists.")
        return trimmed

    def validate(self, attrs):
        slug = attrs.get("slug")
        if not slug:
            if not self.instance:
                name = attrs.get("name", "")
                base_slug = slugify(name) or "product"
                candidate = base_slug
                counter = 1
                while Product.objects.filter(slug=candidate).exists():
                    candidate = f"{base_slug}-{counter}"
                    counter += 1
                attrs["slug"] = candidate
            else:
                attrs["slug"] = self.instance.slug

        # Storefront publication readiness enforcement:
        status = attrs.get("status", self.instance.status if self.instance else Product.Status.DRAFT)
        if status == Product.Status.ACTIVE:
            category = attrs.get("category")
            if not category and (not self.instance or not self.instance.category_id):
                raise serializers.ValidationError({
                    "category": "A product must have an assigned category before it can be published."
                })
            if self.instance:
                active_variants = self.instance.variants.filter(is_active=True)
                if not active_variants.exists():
                    raise serializers.ValidationError({
                        "status": "Cannot publish product: at least one active variant is required."
                    })
                if not active_variants.filter(retail_price__gt=0).exists():
                    raise serializers.ValidationError({
                        "status": "Cannot publish product: at least one active variant must have a retail price greater than ₹0."
                    })
                if not self.instance.images.exists():
                    raise serializers.ValidationError({
                        "status": "Cannot publish product: at least one product image is required before publication."
                    })
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        collections_data = validated_data.pop("collections", None)
        product = Product.objects.create(**validated_data)
        if collections_data is not None:
            for idx, col in enumerate(collections_data):
                ProductCollection.objects.create(
                    product=product,
                    collection=col,
                    ordering=idx,
                    is_active=True,
                )
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        collections_data = validated_data.pop("collections", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if collections_data is not None:
            existing_pcs = {pc.collection_id: pc for pc in instance.product_collections.all()}
            new_col_ids = set()
            for idx, col in enumerate(collections_data):
                new_col_ids.add(col.id)
                pc = existing_pcs.get(col.id)
                if pc:
                    if pc.ordering != idx or not pc.is_active:
                        pc.ordering = idx
                        pc.is_active = True
                        pc.save(update_fields=["ordering", "is_active"])
                else:
                    ProductCollection.objects.create(
                        product=instance,
                        collection=col,
                        ordering=idx,
                        is_active=True,
                    )
            # Remove unselected collections
            instance.product_collections.exclude(collection_id__in=new_col_ids).delete()

        return instance

    def to_representation(self, instance: Product) -> dict:
        images = [
            ProductImageSerializer(img).data
            for img in instance.images.all().order_by("ordering", "created_at")
        ]
        variants = [
            AdminProductVariantSerializer(v).data
            for v in instance.variants.all().select_related("inventory").order_by("sku")
        ]
        has_name = bool(instance.name)
        has_category = bool(instance.category_id)
        active_vars = [v for v in variants if v.get("is_active")]
        has_variants = len(active_vars) > 0
        has_price = any(float(v["retail_price"]) > 0 for v in active_vars)
        has_images = len(images) > 0

        req_list = [
            req
            for req, met in [
                ("Product name is required", has_name),
                ("Category must be assigned", has_category),
                ("At least one active variant configured", has_variants),
                ("Valid selling price on at least one variant", has_price),
                ("At least one product gallery image", has_images),
            ]
            if not met
        ]

        readiness = {
            "can_publish": has_name and has_category and has_variants and has_price and has_images,
            "is_ready_for_publish": has_name and has_category and has_variants and has_price and has_images,
            "has_name": has_name,
            "has_title": has_name,
            "has_category": has_category,
            "has_variants": has_variants,
            "has_active_variants": has_variants,
            "has_price": has_price,
            "has_prices": has_price,
            "has_images": has_images,
            "missing_requirements": req_list,
            "issues": req_list,
        }

        return {
            "id": str(instance.id),
            "name": instance.name,
            "slug": instance.slug,
            "description": instance.description,
            "status": instance.status,
            "is_active": instance.is_active,
            "category": (
                CategorySummarySerializer(instance.category).data
                if instance.category
                else None
            ),
            "category_id": str(instance.category_id) if instance.category_id else None,
            "collections": CollectionSummarySerializer(
                instance.collections.all(), many=True
            ).data,
            "collection_ids": [str(c.id) for c in instance.collections.all()],
            "images": images,
            "variants": variants,
            "readiness": readiness,
            "created_at": instance.created_at.isoformat(),
            "updated_at": instance.updated_at.isoformat(),
        }


