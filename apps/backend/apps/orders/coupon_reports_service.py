"""
Closet by Chilli — Coupon Reporting & Promotion Analytics Service.

Complies with Sprint A5.5, 04-backend-architecture.md, and 06-domain-model.md.
Provides aggregated analytics, coupon performance benchmarking, and redemption audits:
- Strictly verifies payment state ('PAID' and status != 'CANCELLED') for revenue and discount figures.
- Database-level aggregations avoiding N+1 queries.
- Safe decimal arithmetic and consistent date filtering semantics.
- Privacy-safe customer representations.
"""

from __future__ import annotations

import re
from datetime import datetime, time
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from django.db.models import (
    Case,
    Count,
    F,
    Max,
    Q,
    Sum,
    Value,
    When,
)
from django.db.models.functions import Coalesce
from django.utils import dateparse, timezone
from rest_framework.exceptions import ValidationError

from apps.orders.models import Coupon, CouponRedemption, Order


def parse_reporting_date_range(
    start_date_param: Optional[str],
    end_date_param: Optional[str],
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """
    Parses and validates ISO-8601 start and end date strings.
    If date-only strings are provided (YYYY-MM-DD), start_date is set to 00:00:00
    and end_date is set to 23:59:59.999999 in the active timezone.
    Enforces start_date <= end_date.
    """
    tz = timezone.get_current_timezone()
    start_dt: Optional[datetime] = None
    end_dt: Optional[datetime] = None

    if start_date_param and start_date_param.strip():
        val = start_date_param.strip()
        if "T" not in val and " " not in val:
            parsed_d = dateparse.parse_date(val)
            if parsed_d is not None:
                start_dt = timezone.make_aware(datetime.combine(parsed_d, time.min), tz)
            else:
                raise ValidationError({"start_date": f"Invalid start_date format '{val}'. Use ISO-8601 format."})
        else:
            parsed_dt = dateparse.parse_datetime(val)
            if parsed_dt is not None:
                start_dt = timezone.make_aware(parsed_dt, tz) if timezone.is_naive(parsed_dt) else parsed_dt
            else:
                raise ValidationError({"start_date": f"Invalid start_date format '{val}'. Use ISO-8601 format."})

    if end_date_param and end_date_param.strip():
        val = end_date_param.strip()
        if "T" not in val and " " not in val:
            parsed_d = dateparse.parse_date(val)
            if parsed_d is not None:
                end_dt = timezone.make_aware(datetime.combine(parsed_d, time.max), tz)
            else:
                raise ValidationError({"end_date": f"Invalid end_date format '{val}'. Use ISO-8601 format."})
        else:
            parsed_dt = dateparse.parse_datetime(val)
            if parsed_dt is not None:
                end_dt = timezone.make_aware(parsed_dt, tz) if timezone.is_naive(parsed_dt) else parsed_dt
            else:
                raise ValidationError({"end_date": f"Invalid end_date format '{val}'. Use ISO-8601 format."})

    if start_dt and end_dt and start_dt > end_dt:
        raise ValidationError({"date_range": "start_date cannot be later than end_date."})

    return start_dt, end_dt


def get_coupon_reports_overview(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Computes high-level aggregated summary KPIs for coupon and promotion operations.
    Date filtering semantics:
    - Redemptions are filtered by `created_at` (reservation/redemption window).
    - Coupons created are filtered by `created_at`.
    - Active coupons count reflects current system state.
    - Paid discount and revenue strictly require `payment_status='PAID'` and `status!='CANCELLED'`.
    """
    # 1. Base Redemptions Queryset
    redemptions_qs = CouponRedemption.objects.all()
    if start_date:
        redemptions_qs = redemptions_qs.filter(created_at__gte=start_date)
    if end_date:
        redemptions_qs = redemptions_qs.filter(created_at__lte=end_date)

    # 2. Aggregations on Redemptions
    redemption_counts = redemptions_qs.aggregate(
        total_redemptions=Count("id"),
        finalized_count=Count(
            Case(When(state=CouponRedemption.State.REDEEMED, then=1))
        ),
        reserved_count=Count(
            Case(When(state=CouponRedemption.State.RESERVED, then=1))
        ),
        released_count=Count(
            Case(When(state=CouponRedemption.State.RELEASED, then=1))
        ),
    )

    successful_redemptions_count: int = redemption_counts["finalized_count"] or 0
    reserved_redemptions_count: int = redemption_counts["reserved_count"] or 0
    released_redemptions_count: int = redemption_counts["released_count"] or 0

    # 3. Distinct customers who successfully redeemed
    distinct_customers_count = (
        redemptions_qs.filter(state=CouponRedemption.State.REDEEMED)
        .values("customer_id")
        .distinct()
        .count()
    )

    # 4. Paid Qualifying Redemptions & Financial Totals
    # Strictly PAID orders that are NOT CANCELLED
    paid_redemptions_qs = redemptions_qs.filter(
        state=CouponRedemption.State.REDEEMED,
        order__isnull=False,
        order__payment_status=Order.PaymentStatus.PAID,
    ).exclude(order__status=Order.Status.CANCELLED)

    financial_aggs = paid_redemptions_qs.aggregate(
        total_discount=Sum("discount_amount"),
        paid_revenue=Sum("order__total"),
        gross_subtotal=Sum("order__subtotal"),
        paid_orders_count=Count("order_id", distinct=True),
    )

    total_discount_granted = Decimal(str(financial_aggs["total_discount"] or "0.00")).quantize(Decimal("0.01"))
    paid_orders_revenue = Decimal(str(financial_aggs["paid_revenue"] or "0.00")).quantize(Decimal("0.01"))
    gross_subtotal_before_discount = Decimal(str(financial_aggs["gross_subtotal"] or "0.00")).quantize(Decimal("0.01"))
    paid_orders_count: int = financial_aggs["paid_orders_count"] or 0

    if successful_redemptions_count > 0:
        avg_discount_per_redemption = (total_discount_granted / Decimal(successful_redemptions_count)).quantize(Decimal("0.01"))
    else:
        avg_discount_per_redemption = Decimal("0.00")

    if paid_orders_count > 0:
        avg_paid_order_value = (paid_orders_revenue / Decimal(paid_orders_count)).quantize(Decimal("0.01"))
        avg_order_value_before_discount = (gross_subtotal_before_discount / Decimal(paid_orders_count)).quantize(Decimal("0.01"))
    else:
        avg_paid_order_value = Decimal("0.00")
        avg_order_value_before_discount = Decimal("0.00")

    # 5. Orders by Status
    orders_by_status = {choice[0]: 0 for choice in Order.Status.choices}
    for row in (
        redemptions_qs.filter(order__isnull=False)
        .values("order__status")
        .annotate(count=Count("order_id", distinct=True))
    ):
        st = row["order__status"]
        if st in orders_by_status:
            orders_by_status[st] = row["count"]

    # 6. Orders by Payment Status
    orders_by_payment_status = {choice[0]: 0 for choice in Order.PaymentStatus.choices}
    for row in (
        redemptions_qs.filter(order__isnull=False)
        .values("order__payment_status")
        .annotate(count=Count("order_id", distinct=True))
    ):
        pst = row["order__payment_status"]
        if pst in orders_by_payment_status:
            orders_by_payment_status[pst] = row["count"]

    # 7. Coupon Counts and Capacities
    coupons_created_qs = Coupon.objects.all()
    if start_date:
        coupons_created_qs = coupons_created_qs.filter(created_at__gte=start_date)
    if end_date:
        coupons_created_qs = coupons_created_qs.filter(created_at__lte=end_date)
    coupons_created_count = coupons_created_qs.count()

    total_active_coupons = Coupon.objects.filter(is_active=True).count()

    # Aggregate global capacity across all configured coupons
    capacity_aggs = Coupon.objects.filter(usage_limit__isnull=False).aggregate(
        total_limit=Sum("usage_limit")
    )
    total_configured_capacity: Optional[int] = capacity_aggs["total_limit"]

    # Remaining capacity across limited coupons
    limited_coupons = Coupon.objects.filter(usage_limit__isnull=False).annotate(
        all_time_redemptions=Count(
            "redemptions",
            filter=Q(redemptions__state=CouponRedemption.State.REDEEMED),
        )
    )
    total_remaining_capacity = 0
    if total_configured_capacity is not None:
        for c in limited_coupons:
            rem = (c.usage_limit or 0) - c.all_time_redemptions
            total_remaining_capacity += max(0, rem)

    remaining_cap = total_remaining_capacity if total_configured_capacity is not None else None

    return {
        "date_range": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
        },
        "coupons_created": coupons_created_count,
        "coupons_created_count": coupons_created_count,
        "active_coupons": total_active_coupons,
        "active_coupons_count": total_active_coupons,
        "successful_redemptions_count": successful_redemptions_count,
        "reserved_redemptions_count": reserved_redemptions_count,
        "released_redemptions_count": released_redemptions_count,
        "total_discount_granted": str(total_discount_granted),
        "paid_orders_count": paid_orders_count,
        "paid_orders_revenue": str(paid_orders_revenue),
        "total_paid_revenue": str(paid_orders_revenue),
        "gross_subtotal_before_discount": str(gross_subtotal_before_discount),
        "average_discount_per_redemption": str(avg_discount_per_redemption),
        "average_paid_order_value": str(avg_paid_order_value),
        "average_order_value_after_discount": str(avg_paid_order_value),
        "average_order_value_before_discount": str(avg_order_value_before_discount),
        "distinct_customers_count": distinct_customers_count,
        "orders_by_status": orders_by_status,
        "orders_by_order_status": orders_by_status,
        "orders_by_payment_status": orders_by_payment_status,
        "total_configured_capacity": total_configured_capacity,
        "total_remaining_capacity": remaining_cap,
        "global_capacity_metrics": {
            "total_configured_capacity": total_configured_capacity,
            "total_remaining_capacity": remaining_cap,
        },
        "currency": "INR",
    }


def get_coupon_performance_queryset(
    search: Optional[str] = None,
    is_active: Optional[str] = None,
    discount_type: Optional[str] = None,
    lifecycle_status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    ordering: Optional[str] = None,
) -> Any:
    """
    Returns an annotated queryset of coupons with aggregated performance metrics.
    Uses efficient single-query database annotations to avoid N+1 queries.
    """
    now = timezone.now()
    qs = Coupon.objects.all()

    # 1. Search (code, name)
    if search and search.strip():
        term = search.strip()
        qs = qs.filter(Q(code__icontains=term) | Q(name__icontains=term))

    # 2. is_active filter
    if is_active is not None and is_active.strip():
        clean_active = is_active.strip().lower()
        if clean_active in ("true", "1", "yes"):
            qs = qs.filter(is_active=True)
        elif clean_active in ("false", "0", "no"):
            qs = qs.filter(is_active=False)

    # 3. discount_type filter
    if discount_type and discount_type.strip().upper() in Coupon.DiscountType.values:
        qs = qs.filter(discount_type=discount_type.strip().upper())

    # 4. lifecycle_status filter
    if lifecycle_status and lifecycle_status.strip().upper():
        clean_status = lifecycle_status.strip().upper()
        if clean_status == "INACTIVE":
            qs = qs.filter(is_active=False)
        elif clean_status == "CURRENTLY_VALID":
            qs = qs.filter(
                is_active=True,
                start_date__lte=now,
            ).filter(Q(end_date__isnull=True) | Q(end_date__gte=now))
        elif clean_status == "SCHEDULED":
            qs = qs.filter(is_active=True, start_date__gt=now)
        elif clean_status == "EXPIRED":
            qs = qs.filter(is_active=True, end_date__lt=now)

    # 5. Build conditional redemption filters for window
    redemption_cond = Q(redemptions__state=CouponRedemption.State.REDEEMED)
    if start_date:
        redemption_cond &= Q(redemptions__created_at__gte=start_date)
    if end_date:
        redemption_cond &= Q(redemptions__created_at__lte=end_date)

    # Paid order condition: payment_status='PAID' and status!='CANCELLED'
    paid_cond = (
        redemption_cond
        & Q(redemptions__order__isnull=False)
        & Q(redemptions__order__payment_status=Order.PaymentStatus.PAID)
        & ~Q(redemptions__order__status=Order.Status.CANCELLED)
    )

    # 6. Annotate metrics using conditional database expressions
    qs = qs.annotate(
        successful_redemptions_count=Count(
            "redemptions",
            filter=redemption_cond,
            distinct=True,
        ),
        distinct_customers_count=Count(
            "redemptions__customer",
            filter=redemption_cond,
            distinct=True,
        ),
        paid_orders_count=Count(
            "redemptions__order",
            filter=paid_cond,
            distinct=True,
        ),
        paid_order_revenue=Coalesce(
            Sum("redemptions__order__total", filter=paid_cond),
            Value(Decimal("0.00")),
        ),
        total_discount_amount=Coalesce(
            Sum("redemptions__discount_amount", filter=paid_cond),
            Value(Decimal("0.00")),
        ),
        gross_subtotal_before_discount=Coalesce(
            Sum("redemptions__order__subtotal", filter=paid_cond),
            Value(Decimal("0.00")),
        ),
        last_redemption_at=Max(
            "redemptions__finalized_at",
            filter=redemption_cond,
        ),
        all_time_redemptions=Count(
            "redemptions",
            filter=Q(redemptions__state=CouponRedemption.State.REDEEMED),
            distinct=True,
        ),
    )

    # 7. Deterministic Sorting
    ALLOWED_SORTING = {
        "redemptions_count": "successful_redemptions_count",
        "-redemptions_count": "-successful_redemptions_count",
        "revenue": "paid_order_revenue",
        "-revenue": "-paid_order_revenue",
        "discount_amount": "total_discount_amount",
        "-discount_amount": "-total_discount_amount",
        "recent_redemption": "last_redemption_at",
        "-recent_redemption": "-last_redemption_at",
        "code": "code",
        "-code": "-code",
        "created_at": "created_at",
        "-created_at": "-created_at",
    }

    sort_field = ALLOWED_SORTING.get(ordering or "", "-successful_redemptions_count")
    # Secondary order_by on 'id' guarantees deterministic pagination
    return qs.order_by(sort_field, "-created_at", "id")


def get_coupon_redemptions_report_queryset(
    coupon_id: Optional[str] = None,
    coupon_code: Optional[str] = None,
    state: Optional[str] = None,
    payment_status: Optional[str] = None,
    order_status: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    ordering: Optional[str] = None,
) -> Any:
    """
    Returns a filtered, privacy-safe queryset of all coupon redemptions for reporting.
    Eagerly loads related models to eliminate N+1 queries.
    """
    qs = (
        CouponRedemption.objects.all()
        .select_related("coupon", "customer", "customer__profile", "order")
    )

    if coupon_id and coupon_id.strip():
        qs = qs.filter(coupon_id=coupon_id.strip())

    if coupon_code and coupon_code.strip():
        qs = qs.filter(coupon__code__iexact=coupon_code.strip())

    if state and state.strip().upper() in CouponRedemption.State.values:
        qs = qs.filter(state=state.strip().upper())

    if payment_status and payment_status.strip().upper() in Order.PaymentStatus.values:
        qs = qs.filter(order__payment_status=payment_status.strip().upper())

    if order_status and order_status.strip().upper() in Order.Status.values:
        qs = qs.filter(order__status=order_status.strip().upper())

    if start_date:
        qs = qs.filter(created_at__gte=start_date)
    if end_date:
        qs = qs.filter(created_at__lte=end_date)

    if search and search.strip():
        term = search.strip()
        qs = qs.filter(
            Q(order__order_number__icontains=term)
            | Q(coupon__code__icontains=term)
            | Q(customer__email__icontains=term)
            | Q(customer__profile__display_name__icontains=term)
            | Q(idempotency_key__icontains=term)
        )

    ALLOWED_SORTING = {
        "-created_at": "-created_at",
        "created_at": "created_at",
        "-finalized_at": "-finalized_at",
        "finalized_at": "finalized_at",
        "-discount_amount": "-discount_amount",
        "discount_amount": "discount_amount",
    }
    sort_field = ALLOWED_SORTING.get(ordering or "", "-created_at")
    return qs.order_by(sort_field, "id")
