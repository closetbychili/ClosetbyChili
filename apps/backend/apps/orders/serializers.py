from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from apps.orders.models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    unit_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
    )
    line_total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
    )

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "variant",
            "product_name",
            "variant_name",
            "sku",
            "unit_price",
            "quantity",
            "line_total",
        ]
        read_only_fields = fields


class OrderListSerializer(serializers.ModelSerializer):
    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
    )
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "order_number",
            "status",
            "payment_status",
            "total",
            "currency",
            "created_at",
            "item_count",
        ]
        read_only_fields = fields


class OrderDetailSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
    )
    discount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
    )
    shipping_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
    )
    tax_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
    )
    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0.00"),
    )
    items = OrderItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "payment_status",
            "currency",
            "subtotal",
            "discount",
            "shipping_amount",
            "tax_amount",
            "total",
            "shipping_address_snapshot",
            "billing_address_snapshot",
            "created_at",
            "updated_at",
            "item_count",
            "items",
        ]
        read_only_fields = fields
