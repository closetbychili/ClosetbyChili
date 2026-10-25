"""
Closet by Chilli — Admin Coupon Serializers.

Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprint A5.1.
Implements coupon serialization, deserialization, code normalization, range validations,
and immutable audit log representations.
"""

from __future__ import annotations

import re
from decimal import Decimal
from typing import Any

from rest_framework import serializers

from apps.orders.models import Coupon, CouponAuditLog

CODE_VALID_REGEX = re.compile(r"^[A-Z0-9_-]+$")


class AdminCouponAuditLogSerializer(serializers.ModelSerializer):
    """Immutable audit trail records for coupon modifications."""

    actor_email = serializers.CharField(read_only=True)

    class Meta:
        model = CouponAuditLog
        fields = [
            "id",
            "event_type",
            "actor_id",
            "actor_email",
            "notes",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields


class AdminCouponListSerializer(serializers.ModelSerializer):
    """Compact summary serializer for administrative coupon listing."""

    lifecycle_status = serializers.CharField(read_only=True)
    created_by_email = serializers.SerializerMethodField()
    updated_by_email = serializers.SerializerMethodField()
    usage_count = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "name",
            "description",
            "discount_type",
            "discount_value",
            "currency",
            "min_order_subtotal",
            "max_discount_amount",
            "start_date",
            "end_date",
            "is_active",
            "lifecycle_status",
            "usage_limit",
            "per_customer_limit",
            "is_first_order_only",
            "usage_count",
            "created_at",
            "updated_at",
            "created_by_email",
            "updated_by_email",
        ]
        read_only_fields = fields

    def get_created_by_email(self, obj: Coupon) -> str | None:
        return obj.created_by.email if obj.created_by else None

    def get_updated_by_email(self, obj: Coupon) -> str | None:
        return obj.updated_by.email if obj.updated_by else None

    def get_usage_count(self, obj: Coupon) -> None:
        # In this sprint (A5.1), coupon redemption records and checkout integration
        # are not yet active. We explicitly return null per specification rather than fabricating counts.
        return None


class AdminCouponDetailSerializer(serializers.ModelSerializer):
    """Complete detail serializer for administrative inspection and drawer/modal views."""

    lifecycle_status = serializers.CharField(read_only=True)
    created_by_email = serializers.SerializerMethodField()
    updated_by_email = serializers.SerializerMethodField()
    usage_count = serializers.SerializerMethodField()
    audit_logs = AdminCouponAuditLogSerializer(many=True, read_only=True)

    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "name",
            "description",
            "discount_type",
            "discount_value",
            "currency",
            "min_order_subtotal",
            "max_discount_amount",
            "start_date",
            "end_date",
            "is_active",
            "lifecycle_status",
            "usage_limit",
            "per_customer_limit",
            "is_first_order_only",
            "usage_count",
            "created_at",
            "updated_at",
            "created_by_email",
            "updated_by_email",
            "audit_logs",
        ]
        read_only_fields = fields

    def get_created_by_email(self, obj: Coupon) -> str | None:
        return obj.created_by.email if obj.created_by else None

    def get_updated_by_email(self, obj: Coupon) -> str | None:
        return obj.updated_by.email if obj.updated_by else None

    def get_usage_count(self, obj: Coupon) -> None:
        return None


class AdminCouponCreateSerializer(serializers.ModelSerializer):
    """Validates and creates an administrative promotional coupon."""

    code = serializers.CharField(max_length=50)
    name = serializers.CharField(max_length=150)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    discount_type = serializers.ChoiceField(
        choices=Coupon.DiscountType.choices,
        default=Coupon.DiscountType.PERCENTAGE,
    )
    discount_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=3, required=False, default="INR")
    min_order_subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    max_discount_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    start_date = serializers.DateTimeField()
    end_date = serializers.DateTimeField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False, default=True)
    usage_limit = serializers.IntegerField(required=False, allow_null=True)
    per_customer_limit = serializers.IntegerField(required=False, allow_null=True)
    is_first_order_only = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = Coupon
        fields = [
            "code",
            "name",
            "description",
            "discount_type",
            "discount_value",
            "currency",
            "min_order_subtotal",
            "max_discount_amount",
            "start_date",
            "end_date",
            "is_active",
            "usage_limit",
            "per_customer_limit",
            "is_first_order_only",
        ]

    def validate_code(self, value: str) -> str:
        normalized = value.strip().upper()
        if not normalized:
            raise serializers.ValidationError("Coupon code cannot be empty.")
        if len(normalized) < 2:
            raise serializers.ValidationError("Coupon code must be at least 2 characters.")
        if not CODE_VALID_REGEX.match(normalized):
            raise serializers.ValidationError(
                "Coupon code may only contain uppercase letters, numbers, hyphens, and underscores."
            )
        if Coupon.objects.filter(code=normalized).exists():
            raise serializers.ValidationError(f"A coupon with code '{normalized}' already exists.")
        return normalized

    def validate_discount_value(self, value: Decimal) -> Decimal:
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("Discount value must be greater than zero.")
        return value

    def validate_currency(self, value: str) -> str:
        normalized = value.strip().upper()
        if len(normalized) != 3:
            raise serializers.ValidationError("Currency must be a valid 3-character ISO code.")
        return normalized

    def validate_min_order_subtotal(self, value: Decimal | None) -> Decimal | None:
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("Minimum order subtotal cannot be negative.")
        return value

    def validate_max_discount_amount(self, value: Decimal | None) -> Decimal | None:
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("Maximum discount amount cannot be negative.")
        return value

    def validate_usage_limit(self, value: int | None) -> int | None:
        if value is not None and value < 1:
            raise serializers.ValidationError("Usage limit must be at least 1.")
        return value

    def validate_per_customer_limit(self, value: int | None) -> int | None:
        if value is not None and value < 1:
            raise serializers.ValidationError("Per-customer limit must be at least 1.")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        discount_type = attrs.get("discount_type", Coupon.DiscountType.PERCENTAGE)
        discount_value = attrs.get("discount_value")
        if discount_type == Coupon.DiscountType.PERCENTAGE:
            if discount_value is not None and discount_value > Decimal("100.00"):
                raise serializers.ValidationError({
                    "discount_value": "Percentage discount cannot exceed 100%."
                })
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError({
                "end_date": "End date must be later than start date."
            })
        return attrs


class AdminCouponUpdateSerializer(serializers.ModelSerializer):
    """Validates partial modifications to existing administrative coupons."""

    code = serializers.CharField(max_length=50, required=False)
    name = serializers.CharField(max_length=150, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    discount_type = serializers.ChoiceField(
        choices=Coupon.DiscountType.choices,
        required=False,
    )
    discount_value = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
    )
    currency = serializers.CharField(max_length=3, required=False)
    min_order_subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    max_discount_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)
    usage_limit = serializers.IntegerField(required=False, allow_null=True)
    per_customer_limit = serializers.IntegerField(required=False, allow_null=True)
    is_first_order_only = serializers.BooleanField(required=False)

    class Meta:
        model = Coupon
        fields = [
            "code",
            "name",
            "description",
            "discount_type",
            "discount_value",
            "currency",
            "min_order_subtotal",
            "max_discount_amount",
            "start_date",
            "end_date",
            "is_active",
            "usage_limit",
            "per_customer_limit",
            "is_first_order_only",
        ]

    def validate_code(self, value: str) -> str:
        normalized = value.strip().upper()
        if not normalized:
            raise serializers.ValidationError("Coupon code cannot be empty.")
        if len(normalized) < 2:
            raise serializers.ValidationError("Coupon code must be at least 2 characters.")
        if not CODE_VALID_REGEX.match(normalized):
            raise serializers.ValidationError(
                "Coupon code may only contain uppercase letters, numbers, hyphens, and underscores."
            )
        instance = getattr(self, "instance", None)
        qs = Coupon.objects.filter(code=normalized)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"A coupon with code '{normalized}' already exists.")
        return normalized

    def validate_discount_value(self, value: Decimal) -> Decimal:
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("Discount value must be greater than zero.")
        return value

    def validate_currency(self, value: str) -> str:
        normalized = value.strip().upper()
        if len(normalized) != 3:
            raise serializers.ValidationError("Currency must be a valid 3-character ISO code.")
        return normalized

    def validate_min_order_subtotal(self, value: Decimal | None) -> Decimal | None:
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("Minimum order subtotal cannot be negative.")
        return value

    def validate_max_discount_amount(self, value: Decimal | None) -> Decimal | None:
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("Maximum discount amount cannot be negative.")
        return value

    def validate_usage_limit(self, value: int | None) -> int | None:
        if value is not None and value < 1:
            raise serializers.ValidationError("Usage limit must be at least 1.")
        return value

    def validate_per_customer_limit(self, value: int | None) -> int | None:
        if value is not None and value < 1:
            raise serializers.ValidationError("Per-customer limit must be at least 1.")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        instance: Coupon = getattr(self, "instance", None)

        discount_type = attrs.get(
            "discount_type",
            getattr(instance, "discount_type", Coupon.DiscountType.PERCENTAGE)
        )
        discount_value = attrs.get(
            "discount_value",
            getattr(instance, "discount_value", None)
        )
        if discount_type == Coupon.DiscountType.PERCENTAGE:
            if discount_value is not None and discount_value > Decimal("100.00"):
                raise serializers.ValidationError({
                    "discount_value": "Percentage discount cannot exceed 100%."
                })

        start_date = attrs.get("start_date", getattr(instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(instance, "end_date", None))
        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError({
                "end_date": "End date must be later than start date."
            })
        return attrs
