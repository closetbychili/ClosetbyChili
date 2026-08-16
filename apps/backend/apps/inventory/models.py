"""
Closet by Chilli — Inventory Domain Models

Entities defined by 05-database-architecture.md and 06-domain-model.md:
- InventoryItem: Stock state per product variant (available, reserved).
- InventoryMovement: Auditable, append-only history of stock changes.
- InventoryReservation: Temporary claims on available stock.
"""

import uuid

from django.core.validators import MinValueValidator
from django.db import models


class InventoryItem(models.Model):
    """
    Stock state for a sellable product variant.

    Tracks available and reserved quantities separately
    (05-database-architecture.md §22).
    One-to-one with ProductVariant.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    variant = models.OneToOneField(
        "catalog.ProductVariant",
        on_delete=models.CASCADE,
        related_name="inventory",
    )
    quantity_available = models.IntegerField(default=0)
    quantity_reserved = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_items"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity_available__gte=0),
                name="chk_quantity_available_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(quantity_reserved__gte=0),
                name="chk_quantity_reserved_non_negative",
            ),
        ]

    def __str__(self) -> str:
        return f"Inventory for {self.variant} (avail={self.quantity_available})"


class InventoryMovement(models.Model):
    """
    Auditable record of a stock change.

    Append-only — inventory history should not be silently rewritten
    (06-domain-model.md §23, 05-database-architecture.md §23).
    """

    class MovementType(models.TextChoices):
        STOCK_RECEIVED = "stock_received", "Stock Received"
        MANUAL_ADJUSTMENT = "manual_adjustment", "Manual Adjustment"
        ORDER_RESERVED = "order_reserved", "Order Reserved"
        RESERVATION_RELEASED = "reservation_released", "Reservation Released"
        ORDER_FULFILLED = "order_fulfilled", "Order Fulfilled"
        RETURN_RECEIVED = "return_received", "Return Received"
        DAMAGED = "damaged", "Damaged"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name="movements",
    )
    movement_type = models.CharField(
        max_length=30,
        choices=MovementType.choices,
    )
    quantity_change = models.IntegerField()
    reference = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_movements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["inventory_item", "movement_type"],
                name="idx_movement_item_type",
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.get_movement_type_display()}: "
            f"{self.quantity_change:+d} for {self.inventory_item.variant}"
        )


class InventoryReservation(models.Model):
    """
    Temporary claim on available stock.

    Lifecycle: Active → Released | Finalized
    (06-domain-model.md §24, 05-database-architecture.md §24).
    Must be concurrency-safe.
    """

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        RELEASED = "released", "Released"
        FINALIZED = "finalized", "Finalized"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_reservations"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1),
                name="chk_reservation_quantity_positive",
            ),
        ]
        indexes = [
            models.Index(
                fields=["inventory_item", "status"],
                name="idx_reservation_item_status",
            ),
        ]

    def __str__(self) -> str:
        return (
            f"Reservation {self.status}: "
            f"{self.quantity} of {self.inventory_item.variant}"
        )
