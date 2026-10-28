"""
Closet by Chilli — Admin Coupon Serializers.

Complies with 04-backend-architecture.md, 18-admin-operations.md, Sprint A5.1, and Sprint A5.2.
Implements coupon serialization, deserialization, code normalization, range validations,
catalog targeting rule configuration and validation, and immutable audit log representations.
"""

from __future__ import annotations

import re
import uuid
from decimal import Decimal
from typing import Any

from rest_framework import serializers

from apps.catalog.models import Category, Collection, Product
from apps.orders.models import Coupon, CouponAuditLog, CouponRedemption

CODE_VALID_REGEX = re.compile(r"^[A-Z0-9_-]+$")


def mask_customer_email(email: str) -> str:
    """Mask email for privacy, e.g. 'john.doe@example.com' -> 'j***e@example.com'."""
    if not email or "@" not in email:
        return "Customer"
    user_part, domain_part = email.split("@", 1)
    if len(user_part) <= 2:
        masked_user = user_part[0] + "***"
    else:
        masked_user = user_part[0] + "***" + user_part[-1]
    return f"{masked_user}@{domain_part}"


class AdminCouponRedemptionSerializer(serializers.ModelSerializer):
    """
    Serializer for coupon redemption audit and history records.
    Masks customer PII to adhere to administrative privacy requirements.
    """

    coupon_code = serializers.CharField(source="coupon.code", read_only=True)
    coupon_name = serializers.CharField(source="coupon.name", read_only=True)
    customer_email_masked = serializers.SerializerMethodField()
    customer_display = serializers.SerializerMethodField()
    order_number = serializers.CharField(source="order.order_number", read_only=True, default=None)

    class Meta:
        model = CouponRedemption
        fields = [
            "id",
            "coupon_id",
            "coupon_code",
            "coupon_name",
            "customer_id",
            "customer_email_masked",
            "customer_display",
            "order_id",
            "order_number",
            "state",
            "discount_amount",
            "currency",
            "idempotency_key",
            "reserved_at",
            "expires_at",
            "finalized_at",
            "released_at",
            "release_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_customer_email_masked(self, obj: CouponRedemption) -> str:
        if not obj.customer or not obj.customer.email:
            return "Unknown"
        return mask_customer_email(obj.customer.email)

    def get_customer_display(self, obj: CouponRedemption) -> str:
        if not obj.customer:
            return "Customer"
        profile = getattr(obj.customer, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return mask_customer_email(obj.customer.email or "")


class CompactProductTargetSerializer(serializers.ModelSerializer):
    """Compact representation of an eligible product target."""

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "status", "is_active"]
        read_only_fields = fields


class CompactCategoryTargetSerializer(serializers.ModelSerializer):
    """Compact representation of an eligible category target."""

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "is_active"]
        read_only_fields = fields


class CompactCollectionTargetSerializer(serializers.ModelSerializer):
    """Compact representation of an eligible collection target."""

    class Meta:
        model = Collection
        fields = ["id", "name", "slug", "is_active"]
        read_only_fields = fields


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
    target_summary = serializers.CharField(read_only=True)
    created_by_email = serializers.SerializerMethodField()
    updated_by_email = serializers.SerializerMethodField()
    usage_count = serializers.SerializerMethodField()
    total_redemptions = serializers.IntegerField(source="total_redemptions_count", read_only=True)
    remaining_capacity = serializers.IntegerField(read_only=True)
    active_reservations_count = serializers.IntegerField(read_only=True)
    applicable_products_count = serializers.SerializerMethodField()
    applicable_categories_count = serializers.SerializerMethodField()
    applicable_collections_count = serializers.SerializerMethodField()

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
            "targeting_mode",
            "target_summary",
            "applicable_products_count",
            "applicable_categories_count",
            "applicable_collections_count",
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
            "total_redemptions",
            "remaining_capacity",
            "active_reservations_count",
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

    def get_usage_count(self, obj: Coupon) -> int:
        return obj.total_redemptions_count

    def get_applicable_products_count(self, obj: Coupon) -> int:
        return obj.applicable_products.count() if obj.pk else 0

    def get_applicable_categories_count(self, obj: Coupon) -> int:
        return obj.applicable_categories.count() if obj.pk else 0

    def get_applicable_collections_count(self, obj: Coupon) -> int:
        return obj.applicable_collections.count() if obj.pk else 0


class AdminCouponDetailSerializer(serializers.ModelSerializer):
    """Complete detail serializer for administrative inspection and drawer/modal views."""

    lifecycle_status = serializers.CharField(read_only=True)
    target_summary = serializers.CharField(read_only=True)
    created_by_email = serializers.SerializerMethodField()
    updated_by_email = serializers.SerializerMethodField()
    usage_count = serializers.SerializerMethodField()
    total_redemptions = serializers.IntegerField(source="total_redemptions_count", read_only=True)
    remaining_capacity = serializers.IntegerField(read_only=True)
    active_reservations_count = serializers.IntegerField(read_only=True)
    applicable_products = CompactProductTargetSerializer(many=True, read_only=True)
    applicable_categories = CompactCategoryTargetSerializer(many=True, read_only=True)
    applicable_collections = CompactCollectionTargetSerializer(many=True, read_only=True)
    applicable_products_count = serializers.SerializerMethodField()
    applicable_categories_count = serializers.SerializerMethodField()
    applicable_collections_count = serializers.SerializerMethodField()
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
            "targeting_mode",
            "target_summary",
            "applicable_products",
            "applicable_categories",
            "applicable_collections",
            "applicable_products_count",
            "applicable_categories_count",
            "applicable_collections_count",
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
            "total_redemptions",
            "remaining_capacity",
            "active_reservations_count",
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

    def get_usage_count(self, obj: Coupon) -> int:
        return obj.total_redemptions_count

    def get_applicable_products_count(self, obj: Coupon) -> int:
        return obj.applicable_products.count() if obj.pk else 0

    def get_applicable_categories_count(self, obj: Coupon) -> int:
        return obj.applicable_categories.count() if obj.pk else 0

    def get_applicable_collections_count(self, obj: Coupon) -> int:
        return obj.applicable_collections.count() if obj.pk else 0


def validate_targeting_configuration(
    targeting_mode: str,
    product_ids: list[uuid.UUID] | None,
    category_ids: list[uuid.UUID] | None,
    collection_ids: list[uuid.UUID] | None,
) -> dict[str, Any]:
    """
    Validates targeting mode and target entity ID lists:
    1. Checks for duplicates.
    2. Validates existence and active publication of catalog entities.
    3. Validates required/forbidden target types per targeting mode.
    4. Returns dictionary of resolved Model instances: {'products': [...], 'categories': [...], 'collections': [...]}.
    """
    # 1. Duplicate checks
    if product_ids and len(product_ids) != len(set(product_ids)):
        raise serializers.ValidationError({"product_ids": "Duplicate product IDs provided."})
    if category_ids and len(category_ids) != len(set(category_ids)):
        raise serializers.ValidationError({"category_ids": "Duplicate category IDs provided."})
    if collection_ids and len(collection_ids) != len(set(collection_ids)):
        raise serializers.ValidationError({"collection_ids": "Duplicate collection IDs provided."})

    p_ids = list(product_ids or [])
    c_ids = list(category_ids or [])
    col_ids = list(collection_ids or [])

    # 2. Mode-specific target presence validation
    if targeting_mode == Coupon.TargetingMode.ALL_PRODUCTS:
        if p_ids or c_ids or col_ids:
            raise serializers.ValidationError({
                "targeting_mode": "Target IDs cannot be provided when targeting mode is ALL_PRODUCTS."
            })
        return {"products": [], "categories": [], "collections": []}

    elif targeting_mode == Coupon.TargetingMode.SPECIFIC_PRODUCTS:
        if not p_ids:
            raise serializers.ValidationError({
                "product_ids": "At least one product must be selected for SPECIFIC_PRODUCTS targeting."
            })
        if c_ids:
            raise serializers.ValidationError({
                "category_ids": "Categories cannot be specified when targeting mode is SPECIFIC_PRODUCTS."
            })
        if col_ids:
            raise serializers.ValidationError({
                "collection_ids": "Collections cannot be specified when targeting mode is SPECIFIC_PRODUCTS."
            })

    elif targeting_mode == Coupon.TargetingMode.SPECIFIC_CATEGORIES:
        if not c_ids:
            raise serializers.ValidationError({
                "category_ids": "At least one category must be selected for SPECIFIC_CATEGORIES targeting."
            })
        if p_ids:
            raise serializers.ValidationError({
                "product_ids": "Products cannot be specified when targeting mode is SPECIFIC_CATEGORIES."
            })
        if col_ids:
            raise serializers.ValidationError({
                "collection_ids": "Collections cannot be specified when targeting mode is SPECIFIC_CATEGORIES."
            })

    elif targeting_mode == Coupon.TargetingMode.SPECIFIC_COLLECTIONS:
        if not col_ids:
            raise serializers.ValidationError({
                "collection_ids": "At least one collection must be selected for SPECIFIC_COLLECTIONS targeting."
            })
        if p_ids:
            raise serializers.ValidationError({
                "product_ids": "Products cannot be specified when targeting mode is SPECIFIC_COLLECTIONS."
            })
        if c_ids:
            raise serializers.ValidationError({
                "category_ids": "Categories cannot be specified when targeting mode is SPECIFIC_COLLECTIONS."
            })

    elif targeting_mode == Coupon.TargetingMode.PRODUCTS_AND_CATEGORIES:
        if not p_ids and not c_ids:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "At least one product or category must be selected for PRODUCTS_AND_CATEGORIES targeting."
                ]
            })
        if col_ids:
            raise serializers.ValidationError({
                "collection_ids": "Collections cannot be specified when targeting mode is PRODUCTS_AND_CATEGORIES."
            })

    elif targeting_mode == Coupon.TargetingMode.PRODUCTS_AND_COLLECTIONS:
        if not p_ids and not col_ids:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "At least one product or collection must be selected for PRODUCTS_AND_COLLECTIONS targeting."
                ]
            })
        if c_ids:
            raise serializers.ValidationError({
                "category_ids": "Categories cannot be specified when targeting mode is PRODUCTS_AND_COLLECTIONS."
            })

    elif targeting_mode == Coupon.TargetingMode.CATEGORIES_AND_COLLECTIONS:
        if not c_ids and not col_ids:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "At least one category or collection must be selected for CATEGORIES_AND_COLLECTIONS targeting."
                ]
            })
        if p_ids:
            raise serializers.ValidationError({
                "product_ids": "Products cannot be specified when targeting mode is CATEGORIES_AND_COLLECTIONS."
            })

    elif targeting_mode == Coupon.TargetingMode.MIXED:
        if not p_ids and not c_ids and not col_ids:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "At least one target (product, category, or collection) must be selected for MIXED targeting."
                ]
            })

    else:
        raise serializers.ValidationError({
            "targeting_mode": f"Unsupported targeting mode '{targeting_mode}'."
        })

    # 3. Catalog entity validation (existence, active state, publication)
    resolved_products = []
    if p_ids:
        found_prods = list(Product.objects.filter(id__in=p_ids))
        found_map = {p.id: p for p in found_prods}
        missing_p = [str(pid) for pid in p_ids if pid not in found_map]
        if missing_p:
            raise serializers.ValidationError({
                "product_ids": f"Referenced products not found: {', '.join(missing_p)}."
            })
        inactive_or_draft = [
            str(p.id) for p in found_prods
            if not p.is_active or p.status != Product.Status.ACTIVE
        ]
        if inactive_or_draft:
            raise serializers.ValidationError({
                "product_ids": (
                    f"Selected products must be active and published: {', '.join(inactive_or_draft)}."
                )
            })
        resolved_products = found_prods

    resolved_categories = []
    if c_ids:
        found_cats = list(Category.objects.filter(id__in=c_ids))
        found_map = {c.id: c for c in found_cats}
        missing_c = [str(cid) for cid in c_ids if cid not in found_map]
        if missing_c:
            raise serializers.ValidationError({
                "category_ids": f"Referenced categories not found: {', '.join(missing_c)}."
            })
        inactive_cats = [str(c.id) for c in found_cats if not c.is_active]
        if inactive_cats:
            raise serializers.ValidationError({
                "category_ids": f"Selected categories must be active: {', '.join(inactive_cats)}."
            })
        resolved_categories = found_cats

    resolved_collections = []
    if col_ids:
        found_cols = list(Collection.objects.filter(id__in=col_ids))
        found_map = {col.id: col for col in found_cols}
        missing_col = [str(col_id) for col_id in col_ids if col_id not in found_map]
        if missing_col:
            raise serializers.ValidationError({
                "collection_ids": f"Referenced collections not found: {', '.join(missing_col)}."
            })
        inactive_cols = [str(col.id) for col in found_cols if not col.is_active]
        if inactive_cols:
            raise serializers.ValidationError({
                "collection_ids": f"Selected collections must be active: {', '.join(inactive_cols)}."
            })
        resolved_collections = found_cols

    return {
        "products": resolved_products,
        "categories": resolved_categories,
        "collections": resolved_collections,
    }


class AdminCouponCreateSerializer(serializers.ModelSerializer):
    """Validates and creates an administrative promotional coupon with targeting rules."""

    code = serializers.CharField(max_length=50)
    name = serializers.CharField(max_length=150)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    discount_type = serializers.ChoiceField(
        choices=Coupon.DiscountType.choices,
        default=Coupon.DiscountType.PERCENTAGE,
    )
    discount_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=3, required=False, default="INR")
    targeting_mode = serializers.ChoiceField(
        choices=Coupon.TargetingMode.choices,
        default=Coupon.TargetingMode.ALL_PRODUCTS,
        required=False,
    )
    product_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
    )
    category_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
    )
    collection_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
    )
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
            "targeting_mode",
            "product_ids",
            "category_ids",
            "collection_ids",
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

        # Validate targeting configuration
        targeting_mode = attrs.get("targeting_mode", Coupon.TargetingMode.ALL_PRODUCTS)
        product_ids = attrs.get("product_ids", [])
        category_ids = attrs.get("category_ids", [])
        collection_ids = attrs.get("collection_ids", [])

        resolved_targets = validate_targeting_configuration(
            targeting_mode=targeting_mode,
            product_ids=product_ids,
            category_ids=category_ids,
            collection_ids=collection_ids,
        )
        attrs["_resolved_targets"] = resolved_targets

        return attrs

    def create(self, validated_data: dict[str, Any]) -> Coupon:
        resolved_targets = validated_data.pop("_resolved_targets", None)
        validated_data.pop("product_ids", None)
        validated_data.pop("category_ids", None)
        validated_data.pop("collection_ids", None)
        coupon = super().create(validated_data)
        if resolved_targets:
            coupon.applicable_products.set(resolved_targets["products"])
            coupon.applicable_categories.set(resolved_targets["categories"])
            coupon.applicable_collections.set(resolved_targets["collections"])
        return coupon


class AdminCouponUpdateSerializer(serializers.ModelSerializer):
    """Validates partial modifications to existing administrative coupons and targeting rules."""

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
    targeting_mode = serializers.ChoiceField(
        choices=Coupon.TargetingMode.choices,
        required=False,
    )
    product_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
    )
    category_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
    )
    collection_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
    )
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
            "targeting_mode",
            "product_ids",
            "category_ids",
            "collection_ids",
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

        # Check if targeting fields are being updated
        targeting_changed = any(
            f in attrs for f in ("targeting_mode", "product_ids", "category_ids", "collection_ids")
        )
        if targeting_changed and instance:
            final_mode = attrs.get("targeting_mode", instance.targeting_mode)

            # Determine final targets
            if "product_ids" in attrs:
                final_p_ids = attrs["product_ids"]
            elif final_mode == instance.targeting_mode:
                final_p_ids = list(instance.applicable_products.values_list("id", flat=True))
            else:
                final_p_ids = []

            if "category_ids" in attrs:
                final_c_ids = attrs["category_ids"]
            elif final_mode == instance.targeting_mode:
                final_c_ids = list(instance.applicable_categories.values_list("id", flat=True))
            else:
                final_c_ids = []

            if "collection_ids" in attrs:
                final_col_ids = attrs["collection_ids"]
            elif final_mode == instance.targeting_mode:
                final_col_ids = list(instance.applicable_collections.values_list("id", flat=True))
            else:
                final_col_ids = []

            resolved_targets = validate_targeting_configuration(
                targeting_mode=final_mode,
                product_ids=final_p_ids,
                category_ids=final_c_ids,
                collection_ids=final_col_ids,
            )
            attrs["_resolved_targets"] = resolved_targets
            attrs["_targeting_modified"] = True

        return attrs

    def update(self, instance: Coupon, validated_data: dict[str, Any]) -> Coupon:
        resolved_targets = validated_data.pop("_resolved_targets", None)
        targeting_modified = validated_data.pop("_targeting_modified", False)
        validated_data.pop("product_ids", None)
        validated_data.pop("category_ids", None)
        validated_data.pop("collection_ids", None)
        coupon = super().update(instance, validated_data)
        if targeting_modified and resolved_targets is not None:
            coupon.applicable_products.set(resolved_targets["products"])
            coupon.applicable_categories.set(resolved_targets["categories"])
            coupon.applicable_collections.set(resolved_targets["collections"])
        return coupon
