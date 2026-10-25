"""
Closet by Chilli — Admin Payment Views (Sprint A4.4).

Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprint A4.4.
Implements:
- Admin-only paginated listing of payments with multi-field search, status filtering,
  provider filtering, date-range filtering, and deterministic sorting.
- Admin-only payment detail view with authoritative discrepancy analysis.
- Safe, audited reconciliation endpoint using live authenticated Razorpay checks.
- Sanitized payloads (never exposes secrets or webhook signatures).
"""

from __future__ import annotations

import datetime
import uuid
from typing import Any

from django.db.models import Prefetch, Q
from django.utils import dateparse, timezone
from rest_framework import filters, generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminUser
from apps.common.pagination import StandardResultsSetPagination
from apps.orders.admin_views import parse_date_param
from apps.orders.models import Order, OrderAuditLog, OrderItem
from apps.payments.admin_serializers import (
    AdminPaymentDetailSerializer,
    AdminPaymentListSerializer,
)
from apps.payments.reconciliation import (
    evaluate_order_payment_discrepancy,
    reconcile_order_payment,
)

ALLOWED_ORDERING_FIELDS = {
    "created_at",
    "-created_at",
    "updated_at",
    "-updated_at",
    "total",
    "-total",
    "order_number",
    "-order_number",
    "payment_status",
    "-payment_status",
}


def resolve_payment_order(payment_id_param: str) -> Order:
    """
    Authoritative lookup of an order payment record by UUID, order_number,
    razorpay_payment_id, or razorpay_order_id.
    """
    cleaned = (payment_id_param or "").strip()
    if not cleaned:
        raise NotFound("Payment record not found.")

    order_uuid = None
    try:
        order_uuid = uuid.UUID(cleaned)
    except (ValueError, AttributeError):
        order_uuid = None

    queryset = Order.objects.select_related(
        "user",
        "user__profile",
    ).prefetch_related(
        Prefetch(
            "items",
            queryset=OrderItem.objects.select_related("product", "variant"),
        ),
        Prefetch(
            "audit_logs",
            queryset=OrderAuditLog.objects.select_related("actor").order_by("-created_at"),
        ),
    )

    if order_uuid:
        order = queryset.filter(id=order_uuid).first()
    else:
        order = (
            queryset.filter(
                Q(order_number=cleaned)
                | Q(razorpay_payment_id=cleaned)
                | Q(razorpay_order_id=cleaned)
            ).first()
        )

    if not order:
        raise NotFound(f"Payment record '{cleaned}' not found.")

    return order


class AdminPaymentFilterBackend(filters.BaseFilterBackend):
    """
    Filter backend for administrative payment listing.
    Supports:
    - Search: order_number, razorpay_order_id, razorpay_payment_id, customer email
    - payment_status: validated against Order.PaymentStatus choices
    - provider: 'razorpay' or 'internal'
    - Date range: created_after / date_from / start_date and created_before / date_to / end_date
    - ordering: validated against ALLOWED_ORDERING_FIELDS
    """

    def filter_queryset(self, request: Request, queryset, view):
        # 1. Search
        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(order_number__icontains=search)
                | Q(razorpay_order_id__icontains=search)
                | Q(razorpay_payment_id__icontains=search)
                | Q(user__email__icontains=search)
            )

        # 2. Payment Status filter
        status_param = (
            request.query_params.get("payment_status")
            or request.query_params.get("status")
            or ""
        ).strip().upper()
        if status_param:
            valid_statuses = {c[0] for c in Order.PaymentStatus.choices}
            if status_param not in valid_statuses:
                raise ValidationError({
                    "payment_status": f"Invalid payment_status '{status_param}'. Allowed: {', '.join(sorted(valid_statuses))}."
                })
            queryset = queryset.filter(payment_status=status_param)

        # 3. Provider filter
        provider_param = (request.query_params.get("provider") or "").strip().lower()
        if provider_param:
            if provider_param == "razorpay":
                queryset = queryset.filter(
                    Q(razorpay_order_id__isnull=False) | Q(razorpay_payment_id__isnull=False)
                )
            elif provider_param == "internal":
                queryset = queryset.filter(
                    Q(razorpay_order_id__isnull=True) & Q(razorpay_payment_id__isnull=True)
                )
            else:
                raise ValidationError({
                    "provider": f"Invalid provider '{provider_param}'. Allowed choices: 'razorpay', 'internal'."
                })

        # 4. Date Range Filters
        date_from_str = (
            request.query_params.get("created_after")
            or request.query_params.get("date_from")
            or request.query_params.get("start_date")
        )
        if date_from_str:
            try:
                dt_from = parse_date_param(date_from_str, is_end=False)
                queryset = queryset.filter(created_at__gte=dt_from)
            except ValueError as exc:
                raise ValidationError({"date_from": str(exc)}) from exc

        date_to_str = (
            request.query_params.get("created_before")
            or request.query_params.get("date_to")
            or request.query_params.get("end_date")
        )
        if date_to_str:
            try:
                dt_to = parse_date_param(date_to_str, is_end=True)
                queryset = queryset.filter(created_at__lte=dt_to)
            except ValueError as exc:
                raise ValidationError({"date_to": str(exc)}) from exc

        # 5. Ordering
        ordering_param = (request.query_params.get("ordering") or "").strip()
        if ordering_param:
            if ordering_param not in ALLOWED_ORDERING_FIELDS:
                raise ValidationError({
                    "ordering": (
                        f"Invalid ordering field '{ordering_param}'. Allowed fields: {', '.join(sorted(ALLOWED_ORDERING_FIELDS))}."
                    )
                })
            queryset = queryset.order_by(ordering_param, "-created_at")
        else:
            queryset = queryset.order_by("-created_at")

        return queryset


class AdminPaymentListView(generics.ListAPIView):
    """
    GET /api/v1/admin/payments/

    Paginated listing of payment transactions and verification states for admin console.
    Enforces administrator permissions.
    """

    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [AdminPaymentFilterBackend]
    serializer_class = AdminPaymentListSerializer

    def get_queryset(self):
        return (
            Order.objects.select_related("user", "user__profile")
            .prefetch_related("items")
            .all()
        )

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        response = super().list(request, *args, **kwargs)

        # Optional discrepancy filtering applied after query if requested
        discrepancy_param = (request.query_params.get("discrepancy_status") or "").strip().upper()
        if discrepancy_param:
            results = response.data.get("results", [])
            filtered = [r for r in results if r.get("discrepancy_status") == discrepancy_param]
            response.data["results"] = filtered
            response.data["count"] = len(filtered)

        return response


class AdminPaymentDetailView(APIView):
    """
    GET /api/v1/admin/payments/<payment_id>/

    Detailed inspection of a payment transaction, authoritative discrepancy evaluation,
    and durable reconciliation audit log records.
    Enforces administrator permissions.
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request, payment_id: str) -> Response:
        order = resolve_payment_order(payment_id)
        serializer = AdminPaymentDetailSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminPaymentReconcileView(APIView):
    """
    POST /api/v1/admin/payments/<payment_id>/reconcile/

    Admin-only safe payment reconciliation action.
    Contacts Razorpay via authenticated server API, verifies live payment state,
    atomically transitions payment_status to PAID and status to CONFIRMED,
    finalizes inventory allocations, and writes durable OrderAuditLog.
    """

    permission_classes = [IsAdminUser]

    def post(self, request: Request, payment_id: str) -> Response:
        order = resolve_payment_order(payment_id)
        updated_order, outcome_code, message = reconcile_order_payment(
            order=order,
            actor=request.user,
        )

        refreshed = resolve_payment_order(str(updated_order.id))
        response_serializer = AdminPaymentDetailSerializer(refreshed)
        return Response(
            {
                "outcome": outcome_code,
                "message": message,
                "payment": response_serializer.data,
            },
            status=status.HTTP_200_OK,
        )
