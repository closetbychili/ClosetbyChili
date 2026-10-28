"""
Closet by Chilli — Admin Customer Directory & Detail Serializers (Sprints A6.1 & A6.2).

Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprints A6.1/A6.2.
Exposes sanitized customer identity, activity counters, spend totals, saved addresses,
and paginated order history with shipment summaries.
Never exposes passwords, tokens, or sensitive credentials.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Optional, cast

from rest_framework import serializers

from apps.accounts.models import CustomerNote, CustomerProfile, User
from apps.addresses.models import Address
from apps.orders.models import Order, Shipment


class AdminCustomerListSerializer(serializers.ModelSerializer):
    """
    Serializer for paginated Customer Directory list view.
    """

    display_name = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    total_order_count = serializers.IntegerField(read_only=True, default=0)
    successful_paid_order_count = serializers.IntegerField(read_only=True, default=0)
    total_paid_spend = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, default=Decimal("0.00")
    )
    latest_order_date = serializers.DateTimeField(read_only=True, allow_null=True)
    currency = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "display_name",
            "phone",
            "role",
            "is_active",
            "created_at",
            "updated_at",
            "total_order_count",
            "successful_paid_order_count",
            "total_paid_spend",
            "latest_order_date",
            "currency",
        ]
        read_only_fields = fields

    def get_display_name(self, obj: User) -> str:
        profile = getattr(obj, "profile", None)
        if profile and profile.display_name:
            return str(profile.display_name).strip()
        if obj.email:
            return obj.email.split("@")[0].strip()
        return "Customer"

    def get_phone(self, obj: User) -> str:
        profile = getattr(obj, "profile", None)
        if profile and profile.phone:
            return str(profile.phone).strip()
        return ""

    def get_currency(self, obj: User) -> str:
        return "INR"


class AdminCustomerAddressSerializer(serializers.ModelSerializer):
    """
    Serializer for saved customer addresses in the admin detail view.
    """

    class Meta:
        model = Address
        fields = [
            "id",
            "full_name",
            "phone",
            "address_line1",
            "address_line2",
            "landmark",
            "city",
            "state",
            "postal_code",
            "country",
            "address_type",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AdminCustomerOrderShipmentSerializer(serializers.ModelSerializer):
    """
    Serializer for shipment summary embedded in customer order history.
    """

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Shipment
        fields = [
            "id",
            "status",
            "status_display",
            "carrier",
            "tracking_number",
            "tracking_url",
            "dispatched_at",
            "delivered_at",
        ]
        read_only_fields = fields


class AdminCustomerOrderHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for recent customer order history entries.
    Uses historical totals and snapshots without recalculating prices.
    """

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_status_display = serializers.CharField(source="get_payment_status_display", read_only=True)
    item_count = serializers.IntegerField(source="annotated_item_count", read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=True)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=True)
    shipping_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=True)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=True)
    shipment = serializers.SerializerMethodField()

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
            "discount",
            "shipping_amount",
            "tax_amount",
            "total",
            "coupon_code",
            "item_count",
            "shipment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_shipment(self, obj: Order) -> Optional[dict[str, Any]]:
        shipments = list(obj.shipments.all())
        if not shipments:
            return None
        # Return newest shipment by created_at or id
        latest = max(shipments, key=lambda s: getattr(s, "created_at", None) or s.id)
        return cast(dict[str, Any], AdminCustomerOrderShipmentSerializer(latest).data)


class AdminCustomerDetailSerializer(AdminCustomerListSerializer):
    """
    Comprehensive serializer for admin single-customer view (Sprint A6.2).
    Includes:
    - Account identity & timestamps
    - Authoritative purchase metrics (paid spend, AOV, status counts)
    - Customer saved addresses
    - Paginated order history with shipment tracking
    """

    supabase_user_id = serializers.UUIDField(read_only=True)
    total_orders = serializers.IntegerField(source="total_order_count", read_only=True)
    paid_orders = serializers.IntegerField(source="successful_paid_order_count", read_only=True)
    pending_orders = serializers.IntegerField(source="pending_orders_count", read_only=True, default=0)
    cancelled_orders = serializers.IntegerField(source="cancelled_orders_count", read_only=True, default=0)
    average_order_value = serializers.SerializerMethodField()

    account = serializers.SerializerMethodField()
    purchase_summary = serializers.SerializerMethodField()
    addresses = serializers.SerializerMethodField()
    orders = serializers.SerializerMethodField()

    class Meta(AdminCustomerListSerializer.Meta):
        fields = AdminCustomerListSerializer.Meta.fields + [
            "supabase_user_id",
            "total_orders",
            "paid_orders",
            "pending_orders",
            "cancelled_orders",
            "average_order_value",
            "account",
            "purchase_summary",
            "addresses",
            "orders",
        ]
        read_only_fields = fields

    def get_average_order_value(self, obj: User) -> str:
        """
        Computes Average Order Value (AOV) = total_paid_spend / paid_orders.
        Denominator is strictly non-cancelled paid purchases.
        """
        paid_count = getattr(obj, "successful_paid_order_count", 0) or 0
        total_spend = getattr(obj, "total_paid_spend", Decimal("0.00")) or Decimal("0.00")
        if paid_count > 0:
            aov = (total_spend / Decimal(paid_count)).quantize(Decimal("0.01"))
            return f"{aov:.2f}"
        return "0.00"

    def get_account(self, obj: User) -> dict[str, Any]:
        return {
            "id": str(obj.id),
            "email": obj.email,
            "display_name": self.get_display_name(obj),
            "phone": self.get_phone(obj),
            "role": obj.role,
            "is_active": obj.is_active,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
            "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
            "supabase_user_id": str(obj.supabase_user_id) if obj.supabase_user_id else None,
        }

    def get_purchase_summary(self, obj: User) -> dict[str, Any]:
        paid_count = getattr(obj, "successful_paid_order_count", 0) or 0
        total_count = getattr(obj, "total_order_count", 0) or 0
        pending_count = getattr(obj, "pending_orders_count", 0) or 0
        cancelled_count = getattr(obj, "cancelled_orders_count", 0) or 0
        total_spend = getattr(obj, "total_paid_spend", Decimal("0.00")) or Decimal("0.00")
        latest_date = getattr(obj, "latest_order_date", None)
        return {
            "total_orders": total_count,
            "paid_orders": paid_count,
            "pending_orders": pending_count,
            "cancelled_orders": cancelled_count,
            "total_paid_spend": f"{total_spend:.2f}",
            "average_order_value": self.get_average_order_value(obj),
            "latest_order_date": latest_date.isoformat() if latest_date else None,
            "currency": "INR",
        }

    def get_addresses(self, obj: User) -> list[dict[str, Any]]:
        addresses = self.context.get("addresses")
        if addresses is None:
            addresses = obj.addresses.all().order_by("-is_default", "-updated_at", "-created_at")
        return cast(list[dict[str, Any]], AdminCustomerAddressSerializer(addresses, many=True).data)

    def get_orders(self, obj: User) -> dict[str, Any]:
        from apps.accounts.admin_customers_service import get_customer_orders_paginated

        orders_data = self.context.get("orders_data")
        if orders_data is None:
            orders_data = get_customer_orders_paginated(obj, page=1, page_size=10)
        return {
            "count": orders_data["count"],
            "page": orders_data["page"],
            "page_size": orders_data["page_size"],
            "total_pages": orders_data["total_pages"],
            "has_next": orders_data["has_next"],
            "has_previous": orders_data["has_previous"],
            "results": cast(
                list[dict[str, Any]],
                AdminCustomerOrderHistorySerializer(orders_data["results"], many=True).data,
            ),
        }


class AdminCustomerNoteSerializer(serializers.ModelSerializer):
    """
    Serializer for internal customer support notes (Sprint A6.3).
    Preserves author attribution and timestamps. Read-only author and id.
    """

    author_name = serializers.SerializerMethodField()
    author_email = serializers.SerializerMethodField()

    class Meta:
        model = CustomerNote
        fields = [
            "id",
            "customer_id",
            "author_id",
            "author_name",
            "author_email",
            "body",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "customer_id",
            "author_id",
            "author_name",
            "author_email",
            "created_at",
        ]

    def get_author_name(self, obj: CustomerNote) -> str:
        if not obj.author:
            return "System / Atelier Staff"
        profile = getattr(obj.author, "profile", None)
        if profile and profile.display_name:
            return str(profile.display_name).strip()
        if obj.author.email:
            return obj.author.email.split("@")[0].strip()
        return "Staff Member"

    def get_author_email(self, obj: CustomerNote) -> str:
        return obj.author.email if obj.author and obj.author.email else ""


class AdminCustomerNoteCreateSerializer(serializers.Serializer):
    """
    Input serializer for creating a new internal customer support note.
    Accepts note body only.
    """

    body = serializers.CharField(
        max_length=3000,
        trim_whitespace=True,
        error_messages={
            "blank": "Note body cannot be empty.",
            "required": "Note body is required.",
            "max_length": "Note body cannot exceed 3000 characters.",
        },
    )

    def validate_body(self, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Note body cannot be empty.")
        if len(stripped) > 3000:
            raise serializers.ValidationError("Note body cannot exceed 3000 characters.")
        return stripped

