"""
Closet by Chilli — Admin Analytics & Business Intelligence Service.

Complies with Sprint A7 requirements, 04-backend-architecture.md, and 18-admin-operations.md.
Provides robust database-side aggregations for:
- Executive KPI summary cards with mathematically sound period deltas.
- Revenue analytics & time-series with automatic/selectable bucket aggregation.
- Order analytics & fulfillment/payment status breakdowns.
- Product performance (top sellers by revenue & units, plus slow-moving stock).
- Category performance & percentage contribution to overall revenue.
- Customer analytics (patron growth, new vs returning customer volume).

Status & Revenue Accounting Rules:
- Gross Sales: Sum of catalog merchandise subtotal for paid, non-cancelled orders.
- Net Revenue: Realized revenue (Order.total) for PAID orders, excluding CANCELLED and REFUNDED orders.
- Average Order Value (AOV): Net Revenue divided by count of paid, non-cancelled orders.
- Pending or failed payments are NEVER counted towards realized revenue.
- Zero / empty datasets are safely handled with 0 / 0.00 fallbacks.
"""

from __future__ import annotations

import calendar
from datetime import datetime, time, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from django.core.cache import cache
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils import dateparse, timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.catalog.models import Category, Product
from apps.inventory.models import InventoryItem
from apps.orders.models import Order, OrderItem

VALID_PERIOD_PRESETS = {
    "today",
    "7d",
    "30d",
    "90d",
    "this_month",
    "last_month",
    "custom",
}


def _compute_delta_pct(
    current: Decimal | int | float,
    previous: Optional[Decimal | int | float],
) -> Optional[float]:
    """
    Computes percentage delta between current and previous periods.
    Returns None if previous baseline is zero, negative, or None,
    ensuring comparisons are only displayed when mathematically valid.
    """
    if previous is None:
        return None
    prev_dec = Decimal(str(previous))
    curr_dec = Decimal(str(current))
    if prev_dec <= Decimal("0.00"):
        return None
    delta = ((curr_dec - prev_dec) / prev_dec) * Decimal("100")
    return float(round(delta, 1))


def resolve_analytics_date_range(
    period: str = "30d",
    start_date_param: Optional[str] = None,
    end_date_param: Optional[str] = None,
) -> Tuple[datetime, datetime, datetime, datetime, str]:
    """
    Resolves date boundaries for the current and previous comparative periods.
    Returns: (current_start, current_end, previous_start, previous_end, period_label).
    All datetimes are timezone-aware.
    """
    tz = timezone.get_current_timezone()
    now = timezone.now()

    if period not in VALID_PERIOD_PRESETS:
        raise ValidationError(
            {"period": f"Invalid period '{period}'. Valid options are: {', '.join(sorted(VALID_PERIOD_PRESETS))}."}
        )

    if period == "today":
        today_date = now.astimezone(tz).date()
        current_start = timezone.make_aware(datetime.combine(today_date, time.min), tz)
        current_end = now
        delta = current_end - current_start
        yesterday_date = today_date - timedelta(days=1)
        previous_start = timezone.make_aware(datetime.combine(yesterday_date, time.min), tz)
        previous_end = previous_start + delta
        period_label = "Today"

    elif period == "7d":
        current_start = now - timedelta(days=7)
        current_end = now
        previous_start = current_start - timedelta(days=7)
        previous_end = current_start
        period_label = "Last 7 Days"

    elif period == "30d":
        current_start = now - timedelta(days=30)
        current_end = now
        previous_start = current_start - timedelta(days=30)
        previous_end = current_start
        period_label = "Last 30 Days"

    elif period == "90d":
        current_start = now - timedelta(days=90)
        current_end = now
        previous_start = current_start - timedelta(days=90)
        previous_end = current_start
        period_label = "Last 90 Days"

    elif period == "this_month":
        local_now = now.astimezone(tz)
        first_of_month = local_now.date().replace(day=1)
        current_start = timezone.make_aware(datetime.combine(first_of_month, time.min), tz)
        current_end = now
        delta = current_end - current_start

        # Previous month
        if first_of_month.month == 1:
            prev_month_first = first_of_month.replace(year=first_of_month.year - 1, month=12)
        else:
            prev_month_first = first_of_month.replace(month=first_of_month.month - 1)
        previous_start = timezone.make_aware(datetime.combine(prev_month_first, time.min), tz)
        previous_end = previous_start + delta
        period_label = "This Month"

    elif period == "last_month":
        local_now = now.astimezone(tz)
        first_of_cur = local_now.date().replace(day=1)
        if first_of_cur.month == 1:
            first_of_last = first_of_cur.replace(year=first_of_cur.year - 1, month=12)
        else:
            first_of_last = first_of_cur.replace(month=first_of_cur.month - 1)
        _, last_day = calendar.monthrange(first_of_last.year, first_of_last.month)
        end_of_last = first_of_last.replace(day=last_day)

        current_start = timezone.make_aware(datetime.combine(first_of_last, time.min), tz)
        current_end = timezone.make_aware(datetime.combine(end_of_last, time.max), tz)

        # Two months ago
        if first_of_last.month == 1:
            first_of_prev = first_of_last.replace(year=first_of_last.year - 1, month=12)
        else:
            first_of_prev = first_of_last.replace(month=first_of_last.month - 1)
        _, last_day_prev = calendar.monthrange(first_of_prev.year, first_of_prev.month)
        end_of_prev = first_of_prev.replace(day=last_day_prev)

        previous_start = timezone.make_aware(datetime.combine(first_of_prev, time.min), tz)
        previous_end = timezone.make_aware(datetime.combine(end_of_prev, time.max), tz)
        period_label = "Previous Month"

    elif period == "custom":
        if not start_date_param or not end_date_param:
            raise ValidationError({"custom": "Both start_date and end_date are required for custom period."})

        def _parse(val: str, is_end: bool) -> datetime:
            cleaned = val.strip()
            if "T" not in cleaned and " " not in cleaned:
                d = dateparse.parse_date(cleaned)
                if not d:
                    raise ValidationError({"date": f"Invalid date format '{val}'. Expected YYYY-MM-DD."})
                t = time.max if is_end else time.min
                return timezone.make_aware(datetime.combine(d, t), tz)
            dt = dateparse.parse_datetime(cleaned)
            if not dt:
                raise ValidationError({"date": f"Invalid datetime format '{val}'. Expected ISO 8601."})
            if timezone.is_naive(dt):
                return timezone.make_aware(dt, tz)
            return dt

        current_start = _parse(start_date_param, is_end=False)
        current_end = _parse(end_date_param, is_end=True)

        if current_start > current_end:
            raise ValidationError({"start_date": "start_date cannot be later than end_date."})

        duration = current_end - current_start
        previous_start = current_start - duration
        previous_end = current_start
        period_label = f"{current_start.strftime('%d %b %Y')} – {current_end.strftime('%d %b %Y')}"

    return current_start, current_end, previous_start, previous_end, period_label


def get_admin_analytics_data(
    period: str = "30d",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    granularity: str = "auto",
    use_cache: bool = True,
) -> Dict[str, Any]:
    """
    Produces complete, aggregated analytics data for the admin console.
    Employs short-lived server-side caching (60s) keyed by date bounds.
    """
    current_start, current_end, previous_start, previous_end, period_label = resolve_analytics_date_range(
        period=period,
        start_date_param=start_date,
        end_date_param=end_date,
    )

    cache_key = (
        f"admin_analytics:{period}:{int(current_start.timestamp())}:{int(current_end.timestamp())}:{granularity}"
    )

    if use_cache:
        cached_payload = cache.get(cache_key)
        if cached_payload is not None:
            return cached_payload

    # -------------------------------------------------------------------------
    # 1. Base QuerySets
    # -------------------------------------------------------------------------
    orders_qs = Order.objects.filter(created_at__gte=current_start, created_at__lte=current_end)
    prev_orders_qs = Order.objects.filter(created_at__gte=previous_start, created_at__lt=previous_end)

    # Paid, non-cancelled orders
    paid_orders_qs = orders_qs.filter(
        payment_status=Order.PaymentStatus.PAID
    ).exclude(status=Order.Status.CANCELLED)

    prev_paid_orders_qs = prev_orders_qs.filter(
        payment_status=Order.PaymentStatus.PAID
    ).exclude(status=Order.Status.CANCELLED)

    # Realized revenue orders (Paid and neither Cancelled nor Refunded)
    realized_orders_qs = paid_orders_qs.exclude(payment_status=Order.PaymentStatus.REFUNDED)
    prev_realized_orders_qs = prev_paid_orders_qs.exclude(payment_status=Order.PaymentStatus.REFUNDED)

    # -------------------------------------------------------------------------
    # 2. KPI Summary Cards Calculations
    # -------------------------------------------------------------------------
    # Gross Sales: Catalog subtotal of paid non-cancelled orders
    raw_gross = paid_orders_qs.aggregate(total=Sum("subtotal"))["total"]
    gross_sales = Decimal(str(raw_gross)).quantize(Decimal("0.01")) if raw_gross is not None else Decimal("0.00")

    raw_prev_gross = prev_paid_orders_qs.aggregate(total=Sum("subtotal"))["total"]
    prev_gross_sales = (
        Decimal(str(raw_prev_gross)).quantize(Decimal("0.01")) if raw_prev_gross is not None else Decimal("0.00")
    )

    # Net Revenue: Realized total paid by customers (Order.total) excluding refunds/cancellations
    raw_net = realized_orders_qs.aggregate(total=Sum("total"))["total"]
    net_revenue = Decimal(str(raw_net)).quantize(Decimal("0.01")) if raw_net is not None else Decimal("0.00")

    raw_prev_net = prev_realized_orders_qs.aggregate(total=Sum("total"))["total"]
    prev_net_revenue = (
        Decimal(str(raw_prev_net)).quantize(Decimal("0.01")) if raw_prev_net is not None else Decimal("0.00")
    )

    # Total Orders
    total_orders = orders_qs.count()
    prev_total_orders = prev_orders_qs.count()

    # Paid orders count (qualifying successful orders)
    paid_orders_count = paid_orders_qs.count()
    prev_paid_orders_count = prev_paid_orders_qs.count()

    # Average Order Value (AOV): Net Revenue / Paid Orders Count
    if paid_orders_count > 0:
        aov = (net_revenue / Decimal(paid_orders_count)).quantize(Decimal("0.01"))
    else:
        aov = Decimal("0.00")

    if prev_paid_orders_count > 0:
        prev_aov = (prev_net_revenue / Decimal(prev_paid_orders_count)).quantize(Decimal("0.01"))
    else:
        prev_aov = Decimal("0.00")

    # Units Sold: Consistent Gross vs Net semantics
    # Net Units: Physical units in retained, qualifying paid orders (excludes cancelled & refunded)
    raw_net_units = OrderItem.objects.filter(order__in=paid_orders_qs).aggregate(qty=Sum("quantity"))["qty"]
    net_units_sold = int(raw_net_units or 0)

    # Refunded Units: Physical units in fully refunded orders
    refunded_qs = orders_qs.filter(payment_status=Order.PaymentStatus.REFUNDED)
    raw_refunded_units = OrderItem.objects.filter(order__in=refunded_qs).aggregate(qty=Sum("quantity"))["qty"]
    refunded_units = int(raw_refunded_units or 0)

    # Gross Units Sold: Total physical units initially purchased (Net + Refunded)
    gross_units_sold = net_units_sold + refunded_units

    # Previous period units
    prev_refunded_qs = prev_orders_qs.filter(payment_status=Order.PaymentStatus.REFUNDED)
    raw_prev_net_units = OrderItem.objects.filter(order__in=prev_paid_orders_qs).aggregate(qty=Sum("quantity"))["qty"]
    prev_net_units_sold = int(raw_prev_net_units or 0)
    raw_prev_ref_units = OrderItem.objects.filter(order__in=prev_refunded_qs).aggregate(qty=Sum("quantity"))["qty"]
    prev_refunded_units = int(raw_prev_ref_units or 0)
    prev_gross_units_sold = prev_net_units_sold + prev_refunded_units

    # New Registered Customers in current vs previous period
    new_customers_count = User.objects.filter(
        role=User.Role.CUSTOMER,
        created_at__gte=current_start,
        created_at__lte=current_end,
    ).count()

    prev_new_customers_count = User.objects.filter(
        role=User.Role.CUSTOMER,
        created_at__gte=previous_start,
        created_at__lt=previous_end,
    ).count()

    total_customers_count = User.objects.filter(role=User.Role.CUSTOMER).count()

    kpi_summary = {
        "gross_sales": {
            "value": str(gross_sales),
            "currency": "INR",
            "previous_value": str(prev_gross_sales),
            "change_percentage": _compute_delta_pct(gross_sales, prev_gross_sales),
            "definition": "Monetary sum of catalog subtotal across paid, non-cancelled orders before discounts.",
        },
        "net_revenue": {
            "value": str(net_revenue),
            "currency": "INR",
            "previous_value": str(prev_net_revenue),
            "change_percentage": _compute_delta_pct(net_revenue, prev_net_revenue),
            "definition": "Realized revenue collected from customers for successful sales (excluding cancelled & refunded orders).",
        },
        "total_orders": {
            "value": total_orders,
            "previous_value": prev_total_orders,
            "change_percentage": _compute_delta_pct(total_orders, prev_total_orders),
            "paid_orders_count": paid_orders_count,
            "definition": "Total count of order records created within the selected timeframe.",
        },
        "average_order_value": {
            "value": str(aov),
            "currency": "INR",
            "previous_value": str(prev_aov),
            "change_percentage": _compute_delta_pct(aov, prev_aov),
            "definition": "Net revenue divided by count of paid, non-cancelled orders.",
        },
        "units_sold": {
            "value": net_units_sold,
            "gross_units": gross_units_sold,
            "refunded_units": refunded_units,
            "previous_value": prev_net_units_sold,
            "change_percentage": _compute_delta_pct(net_units_sold, prev_net_units_sold),
            "definition": (
                "Net physical units sold in confirmed paid orders, excluding cancelled and fully refunded orders "
                f"(Gross: {gross_units_sold}, Refunded: {refunded_units})."
            ),
        },
        "new_customers": {
            "value": new_customers_count,
            "previous_value": prev_new_customers_count,
            "change_percentage": _compute_delta_pct(new_customers_count, prev_new_customers_count),
            "total_registered_customers": total_customers_count,
            "definition": "Count of new customer accounts registered within the period.",
        },
    }

    # -------------------------------------------------------------------------
    # 3. Revenue & Order Volume Time Series
    # -------------------------------------------------------------------------
    duration_days = (current_end.date() - current_start.date()).days

    # Determine granularity
    if granularity in {"day", "week", "month"}:
        active_granularity = granularity
    else:
        if duration_days <= 90:
            active_granularity = "day"
        elif duration_days <= 180:
            active_granularity = "week"
        else:
            active_granularity = "month"

    if active_granularity == "week":
        trunc_fn = TruncWeek("created_at")
    elif active_granularity == "month":
        trunc_fn = TruncMonth("created_at")
    else:
        trunc_fn = TruncDate("created_at")

    series_qs = (
        paid_orders_qs.annotate(bucket=trunc_fn)
        .values("bucket")
        .annotate(
            revenue=Sum("total"),
            gross_sales=Sum("subtotal"),
            orders_count=Count("id"),
        )
        .order_by("bucket")
    )

    series_map = {
        (row["bucket"].date() if hasattr(row["bucket"], "date") else row["bucket"]): {
            "date": (row["bucket"].date() if hasattr(row["bucket"], "date") else row["bucket"]).isoformat(),
            "revenue": str(Decimal(str(row["revenue"] or "0.00")).quantize(Decimal("0.01"))),
            "gross_sales": str(Decimal(str(row["gross_sales"] or "0.00")).quantize(Decimal("0.01"))),
            "orders_count": row["orders_count"],
        }
        for row in series_qs
        if row["bucket"]
    }

    # Populate continuous buckets if day granularity
    revenue_time_series: List[Dict[str, Any]] = []
    if active_granularity == "day" and duration_days <= 90:
        cursor = current_start.date()
        end_cursor = current_end.date()
        while cursor <= end_cursor:
            if cursor in series_map:
                revenue_time_series.append(series_map[cursor])
            else:
                revenue_time_series.append({
                    "date": cursor.isoformat(),
                    "revenue": "0.00",
                    "gross_sales": "0.00",
                    "orders_count": 0,
                })
            cursor += timedelta(days=1)
    else:
        revenue_time_series = sorted(series_map.values(), key=lambda x: x["date"])

    # -------------------------------------------------------------------------
    # 4. Order Analytics & Status Breakdowns
    # -------------------------------------------------------------------------
    order_status_counts = {choice[0]: 0 for choice in Order.Status.choices}
    for row in orders_qs.values("status").annotate(count=Count("id")):
        order_status_counts[row["status"]] = row["count"]

    payment_status_counts = {choice[0]: 0 for choice in Order.PaymentStatus.choices}
    payment_status_totals = {choice[0]: "0.00" for choice in Order.PaymentStatus.choices}
    for row in orders_qs.values("payment_status").annotate(count=Count("id"), total=Sum("total")):
        payment_status_counts[row["payment_status"]] = row["count"]
        val = row["total"] or Decimal("0.00")
        payment_status_totals[row["payment_status"]] = str(Decimal(str(val)).quantize(Decimal("0.01")))

    # Specific segments: Cancelled & Refunded
    cancelled_qs = orders_qs.filter(status=Order.Status.CANCELLED)
    cancelled_count = cancelled_qs.count()
    raw_cancelled_total = cancelled_qs.aggregate(total=Sum("total"))["total"]
    cancelled_amount = str(Decimal(str(raw_cancelled_total or "0.00")).quantize(Decimal("0.01")))

    refunded_qs = orders_qs.filter(payment_status=Order.PaymentStatus.REFUNDED)
    refunded_count = refunded_qs.count()
    raw_refunded_total = refunded_qs.aggregate(total=Sum("total"))["total"]
    refunded_amount = str(Decimal(str(raw_refunded_total or "0.00")).quantize(Decimal("0.01")))

    unpaid_count = orders_qs.filter(
        payment_status__in=[Order.PaymentStatus.PENDING, Order.PaymentStatus.FAILED]
    ).exclude(status=Order.Status.CANCELLED).count()

    order_analytics = {
        "total_orders": total_orders,
        "paid_orders": paid_orders_count,
        "unpaid_orders": unpaid_count,
        "cancelled_orders": {
            "count": cancelled_count,
            "total_value": cancelled_amount,
            "rate_pct": float(round((cancelled_count / total_orders * 100), 1)) if total_orders > 0 else 0.0,
        },
        "refunded_orders": {
            "count": refunded_count,
            "total_value": refunded_amount,
            "refunded_units": refunded_units,
            "rate_pct": float(round((refunded_count / total_orders * 100), 1)) if total_orders > 0 else 0.0,
        },
        "refund_capabilities": {
            "partial_refunds_supported": False,
            "note": "Partial refunds are not supported by the current data model. All refunds represent full order reversals.",
        },
        "status_breakdown": order_status_counts,
        "payment_status_breakdown": payment_status_counts,
        "payment_amount_breakdown": payment_status_totals,
    }

    # -------------------------------------------------------------------------
    # 5. Product Performance
    # -------------------------------------------------------------------------
    # Products ranked by revenue
    top_revenue_qs = (
        OrderItem.objects.filter(order__in=paid_orders_qs)
        .values("product_id", "product_name")
        .annotate(
            units_sold=Sum("quantity"),
            revenue=Sum("line_total"),
            orders_count=Count("order_id", distinct=True),
        )
        .order_by("-revenue")[:10]
    )

    top_products_by_revenue: List[Dict[str, Any]] = [
        {
            "product_id": str(r["product_id"]) if r["product_id"] else None,
            "product_name": r["product_name"],
            "units_sold": r["units_sold"] or 0,
            "revenue": str(Decimal(str(r["revenue"] or "0.00")).quantize(Decimal("0.01"))),
            "orders_count": r["orders_count"],
        }
        for r in top_revenue_qs
    ]

    # Products ranked by units sold
    top_units_qs = (
        OrderItem.objects.filter(order__in=paid_orders_qs)
        .values("product_id", "product_name")
        .annotate(
            units_sold=Sum("quantity"),
            revenue=Sum("line_total"),
            orders_count=Count("order_id", distinct=True),
        )
        .order_by("-units_sold")[:10]
    )

    top_products_by_units: List[Dict[str, Any]] = [
        {
            "product_id": str(r["product_id"]) if r["product_id"] else None,
            "product_name": r["product_name"],
            "units_sold": r["units_sold"] or 0,
            "revenue": str(Decimal(str(r["revenue"] or "0.00")).quantize(Decimal("0.01"))),
            "orders_count": r["orders_count"],
        }
        for r in top_units_qs
    ]

    # Slow-Moving Products:
    # Active products with least units sold (or 0) during this period, with current stock
    # Query active products, annotating units sold in the period
    active_products = (
        Product.objects.filter(is_active=True, status="active")
        .annotate(
            period_units=Sum(
                "order_items__quantity",
                filter=Q(order_items__order__in=paid_orders_qs),
            ),
            period_revenue=Sum(
                "order_items__line_total",
                filter=Q(order_items__order__in=paid_orders_qs),
            ),
            available_stock=Sum("variants__inventory__quantity_available"),
        )
        .order_by("period_units", "-available_stock", "name")[:10]
    )

    slow_moving_products: List[Dict[str, Any]] = []
    for prod in active_products:
        sold = prod.period_units or 0
        stock = prod.available_stock or 0
        rev = Decimal(str(prod.period_revenue or "0.00")).quantize(Decimal("0.01"))
        slow_moving_products.append({
            "product_id": str(prod.id),
            "product_name": prod.name,
            "units_sold": sold,
            "revenue": str(rev),
            "available_stock": stock,
        })

    product_performance = {
        "top_by_revenue": top_products_by_revenue,
        "top_by_units": top_products_by_units,
        "slow_moving": slow_moving_products,
    }

    # -------------------------------------------------------------------------
    # 6. Category Performance
    # -------------------------------------------------------------------------
    category_perf_qs = (
        OrderItem.objects.filter(order__in=paid_orders_qs)
        .values(
            cat_id=F("product__category__id"),
            cat_name=F("product__category__name"),
            cat_slug=F("product__category__slug"),
        )
        .annotate(
            revenue=Sum("line_total"),
            units_sold=Sum("quantity"),
            orders_count=Count("order_id", distinct=True),
        )
        .order_by("-revenue")
    )

    total_cat_revenue = Decimal("0.00")
    cat_items = []
    for row in category_perf_qs:
        rev = Decimal(str(row["revenue"] or "0.00")).quantize(Decimal("0.01"))
        total_cat_revenue += rev
        cat_items.append({
            "category_id": str(row["cat_id"]) if row["cat_id"] else None,
            "category_name": row["cat_name"] or "Uncategorized",
            "category_slug": row["cat_slug"] or "uncategorized",
            "revenue": str(rev),
            "units_sold": row["units_sold"] or 0,
            "orders_count": row["orders_count"],
            "raw_revenue": rev,
        })

    category_performance: List[Dict[str, Any]] = []
    for item in cat_items:
        if total_cat_revenue > Decimal("0.00"):
            contribution_pct = float(round((item["raw_revenue"] / total_cat_revenue) * Decimal("100"), 1))
        else:
            contribution_pct = 0.0
        category_performance.append({
            "category_id": item["category_id"],
            "category_name": item["category_name"],
            "category_slug": item["category_slug"],
            "revenue": item["revenue"],
            "units_sold": item["units_sold"],
            "orders_count": item["orders_count"],
            "contribution_percentage": contribution_pct,
        })

    # -------------------------------------------------------------------------
    # 7. Customer Analytics
    # -------------------------------------------------------------------------
    # New customers trend over time
    new_cust_trend_qs = (
        User.objects.filter(
            role=User.Role.CUSTOMER,
            created_at__gte=current_start,
            created_at__lte=current_end,
        )
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )

    customer_growth_trend = [
        {"date": row["day"].isoformat(), "count": row["count"]}
        for row in new_cust_trend_qs
        if row["day"]
    ]

    # Returning vs First-Time Ordering Customers
    # Registered users who placed paid orders in current period
    current_ordering_users = set(
        paid_orders_qs.filter(user__isnull=False).values_list("user_id", flat=True).distinct()
    )

    if current_ordering_users:
        # Check which of these users placed an order PRIOR to current_start
        prior_ordering_users = set(
            Order.objects.filter(
                user_id__in=current_ordering_users,
                created_at__lt=current_start,
                payment_status=Order.PaymentStatus.PAID,
            )
            .exclude(status=Order.Status.CANCELLED)
            .values_list("user_id", flat=True)
            .distinct()
        )
        returning_customers_count = len(prior_ordering_users)
        first_time_customers_count = len(current_ordering_users) - returning_customers_count
    else:
        returning_customers_count = 0
        first_time_customers_count = 0

    total_unique_buyers = returning_customers_count + first_time_customers_count
    returning_pct = (
        float(round((returning_customers_count / total_unique_buyers * 100), 1))
        if total_unique_buyers > 0
        else 0.0
    )
    first_time_pct = (
        float(round((first_time_customers_count / total_unique_buyers * 100), 1))
        if total_unique_buyers > 0
        else 0.0
    )

    customer_analytics = {
        "total_registered_customers": total_customers_count,
        "new_registered_customers": new_customers_count,
        "customer_growth_trend": customer_growth_trend,
        "ordering_behavior": {
            "total_unique_buyers": total_unique_buyers,
            "returning_buyers_count": returning_customers_count,
            "returning_buyers_percentage": returning_pct,
            "first_time_buyers_count": first_time_customers_count,
            "first_time_buyers_percentage": first_time_pct,
        },
    }

    # -------------------------------------------------------------------------
    # 8. Full Response Assembly
    # -------------------------------------------------------------------------
    payload: Dict[str, Any] = {
        "period": period,
        "period_label": period_label,
        "granularity": active_granularity,
        "date_range": {
            "current_start": current_start.isoformat(),
            "current_end": current_end.isoformat(),
            "previous_start": previous_start.isoformat(),
            "previous_end": previous_end.isoformat(),
        },
        "kpi_summary": kpi_summary,
        "revenue_time_series": revenue_time_series,
        "order_analytics": order_analytics,
        "product_performance": product_performance,
        "category_performance": category_performance,
        "customer_analytics": customer_analytics,
    }

    if use_cache:
        # Cache for 60 seconds
        cache.set(cache_key, payload, timeout=60)

    return payload

