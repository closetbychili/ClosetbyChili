"""
Closet by Chilli — Administrative Inventory Serializers.

Serializers for paginated inventory listings, movements, and summary KPIs.
"""

from typing import Any, cast
from rest_framework import serializers

from apps.catalog.models import ProductImage
from apps.inventory.models import InventoryItem, InventoryMovement
from apps.inventory.services import calculate_variant_stock


class AdminInventoryMovementSerializer(serializers.ModelSerializer):
    """
    Serializer for inventory movement entries with full audit detail.
    """

    movement_type_display = serializers.CharField(
        source="get_movement_type_display", read_only=True
    )
    reason_display = serializers.SerializerMethodField()
    is_manual = serializers.SerializerMethodField()
    actor_email = serializers.SerializerMethodField()

    class Meta:
        model = InventoryMovement
        fields = [
            "id",
            "movement_type",
            "movement_type_display",
            "is_manual",
            "quantity_change",
            "reason_code",
            "reason_display",
            "note",
            "resulting_quantity",
            "actor_email",
            "reference",
            "idempotency_key",
            "created_at",
        ]
        read_only_fields = fields

    def get_reason_display(self, obj: InventoryMovement) -> str:
        if not obj.reason_code:
            return ""
        reason_map = dict(InventoryMovement.AdjustmentReason.choices)
        if obj.reason_code in reason_map:
            return reason_map[obj.reason_code]
        return obj.reason_code.replace("_", " ").title()

    def get_is_manual(self, obj: InventoryMovement) -> bool:
        return obj.movement_type == InventoryMovement.MovementType.MANUAL_ADJUSTMENT

    def get_actor_email(self, obj: InventoryMovement) -> str:
        if obj.actor_email:
            return str(obj.actor_email)
        if obj.actor and getattr(obj.actor, "email", None):
            return str(obj.actor.email)
        return ""



class AdminInventoryItemSerializer(serializers.ModelSerializer):
    """
    Administrative serializer for inventory overview table rows.
    Presents variant, product, image, and authoritative stock calculations.
    """

    variant_id = serializers.UUIDField(source="variant.id", read_only=True)
    product_id = serializers.UUIDField(source="variant.product.id", read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    product_slug = serializers.CharField(source="variant.product.slug", read_only=True)
    product_status = serializers.CharField(
        source="variant.product.status", read_only=True
    )
    product_is_active = serializers.BooleanField(
        source="variant.product.is_active", read_only=True
    )
    category_name = serializers.SerializerMethodField()
    category_id = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    sku = serializers.CharField(source="variant.sku", read_only=True)
    size = serializers.CharField(source="variant.size", read_only=True)
    color = serializers.CharField(source="variant.color", read_only=True)
    variant_title = serializers.SerializerMethodField()
    retail_price = serializers.DecimalField(
        source="variant.retail_price",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    sale_price = serializers.DecimalField(
        source="variant.sale_price",
        max_digits=10,
        decimal_places=2,
        allow_null=True,
        read_only=True,
    )
    is_active = serializers.BooleanField(source="variant.is_active", read_only=True)

    quantity_on_hand = serializers.SerializerMethodField()
    quantity_reserved = serializers.SerializerMethodField()
    quantity_available = serializers.SerializerMethodField()
    stock_status = serializers.SerializerMethodField()
    stock_status_label = serializers.SerializerMethodField()
    low_stock_threshold = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()
    is_out_of_stock = serializers.SerializerMethodField()
    is_alert_acknowledged = serializers.BooleanField(read_only=True)
    alert_acknowledged_at = serializers.DateTimeField(read_only=True)

    last_movement_at = serializers.SerializerMethodField()
    last_movement = serializers.SerializerMethodField()

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "variant_id",
            "product_id",
            "product_name",
            "product_slug",
            "product_status",
            "product_is_active",
            "category_name",
            "category_id",
            "thumbnail_url",
            "sku",
            "size",
            "color",
            "variant_title",
            "retail_price",
            "sale_price",
            "is_active",
            "quantity_on_hand",
            "quantity_reserved",
            "quantity_available",
            "stock_status",
            "stock_status_label",
            "low_stock_threshold",
            "is_low_stock",
            "is_out_of_stock",
            "is_alert_acknowledged",
            "alert_acknowledged_at",
            "last_movement_at",
            "last_movement",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def _get_stock_data(self, obj: InventoryItem):
        if not hasattr(obj, "_cached_stock_data"):
            threshold = self.context.get("low_stock_threshold")
            obj._cached_stock_data = calculate_variant_stock(obj, threshold)
        return obj._cached_stock_data

    def get_category_name(self, obj: InventoryItem) -> str | None:
        cat = obj.variant.product.category
        return cat.name if cat else None

    def get_category_id(self, obj: InventoryItem) -> str | None:
        cat = obj.variant.product.category
        return str(cat.id) if cat else None

    def get_thumbnail_url(self, obj: InventoryItem) -> str | None:
        product = obj.variant.product
        # Use prefetched_images if available to avoid DB queries
        if hasattr(product, "prefetched_images"):
            images = product.prefetched_images
            if images:
                # First image is already ordered by is_primary desc
                return images[0].image_url
            return None
        # Fallback if not prefetched
        primary = product.images.filter(is_primary=True).first()
        if primary and primary.image_url:
            return primary.image_url
        first_img = product.images.first()
        return first_img.image_url if first_img else None

    def get_variant_title(self, obj: InventoryItem) -> str:
        parts = []
        if obj.variant.size:
            parts.append(obj.variant.size)
        if obj.variant.color:
            parts.append(obj.variant.color)
        return " / ".join(parts) if parts else str(obj.variant.sku)

    def get_quantity_on_hand(self, obj: InventoryItem) -> int:
        return int(self._get_stock_data(obj)["quantity_on_hand"])

    def get_quantity_reserved(self, obj: InventoryItem) -> int:
        return int(self._get_stock_data(obj)["quantity_reserved"])

    def get_quantity_available(self, obj: InventoryItem) -> int:
        return int(self._get_stock_data(obj)["quantity_available"])

    def get_stock_status(self, obj: InventoryItem) -> str:
        return str(self._get_stock_data(obj)["stock_status"])

    def get_stock_status_label(self, obj: InventoryItem) -> str:
        return str(self._get_stock_data(obj)["stock_status_label"])

    def get_low_stock_threshold(self, obj: InventoryItem) -> int:
        return int(self._get_stock_data(obj)["low_stock_threshold"])

    def get_is_low_stock(self, obj: InventoryItem) -> bool:
        return bool(self._get_stock_data(obj)["stock_status"] == "low_stock")

    def get_is_out_of_stock(self, obj: InventoryItem) -> bool:
        return bool(self._get_stock_data(obj)["stock_status"] == "out_of_stock")

    def _get_latest_movement(self, obj: InventoryItem) -> InventoryMovement | None:
        if hasattr(obj, "prefetched_movements"):
            movements = obj.prefetched_movements
            return movements[0] if movements else None
        return obj.movements.first()

    def get_last_movement_at(self, obj: InventoryItem) -> str | None:
        # Check annotated field first
        if hasattr(obj, "last_movement_at_annotated") and obj.last_movement_at_annotated:
            return obj.last_movement_at_annotated.isoformat()
        latest = self._get_latest_movement(obj)
        return latest.created_at.isoformat() if latest else None

    def get_last_movement(self, obj: InventoryItem) -> dict | None:
        latest = self._get_latest_movement(obj)
        if not latest:
            return None
        return {
            "id": str(latest.id),
            "movement_type": latest.movement_type,
            "movement_type_display": latest.get_movement_type_display(),
            "quantity_change": latest.quantity_change,
            "reference": latest.reference,
            "created_at": latest.created_at.isoformat(),
        }


class AdminInventorySummarySerializer(serializers.Serializer):
    """
    Serializer for inventory overview summary KPIs and alert monitoring metrics.
    """

    active_variants_tracked = serializers.IntegerField()
    total_on_hand = serializers.IntegerField()
    total_reserved = serializers.IntegerField()
    total_available = serializers.IntegerField()
    out_of_stock_variants = serializers.IntegerField()
    low_stock_variants = serializers.IntegerField()
    in_stock_variants = serializers.IntegerField()
    unacknowledged_alerts = serializers.IntegerField(required=False, default=0)
    low_stock_threshold = serializers.IntegerField()


class AdminThresholdUpdateSerializer(serializers.Serializer):
    """
    Validates input for configuring low_stock_threshold on an inventory item.
    """

    low_stock_threshold = serializers.IntegerField(
        min_value=0,
        error_messages={
            "min_value": "Low-stock threshold must be greater than or equal to zero.",
            "invalid": "Low-stock threshold must be a valid integer.",
        },
    )


class AdminAlertAcknowledgementSerializer(serializers.Serializer):
    """
    Validates input for acknowledging or dismissing an alert.
    """

    acknowledged = serializers.BooleanField(default=True)



class AdminInventoryDetailSerializer(AdminInventoryItemSerializer):
    """
    Detailed administrative serializer for a single variant inventory item.
    Includes full product images, attributes, and recent movements audit ledger.
    """

    low_stock_threshold = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    recent_movements = serializers.SerializerMethodField()

    class Meta(AdminInventoryItemSerializer.Meta):
        fields = AdminInventoryItemSerializer.Meta.fields + [
            "low_stock_threshold",
            "images",
            "recent_movements",
        ]

    def get_low_stock_threshold(self, obj: InventoryItem) -> int:
        return int(self._get_stock_data(obj)["low_stock_threshold"])

    def get_images(self, obj: InventoryItem) -> list[dict]:
        product = obj.variant.product
        images_qs = getattr(product, "prefetched_images", None)
        if images_qs is None:
            images_qs = list(product.images.all())
        return [
            {
                "id": str(img.id),
                "image_url": img.image_url,
                "alt_text": img.alt_text,
                "is_primary": img.is_primary,
                "ordering": img.ordering,
            }
            for img in images_qs
        ]

    def get_recent_movements(self, obj: InventoryItem) -> list[dict]:
        movements = obj.movements.all()[:10]
        return cast(list[dict], list(AdminInventoryMovementSerializer(movements, many=True).data))


class AdminStockAdjustmentActionSerializer(serializers.Serializer):
    """
    Validates input for adjusting variant stock via AdminInventoryAdjustView.
    """

    adjustment_type = serializers.ChoiceField(
        choices=["increase", "decrease", "set", "delta"],
        default="increase",
    )
    quantity = serializers.IntegerField(
        min_value=1,
        error_messages={
            "min_value": "Adjustment quantity must be greater than zero.",
            "invalid": "Quantity must be a valid integer.",
        },
    )
    reason_code = serializers.CharField(
        max_length=50,
        required=True,
        allow_blank=False,
        error_messages={
            "required": "Reason code is mandatory.",
            "blank": "Reason code is mandatory.",
        },
    )
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=1000,
    )
    idempotency_key = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=255,
    )

