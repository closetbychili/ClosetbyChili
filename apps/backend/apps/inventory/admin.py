"""Inventory app admin configuration."""

from django.contrib import admin

from apps.inventory.models import (
    InventoryItem,
    InventoryMovement,
    InventoryReservation,
)

admin.site.register(InventoryItem)
admin.site.register(InventoryMovement)
admin.site.register(InventoryReservation)
