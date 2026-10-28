"""
Closet by Chilli — Admin Customer Directory Service (Sprint A6.1).

Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprint A6.1.
Implements:
- Optimized single-query database-level aggregation of orders, paid orders, and paid spend.
- Authoritative calculation of spend based on payment_status='PAID' and status!='CANCELLED'.
- Search by customer email, display name, phone, or UUID.
- Filtering by date range (account creation), order presence (has_orders), and active status.
- Deterministic multi-column sorting and bounded pagination.
- Zero N+1 queries.
"""

from __future__ import annotations

import datetime
from decimal import Decimal
from typing import Optional, Tuple
import uuid

from django.db.models import (
    Case,
    Count,
    DecimalField,
    F,
    Max,
    Q,
    QuerySet,
    Sum,
    Value,
    When,
)
from django.db.models.functions import Coalesce
from django.utils import dateparse, timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.orders.models import Order


def parse_customer_date_range(
    date_from_param: Optional[str] = None,
    date_to_param: Optional[str] = None,
) -> Tuple[Optional[datetime.datetime], Optional[datetime.datetime]]:
    """
    Parses and validates ISO-8601 start and end date strings for customer registration filtering.
    Date-only strings (YYYY-MM-DD) are normalized:
    - date_from gets 00:00:00
    - date_to gets 23:59:59.999999
    Enforces date_from <= date_to.
    """
    tz = timezone.get_current_timezone()
    start_dt: Optional[datetime.datetime] = None
    end_dt: Optional[datetime.datetime] = None

    if date_from_param and date_from_param.strip():
        val = date_from_param.strip()
        if "T" not in val and " " not in val:
            parsed_d = dateparse.parse_date(val)
            if parsed_d is not None:
                start_dt = timezone.make_aware(
                    datetime.datetime.combine(parsed_d, datetime.time.min), tz
                )
            else:
                raise ValidationError({"date_from": f"Invalid date_from format '{val}'. Use ISO-8601 format."})
        else:
            parsed_dt = dateparse.parse_datetime(val)
            if parsed_dt is not None:
                start_dt = timezone.make_aware(parsed_dt, tz) if timezone.is_naive(parsed_dt) else parsed_dt
            else:
                raise ValidationError({"date_from": f"Invalid date_from format '{val}'. Use ISO-8601 format."})

    if date_to_param and date_to_param.strip():
        val = date_to_param.strip()
        if "T" not in val and " " not in val:
            parsed_d = dateparse.parse_date(val)
            if parsed_d is not None:
                end_dt = timezone.make_aware(
                    datetime.datetime.combine(parsed_d, datetime.time.max), tz
                )
            else:
                raise ValidationError({"date_to": f"Invalid date_to format '{val}'. Use ISO-8601 format."})
        else:
            parsed_dt = dateparse.parse_datetime(val)
            if parsed_dt is not None:
                end_dt = timezone.make_aware(parsed_dt, tz) if timezone.is_naive(parsed_dt) else parsed_dt
            else:
                raise ValidationError({"date_to": f"Invalid date_to format '{val}'. Use ISO-8601 format."})

    if start_dt and end_dt and start_dt > end_dt:
        raise ValidationError({"date_range": "date_from cannot be later than date_to."})

    return start_dt, end_dt


SORT_MAP = {
    "newest": ["-created_at", "-id"],
    "-created_at": ["-created_at", "-id"],
    "oldest": ["created_at", "id"],
    "created_at": ["created_at", "id"],
    "name": ["profile__display_name", "-created_at", "-id"],
    "name_asc": ["profile__display_name", "-created_at", "-id"],
    "name_desc": ["-profile__display_name", "-created_at", "-id"],
    "order_count": ["-total_order_count", "-created_at", "-id"],
    "order_count_desc": ["-total_order_count", "-created_at", "-id"],
    "order_count_asc": ["total_order_count", "-created_at", "-id"],
    "paid_spend": ["-total_paid_spend", "-created_at", "-id"],
    "paid_spend_desc": ["-total_paid_spend", "-created_at", "-id"],
    "paid_spend_asc": ["total_paid_spend", "-created_at", "-id"],
    "latest_order": ["-latest_order_date", "-created_at", "-id"],
    "latest_order_desc": ["-latest_order_date", "-created_at", "-id"],
    "latest_order_asc": ["latest_order_date", "-created_at", "-id"],
}


def get_admin_customers_queryset(
    search: Optional[str] = None,
    sort: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    has_orders: Optional[str] = None,
    status_param: Optional[str] = None,
    role: Optional[str] = None,
) -> QuerySet[User]:
    """
    Constructs an annotated queryset of Customer accounts with aggregated metrics:
    - total_order_count: Count of all orders placed.
    - successful_paid_order_count: Count of non-cancelled orders with payment_status='PAID'.
    - total_paid_spend: Sum of total on non-cancelled orders with payment_status='PAID'.
    - latest_order_date: Max created_at across all customer orders.
    """
    qs = User.objects.all()

    # 1. Role scoping
    if role and role.strip() and role.strip().lower() != "all":
        qs = qs.filter(role=role.strip().lower())
    else:
        # Default customer directory: Exclude internal staff and administrators
        qs = qs.exclude(role__in=[User.Role.STAFF, User.Role.ADMIN])

    # 2. Database Aggregations (Single-query, avoids N+1)
    qs = qs.select_related("profile").annotate(
        total_order_count=Count("orders", distinct=True),
        successful_paid_order_count=Count(
            Case(
                When(
                    Q(orders__payment_status=Order.PaymentStatus.PAID)
                    & ~Q(orders__status=Order.Status.CANCELLED),
                    then="orders__id",
                )
            ),
            distinct=True,
        ),
        total_paid_spend=Coalesce(
            Sum(
                Case(
                    When(
                        Q(orders__payment_status=Order.PaymentStatus.PAID)
                        & ~Q(orders__status=Order.Status.CANCELLED),
                        then=F("orders__total"),
                    )
                )
            ),
            Value(Decimal("0.00")),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        ),
        latest_order_date=Max("orders__created_at"),
    )

    # 3. Search Filter
    if search and search.strip():
        term = search.strip()
        uuid_obj = None
        try:
            uuid_obj = uuid.UUID(term)
        except (ValueError, AttributeError):
            pass

        if uuid_obj:
            qs = qs.filter(
                Q(id=uuid_obj)
                | Q(supabase_user_id=uuid_obj)
                | Q(email__icontains=term)
                | Q(profile__display_name__icontains=term)
                | Q(profile__phone__icontains=term)
            )
        else:
            qs = qs.filter(
                Q(email__icontains=term)
                | Q(profile__display_name__icontains=term)
                | Q(profile__phone__icontains=term)
            )

    # 4. Date Range Filter (Account creation)
    start_dt, end_dt = parse_customer_date_range(date_from, date_to)
    if start_dt:
        qs = qs.filter(created_at__gte=start_dt)
    if end_dt:
        qs = qs.filter(created_at__lte=end_dt)

    # 5. Order Presence Filter
    if has_orders is not None and has_orders != "" and has_orders != "all":
        val = str(has_orders).lower().strip()
        if val in {"true", "1", "yes"}:
            qs = qs.filter(total_order_count__gt=0)
        elif val in {"false", "0", "no"}:
            qs = qs.filter(total_order_count=0)
        else:
            raise ValidationError(
                {"has_orders": f"Invalid has_orders value '{has_orders}'. Expected true, false, or all."}
            )

    # 6. Active Status Filter
    if status_param is not None and status_param != "" and status_param != "all":
        val = str(status_param).lower().strip()
        if val in {"active", "true", "1"}:
            qs = qs.filter(is_active=True)
        elif val in {"inactive", "false", "0"}:
            qs = qs.filter(is_active=False)
        else:
            raise ValidationError(
                {"status": f"Invalid status value '{status_param}'. Expected active, inactive, or all."}
            )

    # 7. Deterministic Ordering
    sort_key = (sort or "").strip().lower()
    ordering_fields = SORT_MAP.get(sort_key, ["-created_at", "-id"])
    return qs.order_by(*ordering_fields)


def get_admin_customer_detail_queryset(customer_id: uuid.UUID | str) -> QuerySet[User]:
    """
    Returns an annotated single-customer queryset by ID, including order counts and paid spend.
    """
    return (
        User.objects.filter(id=customer_id)
        .select_related("profile")
        .annotate(
            total_order_count=Count("orders", distinct=True),
            successful_paid_order_count=Count(
                Case(
                    When(
                        Q(orders__payment_status=Order.PaymentStatus.PAID)
                        & ~Q(orders__status=Order.Status.CANCELLED),
                        then="orders__id",
                    )
                ),
                distinct=True,
            ),
            pending_orders_count=Count(
                Case(
                    When(
                        (
                            Q(orders__payment_status=Order.PaymentStatus.PENDING)
                            | Q(orders__status=Order.Status.PENDING)
                        )
                        & ~Q(orders__status=Order.Status.CANCELLED)
                        & ~Q(orders__payment_status=Order.PaymentStatus.REFUNDED),
                        then="orders__id",
                    )
                ),
                distinct=True,
            ),
            cancelled_orders_count=Count(
                Case(
                    When(
                        Q(orders__status=Order.Status.CANCELLED)
                        | Q(orders__payment_status=Order.PaymentStatus.FAILED),
                        then="orders__id",
                    )
                ),
                distinct=True,
            ),
            total_paid_spend=Coalesce(
                Sum(
                    Case(
                        When(
                            Q(orders__payment_status=Order.PaymentStatus.PAID)
                            & ~Q(orders__status=Order.Status.CANCELLED),
                            then=F("orders__total"),
                        )
                    )
                ),
                Value(Decimal("0.00")),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            latest_order_date=Max("orders__created_at"),
        )
    )


def get_customer_orders_paginated(
    user: User, page: int = 1, page_size: int = 10
) -> dict:
    """
    Retrieves bounded, paginated order history for a specific customer.
    Prefetches shipments and annotates distinct item count to eliminate N+1 queries.
    """
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 10
    elif page_size > 50:
        page_size = 50

    orders_qs = (
        user.orders.all()
        .prefetch_related("shipments")
        .annotate(annotated_item_count=Count("items", distinct=True))
        .order_by("-created_at", "-id")
    )
    total_count = orders_qs.count()
    total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1
    offset = (page - 1) * page_size
    results = list(orders_qs[offset : offset + page_size])

    return {
        "count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
        "results": results,
    }

