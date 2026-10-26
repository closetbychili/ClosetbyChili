"""
Closet by Chilli — Admin Customer Directory Serializers (Sprint A6.1).

Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprint A6.1.
Exposes sanitized customer identity, activity counters, and spend totals.
Never exposes passwords, tokens, or sensitive credentials.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from rest_framework import serializers

from apps.accounts.models import CustomerProfile, User


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
        # Fallback to email username or 'Customer'
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


class AdminCustomerDetailSerializer(AdminCustomerListSerializer):
    """
    Serializer for detailed Customer identity summary.
    """

    supabase_user_id = serializers.UUIDField(read_only=True)

    class Meta(AdminCustomerListSerializer.Meta):
        fields = AdminCustomerListSerializer.Meta.fields + ["supabase_user_id"]
        read_only_fields = fields
