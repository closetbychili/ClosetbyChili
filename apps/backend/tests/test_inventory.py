"""
Tests for Inventory domain models.
"""

import uuid
from decimal import Decimal

from django.db import IntegrityError
from django.test import TestCase

from apps.catalog.models import Product, ProductVariant
from apps.inventory.models import (
    InventoryItem,
    InventoryMovement,
    InventoryReservation,
)


class InventoryModelTest(TestCase):
    """Test InventoryItem, Movement, and Reservation models."""

    def setUp(self):
        self.product = Product.objects.create(
            name="Classic Anarkali", slug="classic-anarkali"
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="CLS-ANR-RED-M",
            size="M",
            color="Red",
            retail_price=Decimal("2499.00"),
        )

    def test_create_inventory_item(self):
        item = InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=50,
            quantity_reserved=5,
        )
        self.assertIsInstance(item.id, uuid.UUID)
        self.assertEqual(item.quantity_available, 50)
        self.assertEqual(item.quantity_reserved, 5)
        self.assertIn("avail=50", str(item))

    def test_inventory_movement_creation(self):
        item = InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=100,
        )
        movement = InventoryMovement.objects.create(
            inventory_item=item,
            movement_type=InventoryMovement.MovementType.STOCK_RECEIVED,
            quantity_change=100,
            reference="PO-2026-001",
        )
        self.assertIsInstance(movement.id, uuid.UUID)
        self.assertEqual(movement.movement_type, "stock_received")
        self.assertEqual(movement.quantity_change, 100)
        self.assertEqual(movement.reference, "PO-2026-001")

    def test_inventory_reservation_creation(self):
        item = InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=20,
            quantity_reserved=2,
        )
        reservation = InventoryReservation.objects.create(
            inventory_item=item,
            quantity=2,
            status=InventoryReservation.Status.ACTIVE,
        )
        self.assertIsInstance(reservation.id, uuid.UUID)
        self.assertEqual(reservation.quantity, 2)
        self.assertEqual(reservation.status, "active")

    def test_quantity_available_non_negative_constraint(self):
        with self.assertRaises(IntegrityError):
            InventoryItem.objects.create(
                variant=self.variant,
                quantity_available=-1,
            )

    def test_quantity_reserved_non_negative_constraint(self):
        with self.assertRaises(IntegrityError):
            InventoryItem.objects.create(
                variant=self.variant,
                quantity_reserved=-5,
            )

    def test_reservation_quantity_positive_constraint(self):
        item = InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=10,
        )
        with self.assertRaises(IntegrityError):
            InventoryReservation.objects.create(
                inventory_item=item,
                quantity=0,
            )
