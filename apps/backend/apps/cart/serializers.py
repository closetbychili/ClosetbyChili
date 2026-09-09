"""
Closet by Chilli — Cart Domain Serializers.

Follows DRF serializer conventions and response standards defined in
07-api-architecture.md §32-36 and 35-api-error-response-standards.md.
"""

from rest_framework import serializers

from apps.cart.models import Cart, CartItem
from apps.catalog.models import Product, ProductVariant


class CartProductSummarySerializer(serializers.ModelSerializer):
    """Minimal product representation for cart item line display."""

    category_name = serializers.CharField(source="category.name", read_only=True, default="")
    category_slug = serializers.CharField(source="category.slug", read_only=True, default="")

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "category_name",
            "category_slug",
        ]


class CartVariantSummarySerializer(serializers.ModelSerializer):
    """Variant configuration and pricing representation for cart line items."""

    product = CartProductSummarySerializer(read_only=True)
    retail_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "sku",
            "size",
            "color",
            "retail_price",
            "product",
        ]


class CartItemSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for a single cart line item.

    Prices and line totals are dynamically calculated server-side from
    the linked ProductVariant and quantity.
    """

    variant = CartVariantSummarySerializer(read_only=True)
    unit_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    line_total = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = CartItem
        fields = [
            "id",
            "variant",
            "quantity",
            "unit_price",
            "line_total",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class CartSerializer(serializers.ModelSerializer):
    """
    Authoritative representation of the customer's shopping cart.

    Returns calculated subtotal, item count, and line items.
    """

    items = CartItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    subtotal = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = Cart
        fields = [
            "id",
            "session_key",
            "items",
            "item_count",
            "subtotal",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AddToCartInputSerializer(serializers.Serializer):
    """Payload validator for adding an item to the cart."""

    variant_id = serializers.UUIDField(required=True)
    quantity = serializers.IntegerField(required=False, default=1, min_value=1)

    def validate_quantity(self, value: int) -> int:
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value


class UpdateCartItemInputSerializer(serializers.Serializer):
    """Payload validator for updating an existing cart item's quantity."""

    quantity = serializers.IntegerField(required=True, min_value=1)

    def validate_quantity(self, value: int) -> int:
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value
