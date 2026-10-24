"""
Closet by Chilli — Admin Order Serializers.

Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprint A4.1.
Serializes administrative order list data with customer summaries and aggregated item counts.
Exposes zero auth secrets, tokens, or passwords.
"""

from __future__ import annotations

from typing import Any
from rest_framework import serializers

from apps.orders.models import Order


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
