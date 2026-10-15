"""
Administrative Dashboard Analytics & Overview Services.

Provides aggregated KPIs, time series, recent orders, inventory alerts,
and top product analytics for the Closet by Chilli admin console.

Status Accounting Rules:
- Gross Revenue & AOV: Strictly orders with payment_status='PAID' and status!='CANCELLED'.
- Pending, failed, or cancelled orders are never counted towards revenue.
- Low stock: InventoryItem quantity_available <= threshold (default 5).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.models import InventoryItem
from apps.orders.models import Order, OrderItem


VALID_PERIODS = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "all": None,
}


def _compute_change_pct(
    current: Decimal | int | float,
    previous: Optional[Decimal | int | float],
) -> Optional[float]:
    """
    Computes percentage delta between current and previous periods.
    Returns None if previous period has zero or invalid baseline,
    enforcing that percentages are only displayed when mathematically valid.
    """
    if previous is None:
        return None
    prev_dec = Decimal(str(previous))
    curr_dec = Decimal(str(current))
    if prev_dec <= Decimal("0.00"):
        return None
    delta = ((curr_dec - prev_dec) / prev_dec) * Decimal("100")
    return float(round(delta, 1))


def get_admin_dashboard_overview(
    period: str = "30d",
    low_stock_threshold: int | str = 5,
) -> Dict[str, Any]:
    """
    Computes aggregated overview metrics for the admin console.
    """
    if period not in VALID_PERIODS:
        raise ValidationError(
            {"period": f"Invalid period '{period}'. Valid choices are: {', '.join(VALID_PERIODS.keys())}."}
        )

    try:
        threshold = int(low_stock_threshold)
        if threshold < 0:
            raise ValueError
    except (ValueError, TypeError):
        raise ValidationError({"low_stock_threshold": "Threshold must be a non-negative integer."})

    now = timezone.now()
    days = VALID_PERIODS[period]

    current_start: Optional[datetime] = None
    previous_start: Optional[datetime] = None
    previous_end: Optional[datetime] = None

    if days is not None:
        start = now - timedelta(days=days)
        current_start = start
        previous_start = start - timedelta(days=days)
        previous_end = start


    # Base order queryset for current window
    orders_qs = Order.objects.all()
    if current_start:
        orders_qs = orders_qs.filter(created_at__gte=current_start, created_at__lte=now)

    # Status counts for current period
    status_counts = {choice[0]: 0 for choice in Order.Status.choices}
    for row in orders_qs.values("status").annotate(count=Count("id")):
        status_counts[row["status"]] = row["count"]

    payment_status_counts = {choice[0]: 0 for choice in Order.PaymentStatus.choices}
    for row in orders_qs.values("payment_status").annotate(count=Count("id")):
        payment_status_counts[row["payment_status"]] = row["count"]

    total_orders = orders_qs.count()

    # Revenue accounting: strictly PAID orders that are NOT CANCELLED
    paid_orders_qs = orders_qs.filter(
        payment_status=Order.PaymentStatus.PAID
    ).exclude(status=Order.Status.CANCELLED)

    gross_revenue = paid_orders_qs.aggregate(total=Sum("total"))["total"] or Decimal("0.00")
    paid_orders_count = paid_orders_qs.count()

    # Average Order Value rule: gross_revenue / paid_orders_count
    if paid_orders_count > 0:
        aov = (gross_revenue / Decimal(paid_orders_count)).quantize(Decimal("0.01"))
    else:
        aov = Decimal("0.00")

    # Historical comparison window (if period has a defined duration)
    prev_total_orders: Optional[int] = None
    prev_gross_revenue: Optional[Decimal] = None
    prev_aov: Optional[Decimal] = None

    if previous_start and previous_end:
        prev_orders_qs = Order.objects.filter(
            created_at__gte=previous_start,
            created_at__lt=previous_end,
        )
        prev_total_orders = prev_orders_qs.count()

        prev_paid_qs = prev_orders_qs.filter(
            payment_status=Order.PaymentStatus.PAID
        ).exclude(status=Order.Status.CANCELLED)

        prev_gross_revenue = prev_paid_qs.aggregate(total=Sum("total"))["total"] or Decimal("0.00")
        prev_paid_count = prev_paid_qs.count()
        if prev_paid_count > 0:
            prev_aov = (prev_gross_revenue / Decimal(prev_paid_count)).quantize(Decimal("0.01"))
        else:
            prev_aov = Decimal("0.00")

    total_orders_change = _compute_change_pct(total_orders, prev_total_orders)
    revenue_change = _compute_change_pct(gross_revenue, prev_gross_revenue)
    aov_change = _compute_change_pct(aov, prev_aov)

    # Low-stock calculation: live inventory ledger snapshot
    low_stock_qs = InventoryItem.objects.filter(
        quantity_available__lte=threshold
    ).select_related("variant__product")
    low_stock_count = low_stock_qs.count()

    # Sales Overview: Time series aggregation (daily)
    # Group paid non-cancelled orders by date
    daily_aggregates = (
        paid_orders_qs.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(
            daily_revenue=Sum("total"),
            daily_orders=Count("id"),
        )
        .order_by("day")
    )
    agg_map = {
        row["day"].isoformat(): {
            "date": row["day"].isoformat(),
            "orders_count": row["daily_orders"],
            "revenue": str(row["daily_revenue"] or Decimal("0.00")),
        }
        for row in daily_aggregates
        if row["day"]
    }

    sales_overview: List[Dict[str, Any]] = []
    if days is not None and days <= 90:
        # Populate full daily continuity
        curr = current_start.date() if current_start else now.date()
        end_date = now.date()
        while curr <= end_date:
            d_str = curr.isoformat()
            if d_str in agg_map:
                sales_overview.append(agg_map[d_str])
            else:
                sales_overview.append({
                    "date": d_str,
                    "orders_count": 0,
                    "revenue": "0.00",
                })
            curr += timedelta(days=1)
    else:
        # For 'all', sort whatever dates have records
        sales_overview = sorted(agg_map.values(), key=lambda x: x["date"])

    # Recent Orders: Latest 10 orders with item count annotation
    recent_orders_qs = (
        Order.objects.select_related("user")
        .annotate(annotated_items_count=Count("items", distinct=True))
        .order_by("-created_at")[:10]
    )

    recent_orders: List[Dict[str, Any]] = []
    for ord_obj in recent_orders_qs:
        recent_orders.append({
            "id": str(ord_obj.id),
            "order_number": ord_obj.order_number,
            "created_at": ord_obj.created_at.isoformat(),
            "customer_email": ord_obj.user.email if ord_obj.user else "Anonymous",
            "total": str(ord_obj.total),
            "currency": ord_obj.currency,
            "status": ord_obj.status,
            "payment_status": ord_obj.payment_status,
            "items_count": ord_obj.annotated_items_count,
        })

    # Low-Stock Alerts list: Up to 10 variants
    low_stock_alerts: List[Dict[str, Any]] = []
    for item in low_stock_qs.order_by("quantity_available", "variant__sku")[:10]:
        variant = item.variant
        product = getattr(variant, "product", None)
        variant_labels = [p for p in [variant.size, variant.color] if p]
        low_stock_alerts.append({
            "id": str(item.id),
            "variant_id": str(variant.id),
            "sku": variant.sku,
            "product_name": product.name if product else "Unknown Product",
            "variant_label": " / ".join(variant_labels) if variant_labels else "Standard",
            "quantity_available": item.quantity_available,
            "quantity_reserved": item.quantity_reserved,
        })

    # Top-Selling Products: aggregate order items for paid orders in current period
    top_items_qs = (
        OrderItem.objects.filter(order__in=paid_orders_qs)
        .values("product_id", "product_name")
        .annotate(
            units_sold=Sum("quantity"),
            revenue=Sum("line_total"),
        )
        .order_by("-units_sold", "-revenue")[:5]
    )

    top_selling_products: List[Dict[str, Any]] = [
        {
            "product_id": str(row["product_id"]) if row["product_id"] else None,
            "product_name": row["product_name"],
            "units_sold": row["units_sold"] or 0,
            "revenue": str(row["revenue"] or Decimal("0.00")),
        }
        for row in top_items_qs
    ]

    return {
        "period": period,
        "date_range": {
            "start": current_start.isoformat() if current_start else None,
            "end": now.isoformat(),
        },
        "metrics": {
            "total_orders": {
                "value": total_orders,
                "previous_value": prev_total_orders,
                "change_percentage": total_orders_change,
                "status_breakdown": status_counts,
                "payment_status_breakdown": payment_status_counts,
            },
            "gross_revenue": {
                "value": str(gross_revenue),
                "currency": "INR",
                "previous_value": str(prev_gross_revenue) if prev_gross_revenue is not None else None,
                "change_percentage": revenue_change,
                "paid_orders_count": paid_orders_count,
                "definition": "Monetary sum of orders where payment_status = PAID and status != CANCELLED.",
            },
            "average_order_value": {
                "value": str(aov),
                "currency": "INR",
                "previous_value": str(prev_aov) if prev_aov is not None else None,
                "change_percentage": aov_change,
                "definition": "Gross revenue divided by count of paid, non-cancelled orders.",
            },
            "low_stock_variants": {
                "count": low_stock_count,
                "threshold": threshold,
                "definition": f"Count of product variants with quantity_available <= {threshold}.",
            },
        },
        "sales_overview": sales_overview,
        "recent_orders": recent_orders,
        "low_stock_alerts": low_stock_alerts,
        "top_selling_products": top_selling_products,
    }
