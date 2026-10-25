"""
Closet by Chilli — Admin Payment Serializers (Sprint A4.4).

Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprint A4.4.
Enforces:
- Sanitization: Never exposes webhook signatures, secrets, or raw provider tokens.
- Exposes authoritative operational fields, payment provider identifiers,
  and discrepancy evaluation findings.
"""

from __future__ import annotations

from typing import Any, Dict, List
from rest_framework import serializers

from apps.orders.admin_serializers import AdminOrderAuditLogSerializer
from apps.orders.models import Order
from apps.payments.reconciliation import evaluate_order_payment_discrepancy


class AdminPaymentCustomerSerializer(serializers.Serializer):
    """Sanitized customer identity for payment operations."""

    id = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    display_name = serializers.CharField(read_only=True)


class AdminPaymentListSerializer(serializers.ModelSerializer):
    """
    Paginated administrative payment list serializer.
    Represents authoritative payment records associated with customer orders.
    Never exposes cryptographic secrets or webhook signatures.
    """

    order_id = serializers.CharField(source="id", read_only=True)
    customer = serializers.SerializerMethodField()
    provider = serializers.SerializerMethodField()
    amount = serializers.DecimalField(
        source="total",
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
        read_only=True,
    )
    payment_status_display = serializers.CharField(source="get_payment_status_display", read_only=True)
    order_status = serializers.CharField(source="status", read_only=True)
    order_status_display = serializers.CharField(source="get_status_display", read_only=True)
    discrepancy_status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_id",
            "order_number",
            "customer",
            "provider",
            "razorpay_order_id",
            "razorpay_payment_id",
            "amount",
            "currency",
            "payment_status",
            "payment_status_display",
            "order_status",
            "order_status_display",
            "discrepancy_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_customer(self, obj: Order) -> Dict[str, str]:
        user = obj.user
        display_name = ""
        if hasattr(user, "profile") and user.profile and getattr(user.profile, "display_name", ""):
            display_name = user.profile.display_name.strip()
        elif obj.shipping_address_snapshot and isinstance(obj.shipping_address_snapshot, dict):
            display_name = str(obj.shipping_address_snapshot.get("full_name") or "").strip()

        if not display_name:
            display_name = user.email.split("@")[0] if user.email else "Patron"

        return {
            "id": str(user.id),
            "email": user.email,
            "display_name": display_name,
        }

    def get_provider(self, obj: Order) -> str:
        if obj.razorpay_order_id or obj.razorpay_payment_id:
            return "Razorpay"
        return "Internal"

    def get_discrepancy_status(self, obj: Order) -> str:
        status, _ = evaluate_order_payment_discrepancy(obj, check_duplicates=False)
        return status


class AdminPaymentDetailSerializer(AdminPaymentListSerializer):
    """
    Detailed administrative payment inspection serializer.
    Includes discrepancy breakdown findings, financial breakdown,
    and durable reconciliation audit log records.
    """

    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=True, read_only=True)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=True, read_only=True)
    shipping_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=True, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=True, read_only=True)
    discrepancy_details = serializers.SerializerMethodField()
    is_reconciled = serializers.SerializerMethodField()
    reconciled_at = serializers.SerializerMethodField()
    audit_logs = AdminOrderAuditLogSerializer(many=True, read_only=True)

    class Meta(AdminPaymentListSerializer.Meta):
        fields = AdminPaymentListSerializer.Meta.fields + [
            "subtotal",
            "discount",
            "shipping_amount",
            "tax_amount",
            "discrepancy_details",
            "is_reconciled",
            "reconciled_at",
            "audit_logs",
        ]
        read_only_fields = fields

    def get_discrepancy_status(self, obj: Order) -> str:
        status, _ = evaluate_order_payment_discrepancy(obj, check_duplicates=True)
        return status

    def get_discrepancy_details(self, obj: Order) -> List[str]:
        _, findings = evaluate_order_payment_discrepancy(obj, check_duplicates=True)
        return findings

    def get_is_reconciled(self, obj: Order) -> bool:
        return obj.payment_status == Order.PaymentStatus.PAID and bool(obj.razorpay_payment_id)

    def get_reconciled_at(self, obj: Order) -> Any:
        reconcile_log = obj.audit_logs.filter(
            operation_type="reconciliation",
            to_status=Order.PaymentStatus.PAID,
        ).first()
        if reconcile_log:
            return reconcile_log.created_at
        if obj.payment_status == Order.PaymentStatus.PAID:
            return obj.updated_at
        return None
