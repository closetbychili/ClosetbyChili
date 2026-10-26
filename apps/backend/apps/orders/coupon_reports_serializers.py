"""
Closet by Chilli — Coupon Reporting & Promotion Analytics Serializers.

Complies with Sprint A5.5, 04-backend-architecture.md, and 35-api-error-response-standards.md.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Optional

from rest_framework import serializers

from apps.orders.coupon_serializers import mask_customer_email
from apps.orders.models import Coupon, CouponRedemption


class AdminCouponReportOverviewSerializer(serializers.Serializer):
    """Serializer for high-level promotion metrics summary."""

    date_range = serializers.DictField(read_only=True)
    coupons_created = serializers.IntegerField(read_only=True)
    coupons_created_count = serializers.IntegerField(read_only=True)
    active_coupons = serializers.IntegerField(read_only=True)
    active_coupons_count = serializers.IntegerField(read_only=True)
    successful_redemptions_count = serializers.IntegerField(read_only=True)
    reserved_redemptions_count = serializers.IntegerField(read_only=True)
    released_redemptions_count = serializers.IntegerField(read_only=True)
    total_discount_granted = serializers.CharField(read_only=True)
    paid_orders_count = serializers.IntegerField(read_only=True)
    paid_orders_revenue = serializers.CharField(read_only=True)
    total_paid_revenue = serializers.CharField(read_only=True)
    gross_subtotal_before_discount = serializers.CharField(read_only=True)
    average_discount_per_redemption = serializers.CharField(read_only=True)
    average_paid_order_value = serializers.CharField(read_only=True)
    average_order_value_after_discount = serializers.CharField(read_only=True)
    average_order_value_before_discount = serializers.CharField(read_only=True)
    distinct_customers_count = serializers.IntegerField(read_only=True)
    orders_by_status = serializers.DictField(read_only=True)
    orders_by_order_status = serializers.DictField(read_only=True)
    orders_by_payment_status = serializers.DictField(read_only=True)
    total_configured_capacity = serializers.IntegerField(read_only=True, allow_null=True)
    total_remaining_capacity = serializers.IntegerField(read_only=True, allow_null=True)
    global_capacity_metrics = serializers.DictField(read_only=True, required=False)
    currency = serializers.CharField(read_only=True)


class AdminCouponPerformanceSerializer(serializers.ModelSerializer):
    """
    Serializer for individual coupon performance rows with annotated aggregates.
    """

    lifecycle_status = serializers.CharField(read_only=True)
    successful_redemptions_count = serializers.IntegerField(read_only=True, default=0)
    distinct_customers_count = serializers.IntegerField(read_only=True, default=0)
    paid_orders_count = serializers.IntegerField(read_only=True, default=0)
    paid_order_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    gross_subtotal_before_discount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    average_order_value = serializers.SerializerMethodField()
    average_order_value_before_discount = serializers.SerializerMethodField()
    remaining_capacity = serializers.SerializerMethodField()
    last_redemption_at = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "name",
            "description",
            "lifecycle_status",
            "is_active",
            "discount_type",
            "discount_value",
            "currency",
            "usage_limit",
            "per_customer_limit",
            "remaining_capacity",
            "successful_redemptions_count",
            "distinct_customers_count",
            "paid_orders_count",
            "paid_order_revenue",
            "total_discount_amount",
            "gross_subtotal_before_discount",
            "average_order_value",
            "average_order_value_before_discount",
            "last_redemption_at",
            "start_date",
            "end_date",
            "created_at",
        ]
        read_only_fields = fields

    def get_average_order_value(self, obj: Any) -> str:
        count = getattr(obj, "paid_orders_count", 0) or 0
        revenue = getattr(obj, "paid_order_revenue", Decimal("0.00")) or Decimal("0.00")
        if count > 0:
            return str((revenue / Decimal(count)).quantize(Decimal("0.01")))
        return "0.00"

    def get_average_order_value_before_discount(self, obj: Any) -> str:
        count = getattr(obj, "paid_orders_count", 0) or 0
        subtotal = getattr(obj, "gross_subtotal_before_discount", Decimal("0.00")) or Decimal("0.00")
        if count > 0:
            return str((subtotal / Decimal(count)).quantize(Decimal("0.01")))
        return "0.00"

    def get_remaining_capacity(self, obj: Any) -> Optional[int]:
        if obj.usage_limit is None:
            return None
        all_time = getattr(obj, "all_time_redemptions", None)
        if all_time is None:
            all_time = obj.redemptions.filter(state=CouponRedemption.State.REDEEMED).count()
        return max(0, obj.usage_limit - all_time)


class AdminCouponRedemptionReportSerializer(serializers.ModelSerializer):
    """
    Serializer for paginated audit redemption history.
    Adheres strictly to customer PII masking requirements.
    """

    coupon_code = serializers.CharField(source="coupon.code", read_only=True)
    coupon_name = serializers.CharField(source="coupon.name", read_only=True)
    customer_email_masked = serializers.SerializerMethodField()
    customer_display = serializers.SerializerMethodField()
    order_number = serializers.CharField(source="order.order_number", read_only=True, default=None)
    order_status = serializers.CharField(source="order.status", read_only=True, default=None)
    payment_status = serializers.CharField(source="order.payment_status", read_only=True, default=None)
    order_total = serializers.DecimalField(source="order.total", max_digits=12, decimal_places=2, read_only=True, default=None)

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
            "order_status",
            "payment_status",
            "order_total",
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
            return "Unknown"
        profile = getattr(obj.customer, "profile", None)
        if profile and profile.display_name:
            return str(profile.display_name)
        return mask_customer_email(obj.customer.email)
