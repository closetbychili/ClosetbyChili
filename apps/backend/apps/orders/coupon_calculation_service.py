"""
Closet by Chilli — Coupon Discount Calculation Service.

Complies with 04-backend-architecture.md, 06-domain-model.md, and Sprint A5.4.
Provides pure, authoritative calculations for coupon discounts on carts and orders.

Enforces:
- Percentage discounts with max_discount_amount caps.
- Fixed amount discounts.
- Catalog targeting filtering (discount applies to qualifying items).
- Accurate Decimal quantizing to 2 decimal places (0.01).
- Non-negative bounds: discount cannot exceed qualifying subtotal or total subtotal.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Iterable

from apps.orders.coupon_targeting_service import product_matches_coupon_target
from apps.orders.models import Coupon


def get_coupon_discount_description(coupon: Coupon) -> str:
    """Returns a customer-friendly description of the discount."""
    if not coupon:
        return ""
    if coupon.discount_type == Coupon.DiscountType.PERCENTAGE:
        val = int(coupon.discount_value) if coupon.discount_value == int(coupon.discount_value) else coupon.discount_value
        desc = f"{val}% off"
        if coupon.max_discount_amount:
            cap = int(coupon.max_discount_amount) if coupon.max_discount_amount == int(coupon.max_discount_amount) else coupon.max_discount_amount
            desc += f" up to ₹{cap}"
        if coupon.targeting_mode != Coupon.TargetingMode.ALL_PRODUCTS:
            desc += " on eligible items"
        return desc
    elif coupon.discount_type == Coupon.DiscountType.FIXED_AMOUNT:
        val = int(coupon.discount_value) if coupon.discount_value == int(coupon.discount_value) else coupon.discount_value
        desc = f"₹{val} off"
        if coupon.targeting_mode != Coupon.TargetingMode.ALL_PRODUCTS:
            desc += " on eligible items"
        return desc
    return ""


def calculate_coupon_discount(
    coupon: Coupon,
    items: Iterable[Any],
    subtotal: Decimal,
) -> Decimal:
    """
    Calculates the authoritative discount amount in INR for a given coupon,
    collection of items, and order/cart subtotal.
    """
    if not coupon or not coupon.is_active or subtotal <= Decimal("0.00"):
        return Decimal("0.00")

    items_list = list(items) if items is not None else []

    # If coupon has targeting rules, determine qualifying items & qualifying subtotal
    if coupon.targeting_mode == Coupon.TargetingMode.ALL_PRODUCTS:
        qualifying_subtotal = subtotal
    else:
        qualifying_subtotal = Decimal("0.00")
        for item in items_list:
            if product_matches_coupon_target(coupon, item):
                if hasattr(item, "line_total"):
                    qualifying_subtotal += Decimal(str(item.line_total))
                elif isinstance(item, dict) and "line_total" in item:
                    qualifying_subtotal += Decimal(str(item["line_total"]))
                elif hasattr(item, "retail_price") and hasattr(item, "quantity"):
                    qualifying_subtotal += Decimal(str(item.retail_price)) * Decimal(str(item.quantity))
                elif isinstance(item, dict) and "unit_price" in item and "quantity" in item:
                    qualifying_subtotal += Decimal(str(item["unit_price"])) * Decimal(str(item["quantity"]))

        if qualifying_subtotal <= Decimal("0.00"):
            return Decimal("0.00")

    # Compute discount
    if coupon.discount_type == Coupon.DiscountType.PERCENTAGE:
        raw_discount = (qualifying_subtotal * coupon.discount_value / Decimal("100")).quantize(Decimal("0.01"))
        if coupon.max_discount_amount is not None and coupon.max_discount_amount > Decimal("0.00"):
            raw_discount = min(raw_discount, coupon.max_discount_amount)
    elif coupon.discount_type == Coupon.DiscountType.FIXED_AMOUNT:
        raw_discount = min(coupon.discount_value, qualifying_subtotal)
    else:
        raw_discount = Decimal("0.00")

    # Cap discount at order subtotal and ensure non-negative
    final_discount = max(Decimal("0.00"), min(raw_discount, subtotal))
    return final_discount.quantize(Decimal("0.01"))
