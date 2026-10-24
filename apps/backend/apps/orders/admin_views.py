"""
Closet by Chilli — Admin Order Views.

Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprint A4.1.
Implements the administrative order listing endpoint with multi-field search,
status filtering, date-range filtering, deterministic sorting, and pagination.
"""

from __future__ import annotations

import datetime
import uuid
from typing import Any

from django.db.models import Count, Q
from django.db.models.functions import Coalesce
from django.utils import dateparse, timezone
from rest_framework import filters, generics
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request

from apps.accounts.permissions import IsAdminUser
from apps.common.pagination import StandardResultsSetPagination
from apps.orders.admin_serializers import AdminOrderListSerializer
from apps.orders.models import Order

ALLOWED_ORDERING_FIELDS = {
    "created_at",
    "-created_at",
    "updated_at",
    "-updated_at",
    "total",
    "-total",
    "subtotal",
    "-subtotal",
    "order_number",
    "-order_number",
    "status",
    "-status",
    "payment_status",
    "-payment_status",
    "item_count",
    "-item_count",
}


def parse_date_param(val: str, is_end: bool = False) -> datetime.datetime:
    """
    Safely parse an ISO-8601 datetime or date string into a timezone-aware datetime.
    For date-only strings (e.g. 2026-10-24), bounds to the beginning of the day
    (00:00:00) or end of the day (23:59:59.999999).
    """
    cleaned = val.strip()

    # If it has no time component delimiter ('T' or space), parse as date first
    if "T" not in cleaned and " " not in cleaned:
        parsed_date = dateparse.parse_date(cleaned)
        if parsed_date is not None:
            target_time = datetime.time.max if is_end else datetime.time.min
            dt = datetime.datetime.combine(parsed_date, target_time)
            return timezone.make_aware(dt)

    # Otherwise, try parsing full ISO datetime
    parsed_dt = dateparse.parse_datetime(cleaned)
    if parsed_dt is not None:
        if timezone.is_naive(parsed_dt):
            return timezone.make_aware(parsed_dt)
        return parsed_dt

    # Fallback to date parsing
    parsed_date = dateparse.parse_date(cleaned)
    if parsed_date is not None:
        target_time = datetime.time.max if is_end else datetime.time.min
        dt = datetime.datetime.combine(parsed_date, target_time)
        return timezone.make_aware(dt)

    raise ValueError(f"Invalid date/time format: '{val}'. Expected ISO-8601 format (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ).")


class AdminOrderFilterBackend(filters.BaseFilterBackend):
    """
    Filter backend for administrative order listing.
    Supports:
    - Search: order_number, customer email, customer display name, or shipping address name
    - status: validated against Order.Status choices (case-insensitive)
    - payment_status: validated against Order.PaymentStatus choices (case-insensitive)
    - Date range: created_after / date_from / start_date and created_before / date_to / end_date
    - customer_id: UUID of user
    - ordering: validated against ALLOWED_ORDERING_FIELDS
    """

    def filter_queryset(self, request: Request, queryset, view):
        # 1. Search across order number, customer email, profile name, or address snapshot
        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(order_number__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__profile__display_name__icontains=search)
                | Q(shipping_address_snapshot__icontains=search)
            )

        # 2. Order Status filter
        status_param = (request.query_params.get("status") or "").strip().upper()
        if status_param and status_param != "ALL":
            valid_statuses = {choice[0].upper(): choice[0] for choice in Order.Status.choices}
            if status_param not in valid_statuses:
                raise ValidationError({
                    "status": (
                        f"Invalid order status '{status_param}'. "
                        f"Allowed choices are: {', '.join(sorted(valid_statuses.keys()))}."
                    )
                })
            queryset = queryset.filter(status=valid_statuses[status_param])

        # 3. Payment Status filter
        payment_param = (request.query_params.get("payment_status") or "").strip().upper()
        if payment_param and payment_param != "ALL":
            valid_payments = {choice[0].upper(): choice[0] for choice in Order.PaymentStatus.choices}
            if payment_param not in valid_payments:
                raise ValidationError({
                    "payment_status": (
                        f"Invalid payment status '{payment_param}'. "
                        f"Allowed choices are: {', '.join(sorted(valid_payments.keys()))}."
                    )
                })
            queryset = queryset.filter(payment_status=valid_payments[payment_param])

        # 4. Customer ID filter
        customer_id = (request.query_params.get("customer_id") or request.query_params.get("user_id") or "").strip()
        if customer_id and customer_id.lower() != "all":
            try:
                cust_uuid = uuid.UUID(customer_id)
                queryset = queryset.filter(user_id=cust_uuid)
            except (ValueError, TypeError):
                raise ValidationError({"customer_id": f"Invalid customer UUID '{customer_id}'."})

        # 5. Date Range filters (created_after / start_date / date_from and created_before / end_date / date_to)
        after_param = (
            request.query_params.get("created_after")
            or request.query_params.get("date_from")
            or request.query_params.get("start_date")
            or ""
        ).strip()
        before_param = (
            request.query_params.get("created_before")
            or request.query_params.get("date_to")
            or request.query_params.get("end_date")
            or ""
        ).strip()

        dt_after = None
        dt_before = None

        if after_param:
            try:
                dt_after = parse_date_param(after_param, is_end=False)
                queryset = queryset.filter(created_at__gte=dt_after)
            except ValueError as err:
                raise ValidationError({"created_after": str(err)})

        if before_param:
            try:
                dt_before = parse_date_param(before_param, is_end=True)
                queryset = queryset.filter(created_at__lte=dt_before)
            except ValueError as err:
                raise ValidationError({"created_before": str(err)})

        if dt_after and dt_before and dt_after > dt_before:
            raise ValidationError({
                "date_range": "created_after cannot be later than created_before."
            })

        # 6. Sorting / Ordering
        ordering = (request.query_params.get("ordering") or "").strip()
        if ordering:
            if ordering not in ALLOWED_ORDERING_FIELDS:
                raise ValidationError({
                    "ordering": (
                        f"Invalid ordering field '{ordering}'. "
                        f"Allowed fields are: {', '.join(sorted(ALLOWED_ORDERING_FIELDS))}."
                    )
                })
            # Map item_count ordering to annotated_item_count
            mapped_ordering = ordering
            if ordering == "item_count":
                mapped_ordering = "annotated_item_count"
            elif ordering == "-item_count":
                mapped_ordering = "-annotated_item_count"

            # Append -id for secondary stable tie-breaker if not already present
            if mapped_ordering in ("-id", "id"):
                queryset = queryset.order_by(mapped_ordering)
            else:
                queryset = queryset.order_by(mapped_ordering, "-id")
        else:
            queryset = queryset.order_by("-created_at", "-id")

        return queryset


class AdminOrderListView(generics.ListAPIView):
    """
    GET /api/v1/admin/orders/

    Paginated listing of orders for administrative operations.
    Enforces administrator permissions.
    Annotates annotated_item_count using ORM aggregation to prevent N+1 queries.
    Never loads order items into memory.
    """

    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [AdminOrderFilterBackend]
    serializer_class = AdminOrderListSerializer

    def get_queryset(self):
        return (
            Order.objects.select_related("user", "user__profile")
            .annotate(annotated_item_count=Coalesce(Count("items", distinct=True), 0))
            .all()
        )

