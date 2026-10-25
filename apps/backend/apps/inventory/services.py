"""
Closet by Chilli — Authoritative Inventory & Stock Calculation Services.

Implements stock calculations, status classification, reservation reconciliation,
and metrics aggregation for administrative inventory management.

Accounting Rules:
- Available Stock: Sellable inventory available for immediate order.
- Reserved Stock: Units allocated to active checkout/order reservations.
  Expired, cancelled, or released reservations (status != 'active') must never count.
- On-Hand Stock: Total physical stock in warehouse = Available Stock + Reserved Stock.
- Stock Status:
    - Available <= 0: "out_of_stock" ("Out of Stock")
    - 0 < Available <= low_stock_threshold (default 5): "low_stock" ("Low Stock")
    - Available > low_stock_threshold: "in_stock" ("In Stock")
- Read-only: Calculating or viewing inventory NEVER creates movements or mutates quantities.
"""

from __future__ import annotations

from typing import Any, Dict, Optional
import uuid
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, F, Max, Q, Sum
from django.db.models.functions import Coalesce
from rest_framework.exceptions import NotFound, ValidationError

from apps.catalog.models import ProductVariant
from apps.inventory.models import InventoryItem, InventoryMovement, InventoryReservation

DEFAULT_LOW_STOCK_THRESHOLD = 5

REASON_ALIASES: dict[str, str] = {
    "stock_received": "received_stock",
    "damaged_inventory": "damaged_goods",
    "damaged": "damaged_goods",
    "lost_stock": "lost_or_missing",
    "missing": "lost_or_missing",
    "return_restock": "return_received",
    "manual_adjustment": "count_correction",
}


def calculate_variant_stock(
    item: Optional[InventoryItem],
    low_stock_threshold: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Computes authoritative stock numbers and status for an inventory item.
    Uses configurable per-item threshold or explicit override.
    Safely handles items with active or historical reservations.
    """
    effective_threshold = (
        low_stock_threshold
        if low_stock_threshold is not None
        else getattr(item, "low_stock_threshold", DEFAULT_LOW_STOCK_THRESHOLD)
        if item is not None
        else DEFAULT_LOW_STOCK_THRESHOLD
    )

    if item is None:
        return {
            "quantity_on_hand": 0,
            "quantity_reserved": 0,
            "quantity_available": 0,
            "stock_status": "out_of_stock",
            "stock_status_label": "Out of Stock",
            "low_stock_threshold": effective_threshold,
            "is_alert_acknowledged": False,
            "alert_acknowledged_at": None,
        }

    # If active reservations are prefetched on the item, use them to avoid extra query
    if hasattr(item, "active_reservations"):
        active_res_qty = sum(r.quantity for r in item.active_reservations)
    else:
        active_res_agg = item.reservations.filter(
            status=InventoryReservation.Status.ACTIVE
        ).aggregate(total=Sum("quantity"))["total"]
        active_res_qty = active_res_agg or 0

    base_reserved = item.quantity_reserved or 0
    base_available = max(0, item.quantity_available or 0)

    # Reconcile reserved stock:
    # If active reservations exist, they represent current claims on stock
    reserved_qty = max(base_reserved, active_res_qty)

    # If active reservations were added on top of a base quantity without updating quantity_reserved:
    if active_res_qty > base_reserved:
        # Stock claim reduces available stock
        available_qty = max(0, base_available - (active_res_qty - base_reserved))
        on_hand_qty = base_available + base_reserved
    else:
        available_qty = base_available
        on_hand_qty = available_qty + reserved_qty

    # Status classification
    if available_qty <= 0:
        stock_status = "out_of_stock"
        stock_status_label = "Out of Stock"
    elif available_qty <= effective_threshold:
        stock_status = "low_stock"
        stock_status_label = "Low Stock"
    else:
        stock_status = "in_stock"
        stock_status_label = "In Stock"

    return {
        "quantity_on_hand": on_hand_qty,
        "quantity_reserved": reserved_qty,
        "quantity_available": available_qty,
        "stock_status": stock_status,
        "stock_status_label": stock_status_label,
        "low_stock_threshold": effective_threshold,
        "is_alert_acknowledged": getattr(item, "is_alert_acknowledged", False),
        "alert_acknowledged_at": (
            item.alert_acknowledged_at.isoformat()
            if item.alert_acknowledged_at
            else None
        ),
    }


def get_inventory_summary_metrics(
    low_stock_threshold: Optional[int] = None,
    category: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes aggregated summary metrics for inventory management.

    Metrics:
    - active_variants_tracked: Count of active product variants with tracking records
    - total_on_hand: Sum of all on-hand units (available + reserved)
    - total_reserved: Sum of reserved units
    - total_available: Sum of sellable available units
    - out_of_stock_variants: Count of variants with available <= 0
    - low_stock_variants: Count of variants with 0 < available <= threshold
    - in_stock_variants: Count of variants with available > threshold
    - unacknowledged_alerts: Count of unacknowledged low-stock or out-of-stock items
    """
    # Active variants that are tracked
    base_qs = InventoryItem.objects.filter(
        variant__is_active=True,
        variant__product__is_active=True,
    )

    if category and category.lower() != "all":
        import uuid
        try:
            cat_uuid = uuid.UUID(category)
            base_qs = base_qs.filter(
                Q(variant__product__category__id=cat_uuid)
                | Q(variant__product__category__slug=category)
            )
        except ValueError:
            base_qs = base_qs.filter(variant__product__category__slug=category)

    # If explicit threshold parameter is passed, use it; otherwise use per-item F("low_stock_threshold")
    if low_stock_threshold is not None:
        low_stock_q = Q(quantity_available__gt=0, quantity_available__lte=low_stock_threshold)
        in_stock_q = Q(quantity_available__gt=low_stock_threshold)
        unack_q = Q(quantity_available__lte=low_stock_threshold, is_alert_acknowledged=False)
    else:
        low_stock_q = Q(quantity_available__gt=0, quantity_available__lte=F("low_stock_threshold"))
        in_stock_q = Q(quantity_available__gt=F("low_stock_threshold"))
        unack_q = Q(quantity_available__lte=F("low_stock_threshold"), is_alert_acknowledged=False)

    # Compute base aggregate metrics
    aggregates = base_qs.aggregate(
        active_variants_tracked=Count("id", distinct=True),
        total_available=Coalesce(Sum("quantity_available"), 0),
        total_reserved=Coalesce(Sum("quantity_reserved"), 0),
        out_of_stock_variants=Count("id", filter=Q(quantity_available__lte=0)),
        low_stock_variants=Count("id", filter=low_stock_q),
        in_stock_variants=Count("id", filter=in_stock_q),
        unacknowledged_alerts=Count("id", filter=unack_q),
    )

    total_avail = aggregates["total_available"]
    total_res = aggregates["total_reserved"]
    total_on_hand = total_avail + total_res

    return {
        "active_variants_tracked": aggregates["active_variants_tracked"],
        "total_on_hand": total_on_hand,
        "total_reserved": total_res,
        "total_available": total_avail,
        "out_of_stock_variants": aggregates["out_of_stock_variants"],
        "low_stock_variants": aggregates["low_stock_variants"],
        "in_stock_variants": aggregates["in_stock_variants"],
        "unacknowledged_alerts": aggregates["unacknowledged_alerts"],
        "low_stock_threshold": low_stock_threshold if low_stock_threshold is not None else DEFAULT_LOW_STOCK_THRESHOLD,
    }


def update_variant_low_stock_threshold(
    variant_id: Any,
    threshold: Any,
) -> Dict[str, Any]:
    """
    Authoritative service to update the configured low-stock threshold for a variant.
    Enforces non-negative threshold and updates InventoryItem atomically.
    """
    try:
        val = int(threshold)
        if val < 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise ValidationError({
            "low_stock_threshold": "Low-stock threshold must be a non-negative integer."
        })

    try:
        variant_uuid = uuid.UUID(str(variant_id))
    except (ValueError, TypeError):
        raise ValidationError({"variant_id": "Invalid variant ID format."})

    variant = ProductVariant.objects.filter(id=variant_uuid).first()
    if not variant:
        raise NotFound("Product variant not found.")

    with transaction.atomic():
        item, _ = InventoryItem.objects.select_for_update().get_or_create(
            variant=variant,
            defaults={"quantity_available": 0, "quantity_reserved": 0, "low_stock_threshold": val},
        )
        item.low_stock_threshold = val
        # If available stock is now strictly above the new threshold, reset alert acknowledgement
        if item.quantity_available > val:
            item.is_alert_acknowledged = False
            item.alert_acknowledged_at = None
            item.save(update_fields=["low_stock_threshold", "is_alert_acknowledged", "alert_acknowledged_at", "updated_at"])
        else:
            item.save(update_fields=["low_stock_threshold", "updated_at"])

        return calculate_variant_stock(item)


def acknowledge_variant_alert(
    variant_id: Any,
    acknowledged: bool = True,
) -> Dict[str, Any]:
    """
    Authoritative service to acknowledge or unacknowledge an inventory alert.
    Never alters physical or available quantities, and never hides actual alert state.
    """
    try:
        variant_uuid = uuid.UUID(str(variant_id))
    except (ValueError, TypeError):
        raise ValidationError({"variant_id": "Invalid variant ID format."})

    variant = ProductVariant.objects.filter(id=variant_uuid).first()
    if not variant:
        raise NotFound("Product variant not found.")

    with transaction.atomic():
        item, _ = InventoryItem.objects.select_for_update().get_or_create(
            variant=variant,
            defaults={"quantity_available": 0, "quantity_reserved": 0},
        )
        item.is_alert_acknowledged = acknowledged
        item.alert_acknowledged_at = timezone.now() if acknowledged else None
        item.save(update_fields=["is_alert_acknowledged", "alert_acknowledged_at", "updated_at"])

        return calculate_variant_stock(item)



def adjust_variant_stock(
    *,
    variant_id: Any,
    adjustment_type: Any,
    quantity: Any,
    reason_code: Any,
    note: str = "",
    actor: Optional[Any] = None,
    idempotency_key: Optional[str] = None,
    reference: Optional[str] = None,
    low_stock_threshold: int = DEFAULT_LOW_STOCK_THRESHOLD,
) -> Dict[str, Any]:
    """
    Authoritative service to safely adjust stock for a product variant.

    Enforces:
    - Positive adjustment quantities for increase/decrease.
    - Transactional row-level lock (select_for_update) to prevent race conditions.
    - Prevention of negative on-hand inventory.
    - Protection of active reservations (cannot make available stock negative).
    - Atomic update of InventoryItem and creation of an append-only InventoryMovement audit record.
    - Idempotency guard against duplicate submissions.
    """
    try:
        if isinstance(variant_id, str):
            variant_uuid = uuid.UUID(variant_id)
        else:
            variant_uuid = variant_id
    except (ValueError, TypeError):
        raise ValidationError({"variant_id": "Invalid variant ID format."})

    variant = (
        ProductVariant.objects.select_related("product")
        .filter(id=variant_uuid)
        .first()
    )
    if not variant:
        raise NotFound("Product variant not found.")

    adj_type = str(adjustment_type).strip().lower()
    if adj_type not in ("increase", "decrease", "set", "delta"):
        raise ValidationError({
            "adjustment_type": f"Invalid adjustment type '{adjustment_type}'. Must be 'increase' or 'decrease'."
        })

    try:
        qty = int(quantity)
    except (ValueError, TypeError):
        raise ValidationError({"quantity": "Quantity must be a valid integer."})

    if adj_type in ("increase", "decrease"):
        if qty <= 0:
            raise ValidationError({"quantity": "Adjustment quantity must be greater than zero."})
    elif adj_type == "set":
        if qty < 0:
            raise ValidationError({"quantity": "Stock quantity cannot be negative."})
    elif adj_type == "delta":
        if qty == 0:
            raise ValidationError({"quantity": "Adjustment quantity change cannot be zero."})

    cleaned_reason = str(reason_code or "").strip()
    if not cleaned_reason:
        raise ValidationError({"reason_code": "Reason code is mandatory."})

    norm_reason = REASON_ALIASES.get(cleaned_reason, cleaned_reason)
    valid_reasons = {choice[0] for choice in InventoryMovement.AdjustmentReason.choices}
    if norm_reason not in valid_reasons:
        raise ValidationError({
            "reason_code": (
                f"Invalid reason code '{reason_code}'. Must be one of: "
                f"{', '.join(sorted(valid_reasons))}."
            )
        })

    cleaned_idem_key = (idempotency_key or "").strip()

    with transaction.atomic():
        item = (
            InventoryItem.objects.select_for_update()
            .filter(variant=variant)
            .first()
        )
        if not item:
            item = InventoryItem.objects.create(
                variant=variant,
                quantity_available=0,
                quantity_reserved=0,
            )

        # Idempotency check: if a movement for this item with this key already exists, return current state
        if cleaned_idem_key:
            existing_movement = (
                InventoryMovement.objects.filter(
                    inventory_item=item,
                    idempotency_key=cleaned_idem_key,
                )
                .order_by("-created_at")
                .first()
            )
            if existing_movement:
                stock_summary = calculate_variant_stock(item, low_stock_threshold=low_stock_threshold)
                return {
                    "variant_id": str(variant.id),
                    "sku": variant.sku,
                    "quantity_on_hand": stock_summary["quantity_on_hand"],
                    "quantity_reserved": stock_summary["quantity_reserved"],
                    "quantity_available": stock_summary["quantity_available"],
                    "stock_status": stock_summary["stock_status"],
                    "stock_status_label": stock_summary["stock_status_label"],
                    "low_stock_threshold": low_stock_threshold,
                    "change_delta": existing_movement.quantity_change,
                    "resulting_quantity": existing_movement.resulting_quantity,
                    "movement_id": str(existing_movement.id),
                    "idempotent_replay": True,
                }

        current_avail = item.quantity_available or 0
        current_res = item.quantity_reserved or 0
        current_on_hand = current_avail + current_res

        if adj_type == "increase":
            change_delta = qty
        elif adj_type == "decrease":
            change_delta = -qty
        elif adj_type == "set":
            change_delta = qty - current_avail
        else:  # delta
            change_delta = qty

        new_avail = current_avail + change_delta
        new_on_hand = current_on_hand + change_delta

        if new_on_hand < 0:
            raise ValidationError({
                "quantity": (
                    f"Cannot decrease stock by {abs(change_delta)} unit(s). "
                    f"Total on-hand stock is {current_on_hand}."
                )
            })

        if new_avail < 0:
            raise ValidationError({
                "quantity": (
                    f"Cannot decrease stock by {abs(change_delta)} unit(s). "
                    f"Only {current_avail} unit(s) are available "
                    f"({current_res} unit(s) are currently reserved for pending orders)."
                )
            })

        # Apply stock update
        item.quantity_available = new_avail
        if item.quantity_available > item.low_stock_threshold and item.is_alert_acknowledged:
            item.is_alert_acknowledged = False
            item.alert_acknowledged_at = None
            item.save(update_fields=["quantity_available", "is_alert_acknowledged", "alert_acknowledged_at", "updated_at"])
        else:
            item.save(update_fields=["quantity_available", "updated_at"])

        actor_user = actor if (actor and getattr(actor, "is_authenticated", False)) else None
        actor_email = getattr(actor, "email", "") or (str(actor) if actor else "")

        movement = InventoryMovement.objects.create(
            inventory_item=item,
            movement_type=InventoryMovement.MovementType.MANUAL_ADJUSTMENT,
            quantity_change=change_delta,
            reference=reference or (f"Reason: {norm_reason}"),
            actor=actor_user,
            actor_email=actor_email,
            reason_code=norm_reason,
            note=(note or "").strip(),
            resulting_quantity=new_on_hand,
            idempotency_key=cleaned_idem_key,
        )

        stock_summary = calculate_variant_stock(item, low_stock_threshold=low_stock_threshold)
        return {
            "variant_id": str(variant.id),
            "sku": variant.sku,
            "quantity_on_hand": stock_summary["quantity_on_hand"],
            "quantity_reserved": stock_summary["quantity_reserved"],
            "quantity_available": stock_summary["quantity_available"],
            "stock_status": stock_summary["stock_status"],
            "stock_status_label": stock_summary["stock_status_label"],
            "low_stock_threshold": low_stock_threshold,
            "change_delta": change_delta,
            "resulting_quantity": new_on_hand,
            "movement_id": str(movement.id),
            "idempotent_replay": False,
        }


def create_order_reservations(
    *,
    order: Any,
    items: Optional[list[dict[str, Any]]] = None,
    expiry_minutes: int = 15,
    actor: Optional[Any] = None,
) -> list[InventoryReservation]:
    """
    Reserve available stock atomically for an order during checkout.

    Guarantees:
    - Deadlock-free row-level locking via ordered variant IDs and select_for_update().
    - Validates quantity_available >= requested_quantity against database.
    - Decrements quantity_available, increments quantity_reserved atomically.
    - Creates InventoryReservation records with expiration timestamp.
    - Appends audited InventoryMovement records with movement_type=ORDER_RESERVED.
    - Physical on-hand stock does not change (quantity_change=0).
    - Idempotency guard: duplicate reservation requests for the same order return existing reservations.
    """
    from apps.cart.exceptions import InsufficientStockError

    # Idempotency check: if active reservations already exist for this order, reuse them
    existing_active = list(
        InventoryReservation.objects.filter(
            order=order,
            status=InventoryReservation.Status.ACTIVE,
        )
    )
    if existing_active:
        return existing_active

    if items is None:
        items_data: list[dict[str, Any]] = [
            {"variant": oi.variant, "quantity": oi.quantity}
            for oi in order.items.select_related("variant").all()
        ]
    else:
        items_data = items

    if not items_data:
        return []

    # Sort items by variant ID string to guarantee deterministic lock order across concurrent transactions
    sorted_items = sorted(items_data, key=lambda x: str(x["variant"].id))
    variant_ids = [item["variant"].id for item in sorted_items]

    with transaction.atomic():
        inventory_map: dict[str, InventoryItem] = {
            str(inv.variant_id): inv
            for inv in InventoryItem.objects.select_for_update()
            .filter(variant_id__in=variant_ids)
            .order_by("variant_id")
        }

        # Validate authoritative stock availability for all items first
        for entry in sorted_items:
            variant = entry["variant"]
            v_id = str(variant.id)
            inv = inventory_map.get(v_id)
            req_qty = int(entry["quantity"])
            available = inv.quantity_available if inv else 0
            if available < req_qty:
                raise InsufficientStockError(
                    f"Insufficient stock for {variant.sku}. Requested {req_qty}, available {available}."
                )

        expires_at = timezone.now() + timezone.timedelta(minutes=expiry_minutes)
        actor_user = actor if (actor and getattr(actor, "is_authenticated", False)) else None
        actor_email = getattr(actor, "email", "") or (str(actor) if actor else "")
        created_reservations: list[InventoryReservation] = []

        for entry in sorted_items:
            variant = entry["variant"]
            v_id = str(variant.id)
            inv = inventory_map[v_id]
            req_qty = int(entry["quantity"])

            inv.quantity_available -= req_qty
            inv.quantity_reserved += req_qty
            inv.save(update_fields=["quantity_available", "quantity_reserved", "updated_at"])

            reservation = InventoryReservation.objects.create(
                inventory_item=inv,
                order=order,
                quantity=req_qty,
                status=InventoryReservation.Status.ACTIVE,
                expires_at=expires_at,
            )
            created_reservations.append(reservation)

            on_hand = inv.quantity_available + inv.quantity_reserved
            InventoryMovement.objects.create(
                inventory_item=inv,
                movement_type=InventoryMovement.MovementType.ORDER_RESERVED,
                quantity_change=0,
                reference=f"Order {order.order_number}",
                actor=actor_user,
                actor_email=actor_email,
                reason_code="order_reserved",
                note=f"Reserved {req_qty} unit(s) for order {order.order_number}",
                resulting_quantity=on_hand,
                idempotency_key=f"reserve:{order.id}:{inv.id}",
            )

        return created_reservations


def finalize_order_inventory(
    *,
    order: Any,
    actor: Optional[Any] = None,
) -> list[InventoryMovement]:
    """
    Finalize stock deduction upon verified payment completion.

    Guarantees:
    - Atomicity & row locking via select_for_update().
    - Converts ACTIVE reservations to FINALIZED.
    - Decrements quantity_reserved (reducing physical on-hand stock).
    - Appends audited InventoryMovement with movement_type=ORDER_FULFILLED and negative quantity_change.
    - Idempotency guard: if already finalized, returns existing fulfillment movements without double deduction.
    - Safe recovery: if reservations expired but stock is still available, allocates and fulfills safely without overselling.
    """
    from apps.payments.exceptions import PaymentError

    with transaction.atomic():
        # Lock reservations tied to this order
        reservations = list(
            InventoryReservation.objects.select_for_update(of=("self",))
            .filter(order=order)
            .order_by("inventory_item_id")
        )

        # Idempotency check: if all reservations are already finalized or fulfillment movements exist
        existing_fulfillments = list(
            InventoryMovement.objects.filter(
                reference=f"Order {order.order_number}",
                movement_type=InventoryMovement.MovementType.ORDER_FULFILLED,
            )
        )
        if existing_fulfillments and not any(r.status == InventoryReservation.Status.ACTIVE for r in reservations):
            return existing_fulfillments

        active_reservations = [r for r in reservations if r.status == InventoryReservation.Status.ACTIVE]
        movements: list[InventoryMovement] = []
        actor_user = actor if (actor and getattr(actor, "is_authenticated", False)) else None
        actor_email = getattr(actor, "email", "") or (str(actor) if actor else "")

        if active_reservations:
            # Standard path: consume active reservations
            active_reservations.sort(key=lambda r: str(r.inventory_item_id))
            for res in active_reservations:
                inv = InventoryItem.objects.select_for_update().get(id=res.inventory_item_id)
                inv.quantity_reserved = max(0, inv.quantity_reserved - res.quantity)
                inv.save(update_fields=["quantity_reserved", "updated_at"])

                res.status = InventoryReservation.Status.FINALIZED
                res.save(update_fields=["status", "updated_at"])

                new_on_hand = inv.quantity_available + inv.quantity_reserved
                movement = InventoryMovement.objects.create(
                    inventory_item=inv,
                    movement_type=InventoryMovement.MovementType.ORDER_FULFILLED,
                    quantity_change=-res.quantity,
                    reference=f"Order {order.order_number}",
                    actor=actor_user,
                    actor_email=actor_email,
                    reason_code="order_fulfilled",
                    note=f"Fulfilled {res.quantity} unit(s) upon payment for order {order.order_number}",
                    resulting_quantity=new_on_hand,
                    idempotency_key=f"fulfill:{order.id}:{res.id}",
                )
                movements.append(movement)
        else:
            # Recovery path: reservation expired or not found, but payment succeeded.
            # Validate available stock exists before allocating; never oversell!
            order_items = list(order.items.select_related("variant").all())
            order_items.sort(key=lambda oi: str(oi.variant_id))
            variant_ids = [oi.variant_id for oi in order_items]

            inv_map: dict[str, InventoryItem] = {
                str(inv.variant_id): inv
                for inv in InventoryItem.objects.select_for_update()
                .filter(variant_id__in=variant_ids)
                .order_by("variant_id")
            }

            for oi in order_items:
                inv = inv_map.get(str(oi.variant_id))
                available = inv.quantity_available if inv else 0
                if available < oi.quantity:
                    raise PaymentError(
                        f"Order reservation expired and variant {oi.sku} is out of stock. Cannot allocate stock.",
                        code="STOCK_DEPLETED_POST_EXPIRY",
                    )

            for oi in order_items:
                inv = inv_map[str(oi.variant_id)]
                inv.quantity_available -= oi.quantity
                inv.save(update_fields=["quantity_available", "updated_at"])

                InventoryReservation.objects.create(
                    inventory_item=inv,
                    order=order,
                    quantity=oi.quantity,
                    status=InventoryReservation.Status.FINALIZED,
                    expires_at=timezone.now(),
                )

                new_on_hand = inv.quantity_available + inv.quantity_reserved
                movement = InventoryMovement.objects.create(
                    inventory_item=inv,
                    movement_type=InventoryMovement.MovementType.ORDER_FULFILLED,
                    quantity_change=-oi.quantity,
                    reference=f"Order {order.order_number}",
                    actor=actor_user,
                    actor_email=actor_email,
                    reason_code="order_fulfilled",
                    note=f"Fulfilled {oi.quantity} unit(s) post-expiry for order {order.order_number}",
                    resulting_quantity=new_on_hand,
                    idempotency_key=f"fulfill:{order.id}:{oi.id}",
                )
                movements.append(movement)

        return movements


def release_order_reservations(
    *,
    order: Any,
    reason: str = "order_cancelled",
    actor: Optional[Any] = None,
) -> list[InventoryReservation]:
    """
    Release active stock reservations when an order is cancelled or payment fails.

    Guarantees:
    - Atomicity & row locking via select_for_update().
    - Restores quantity_available += reserved_quantity and decrements quantity_reserved.
    - Transitions ACTIVE reservations to RELEASED.
    - Appends audited InventoryMovement with movement_type=RESERVATION_RELEASED (quantity_change=0).
    - Idempotency guard: safely returns empty list if reservations are already released or finalized.
    """
    with transaction.atomic():
        active_reservations = list(
            InventoryReservation.objects.select_for_update(of=("self",))
            .filter(order=order, status=InventoryReservation.Status.ACTIVE)
            .order_by("inventory_item_id")
        )
        if not active_reservations:
            return []

        actor_user = actor if (actor and getattr(actor, "is_authenticated", False)) else None
        actor_email = getattr(actor, "email", "") or (str(actor) if actor else "")

        for res in active_reservations:
            inv = InventoryItem.objects.select_for_update().get(id=res.inventory_item_id)
            inv.quantity_available += res.quantity
            inv.quantity_reserved = max(0, inv.quantity_reserved - res.quantity)

            # If available stock was restored above threshold, reset alert acknowledgement
            if inv.quantity_available > inv.low_stock_threshold and inv.is_alert_acknowledged:
                inv.is_alert_acknowledged = False
                inv.alert_acknowledged_at = None
                inv.save(update_fields=[
                    "quantity_available",
                    "quantity_reserved",
                    "is_alert_acknowledged",
                    "alert_acknowledged_at",
                    "updated_at",
                ])
            else:
                inv.save(update_fields=["quantity_available", "quantity_reserved", "updated_at"])

            res.status = InventoryReservation.Status.RELEASED
            res.save(update_fields=["status", "updated_at"])

            on_hand = inv.quantity_available + inv.quantity_reserved
            InventoryMovement.objects.create(
                inventory_item=inv,
                movement_type=InventoryMovement.MovementType.RESERVATION_RELEASED,
                quantity_change=0,
                reference=f"Order {order.order_number}",
                actor=actor_user,
                actor_email=actor_email,
                reason_code=reason,
                note=f"Released {res.quantity} unit(s) for order {order.order_number} ({reason})",
                resulting_quantity=on_hand,
                idempotency_key=f"release:{order.id}:{res.id}",
            )

        return active_reservations


def expire_stale_reservations() -> int:
    """
    Find and release all ACTIVE reservations that have passed their expires_at timestamp.

    If an affected order is still PENDING with no active reservations remaining,
    transitions the order status to CANCELLED.
    Returns the count of expired reservations released.
    """
    from apps.orders.models import Order

    now = timezone.now()
    with transaction.atomic():
        stale_reservations = list(
            InventoryReservation.objects.select_for_update(of=("self",))
            .filter(
                status=InventoryReservation.Status.ACTIVE,
                expires_at__isnull=False,
                expires_at__lte=now,
            )
            .order_by("inventory_item_id")
        )

        if not stale_reservations:
            return 0

        affected_orders: set[Order] = set()

        for res in stale_reservations:
            inv = InventoryItem.objects.select_for_update().get(id=res.inventory_item_id)
            inv.quantity_available += res.quantity
            inv.quantity_reserved = max(0, inv.quantity_reserved - res.quantity)

            if inv.quantity_available > inv.low_stock_threshold and inv.is_alert_acknowledged:
                inv.is_alert_acknowledged = False
                inv.alert_acknowledged_at = None
                inv.save(update_fields=[
                    "quantity_available",
                    "quantity_reserved",
                    "is_alert_acknowledged",
                    "alert_acknowledged_at",
                    "updated_at",
                ])
            else:
                inv.save(update_fields=["quantity_available", "quantity_reserved", "updated_at"])

            res.status = InventoryReservation.Status.RELEASED
            res.save(update_fields=["status", "updated_at"])

            on_hand = inv.quantity_available + inv.quantity_reserved
            order_ref = f"Order {res.order.order_number}" if res.order else "N/A"
            InventoryMovement.objects.create(
                inventory_item=inv,
                movement_type=InventoryMovement.MovementType.RESERVATION_RELEASED,
                quantity_change=0,
                reference=order_ref,
                actor=None,
                actor_email="system",
                reason_code="reservation_expired",
                note=f"Auto-expired reservation {res.id} for {res.quantity} unit(s)",
                resulting_quantity=on_hand,
                idempotency_key=f"expire:{res.id}",
            )

            if res.order:
                affected_orders.add(res.order)

        # Transition orders that have no remaining active reservations to CANCELLED
        for ord_obj in affected_orders:
            ord_locked = Order.objects.select_for_update().filter(id=ord_obj.id).first()
            if (
                ord_locked
                and ord_locked.status == Order.Status.PENDING
                and ord_locked.payment_status == Order.PaymentStatus.PENDING
            ):
                has_active = ord_locked.inventory_reservations.filter(
                    status=InventoryReservation.Status.ACTIVE
                ).exists()
                if not has_active:
                    ord_locked.status = Order.Status.CANCELLED
                    ord_locked.save(update_fields=["status", "updated_at"])

        return len(stale_reservations)


