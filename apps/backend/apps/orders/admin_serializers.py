"""
Closet by Chilli — Admin Order Serializers.

Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprint A4.1.
Serializes administrative order list data with customer summaries and aggregated item counts.
Exposes zero auth secrets, tokens, or passwords.
"""

from __future__ import annotations

from typing import Any
from rest_framework import serializers

from apps.orders.models import Order, OrderAuditLog, OrderItem
from apps.inventory.models import InventoryItem, InventoryMovement, InventoryReservation


class AdminOrderCustomerSerializer(serializers.Serializer):
    """Safe, non-sensitive patron summary for administrative order views."""

    id = serializers.UUIDField(read_only=True)
    email = serializers.EmailField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    phone = serializers.CharField(read_only=True)


class AdminOrderListSerializer(serializers.ModelSerializer):
    """
    Serializer for the administrative order listing endpoint.
    Includes human-readable order number, customer summary, status displays,
    authoritative totals, and aggregated item count without loading items into memory.
    """

    subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
    )
    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_status_display = serializers.CharField(source="get_payment_status_display", read_only=True)
    item_count = serializers.IntegerField(source="annotated_item_count", read_only=True)
    customer = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "status_display",
            "payment_status",
            "payment_status_display",
            "currency",
            "subtotal",
            "total",
            "item_count",
            "customer",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_customer(self, obj: Order) -> dict[str, Any]:
        """
        Derive customer display information safely without exposing credentials.
        Prefers profile display name, then shipping snapshot full name, then email username.
        """
        user = obj.user
        display_name = ""

        if hasattr(user, "profile") and user.profile and getattr(user.profile, "display_name", ""):
            display_name = user.profile.display_name.strip()
        elif obj.shipping_address_snapshot and isinstance(obj.shipping_address_snapshot, dict):
            display_name = str(obj.shipping_address_snapshot.get("full_name") or "").strip()

        if not display_name:
            display_name = user.email.split("@")[0] if user.email else "Patron"

        phone = ""
        if obj.shipping_address_snapshot and isinstance(obj.shipping_address_snapshot, dict):
            phone = str(obj.shipping_address_snapshot.get("phone") or "").strip()
        elif hasattr(user, "profile") and user.profile and getattr(user.profile, "phone", ""):
            phone = user.profile.phone.strip()

        return {
            "id": str(user.id),
            "email": user.email,
            "display_name": display_name,
            "phone": phone,
        }


class AdminOrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for historical order line items.
    Authoritative values come strictly from the persisted purchase snapshot.
    """

    unit_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
    )
    line_total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
    )
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_id",
            "variant_id",
            "product_name",
            "variant_name",
            "sku",
            "unit_price",
            "quantity",
            "line_total",
            "image_url",
        ]
        read_only_fields = fields

    def get_image_url(self, obj: OrderItem) -> str | None:
        """Safely fetch primary image URL from prefetched product images."""
        if not obj.product_id or not obj.product:
            return None
        try:
            images = list(obj.product.images.all())
            if not images:
                return None
            primary = next((img for img in images if getattr(img, "is_primary", False)), None)
            target = primary or images[0]
            return getattr(target, "image_url", None)
        except Exception:
            return None


class AdminOrderReservationSerializer(serializers.ModelSerializer):
    """Serializer for inventory reservation audit records associated with an order."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    sku = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    variant_label = serializers.SerializerMethodField()

    class Meta:
        model = InventoryReservation
        fields = [
            "id",
            "inventory_item_id",
            "quantity",
            "status",
            "status_display",
            "sku",
            "product_name",
            "variant_label",
            "expires_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_sku(self, obj: InventoryReservation) -> str:
        try:
            return obj.inventory_item.variant.sku
        except AttributeError:
            return ""

    def get_product_name(self, obj: InventoryReservation) -> str:
        try:
            return obj.inventory_item.variant.product.name
        except AttributeError:
            return ""

    def get_variant_label(self, obj: InventoryReservation) -> str:
        try:
            variant = obj.inventory_item.variant
            parts = [p for p in [variant.size, variant.color] if p]
            return " / ".join(parts) if parts else variant.sku
        except AttributeError:
            return ""


class AdminOrderMovementSerializer(serializers.ModelSerializer):
    """Serializer for stock movements associated with an order."""

    movement_type_display = serializers.CharField(source="get_movement_type_display", read_only=True)
    sku = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = InventoryMovement
        fields = [
            "id",
            "inventory_item_id",
            "movement_type",
            "movement_type_display",
            "quantity_change",
            "resulting_quantity",
            "reference",
            "reason_code",
            "note",
            "actor_email",
            "sku",
            "product_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_sku(self, obj: InventoryMovement) -> str:
        try:
            return obj.inventory_item.variant.sku
        except AttributeError:
            return ""

    def get_product_name(self, obj: InventoryMovement) -> str:
        try:
            return obj.inventory_item.variant.product.name
        except AttributeError:
            return ""


class AdminOrderAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for immutable order audit trail entries."""

    operation_type_display = serializers.CharField(source="get_operation_type_display", read_only=True)

    class Meta:
        model = OrderAuditLog
        fields = [
            "id",
            "from_status",
            "to_status",
            "operation_type",
            "operation_type_display",
            "actor_email",
            "note",
            "created_at",
        ]
        read_only_fields = fields


class AdminOrderStatusTransitionSerializer(serializers.Serializer):
    """Payload serializer for administrative status transition."""

    target_status = serializers.CharField(required=True)
    note = serializers.CharField(required=False, allow_blank=True, default="", max_length=1000)

    def validate_target_status(self, value: str) -> str:
        val = value.strip().upper()
        valid = {c[0] for c in Order.Status.choices}
        if val not in valid:
            raise serializers.ValidationError(
                f"Invalid target status '{value}'. Allowed choices: {', '.join(sorted(valid))}."
            )
        return val


class AdminOrderCancelSerializer(serializers.Serializer):
    """Payload serializer for administrative order cancellation."""

    reason = serializers.CharField(required=False, allow_blank=True, default="", max_length=500)
    note = serializers.CharField(required=False, allow_blank=True, default="", max_length=1000)


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for administrative inspection of a single customer order.
    Includes full monetary breakdown, customer summary, historical address snapshots,
    item snapshots, safe payment audit records, and inventory reservation/movement timeline.
    Never exposes cryptographic secrets or signatures.
    """

    subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
    )
    discount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
    )
    shipping_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
    )
    tax_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
    )
    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_status_display = serializers.CharField(source="get_payment_status_display", read_only=True)
    item_count = serializers.SerializerMethodField()
    total_units = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()
    shipping_address = serializers.SerializerMethodField()
    billing_address = serializers.SerializerMethodField()
    items = AdminOrderItemSerializer(many=True, read_only=True)
    payments = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()
    inventory = serializers.SerializerMethodField()
    audit_logs = AdminOrderAuditLogSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "idempotency_key",
            "status",
            "status_display",
            "payment_status",
            "payment_status_display",
            "currency",
            "subtotal",
            "discount",
            "shipping_amount",
            "tax_amount",
            "total",
            "item_count",
            "total_units",
            "customer",
            "shipping_address",
            "billing_address",
            "items",
            "payments",
            "payment",
            "inventory",
            "audit_logs",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_item_count(self, obj: Order) -> int:
        return len(obj.items.all())

    def get_total_units(self, obj: Order) -> int:
        return sum(item.quantity for item in obj.items.all())

    def get_customer(self, obj: Order) -> dict[str, Any]:
        user = obj.user
        display_name = ""

        if hasattr(user, "profile") and user.profile and getattr(user.profile, "display_name", ""):
            display_name = user.profile.display_name.strip()
        elif obj.shipping_address_snapshot and isinstance(obj.shipping_address_snapshot, dict):
            display_name = str(obj.shipping_address_snapshot.get("full_name") or "").strip()

        if not display_name:
            display_name = user.email.split("@")[0] if user.email else "Patron"

        phone = ""
        if obj.shipping_address_snapshot and isinstance(obj.shipping_address_snapshot, dict):
            phone = str(obj.shipping_address_snapshot.get("phone") or "").strip()
        elif hasattr(user, "profile") and user.profile and getattr(user.profile, "phone", ""):
            phone = user.profile.phone.strip()

        return {
            "id": str(user.id),
            "email": user.email,
            "display_name": display_name,
            "phone": phone,
        }

    def get_shipping_address(self, obj: Order) -> dict[str, Any]:
        if isinstance(obj.shipping_address_snapshot, dict):
            return obj.shipping_address_snapshot
        return {}

    def get_billing_address(self, obj: Order) -> dict[str, Any]:
        if isinstance(obj.billing_address_snapshot, dict):
            return obj.billing_address_snapshot
        return {}

    def get_payments(self, obj: Order) -> list[dict[str, Any]]:
        """Return safe, persisted payment records for this order."""
        payments = []
        if (
            obj.razorpay_order_id
            or obj.razorpay_payment_id
            or obj.payment_status in (Order.PaymentStatus.PAID, Order.PaymentStatus.REFUNDED, Order.PaymentStatus.FAILED)
        ):
            provider = "Razorpay" if (obj.razorpay_order_id or obj.razorpay_payment_id) else "Internal"
            payments.append({
                "provider": provider,
                "status": obj.payment_status,
                "status_display": obj.get_payment_status_display(),
                "amount": str(obj.total),
                "currency": obj.currency,
                "razorpay_order_id": obj.razorpay_order_id,
                "razorpay_payment_id": obj.razorpay_payment_id,
                "created_at": obj.created_at,
                "updated_at": obj.updated_at,
            })
        return payments

    def get_payment(self, obj: Order) -> dict[str, Any] | None:
        records = self.get_payments(obj)
        return records[0] if records else None

    def get_inventory(self, obj: Order) -> dict[str, Any]:
        """Return reservation lifecycle history and related inventory movements."""
        from django.db.models import Q
        from apps.inventory.models import InventoryMovement

        # Use prefetched reservations
        reservations = list(obj.inventory_reservations.all())

        # Retrieve movements tied to this order by order number or id reference
        movements = list(
            InventoryMovement.objects.filter(
                Q(reference=f"Order {obj.order_number}")
                | Q(reference=obj.order_number)
                | (Q(idempotency_key__contains=str(obj.id)) if obj.id else Q())
            )
            .select_related(
                "inventory_item__variant__product",
                "inventory_item__variant",
            )
            .order_by("-created_at")
        )

        return {
            "reservations": AdminOrderReservationSerializer(reservations, many=True).data,
            "movements": AdminOrderMovementSerializer(movements, many=True).data,
        }
