"""
Closet by Chilli — Cart Domain Model Tests.

Tests:
- Cart creation and default state.
- CartItem creation, unit_price property, line_total property.
- Subtotal and item_count calculations with Decimal precision.
- Constraints: positive quantity, unique variant per cart.
- Cascade deletion behavior.
"""

from decimal import Decimal
import uuid

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from apps.cart.models import Cart, CartItem
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import InventoryItem


class CartModelTest(TestCase):
    def setUp(self) -> None:
        self.category = Category.objects.create(name="Kurtis", slug="kurtis")
        self.product = Product.objects.create(
            name="Silk Anarkali",
            slug="silk-anarkali",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant_1 = ProductVariant.objects.create(
            product=self.product,
            sku="CHK-ANAR-S",
            size="S",
            color="Crimson",
            retail_price=Decimal("2999.00"),
            is_active=True,
        )
        self.variant_2 = ProductVariant.objects.create(
            product=self.product,
            sku="CHK-ANAR-M",
            size="M",
            color="Crimson",
            retail_price=Decimal("3499.50"),
            is_active=True,
        )
        InventoryItem.objects.create(variant=self.variant_1, quantity_available=10)
        InventoryItem.objects.create(variant=self.variant_2, quantity_available=5)

    def test_create_cart(self) -> None:
        cart = Cart.objects.create(session_key="test-guest-session-123")
        self.assertIsInstance(cart.id, uuid.UUID)
        self.assertEqual(cart.session_key, "test-guest-session-123")
        self.assertTrue(cart.is_active)
        self.assertEqual(cart.item_count, 0)
        self.assertEqual(cart.subtotal, Decimal("0.00"))

    def test_cart_item_unit_price_and_line_total(self) -> None:
        cart = Cart.objects.create(session_key="session-abc")
        item = CartItem.objects.create(cart=cart, variant=self.variant_1, quantity=2)

        self.assertEqual(item.unit_price, Decimal("2999.00"))
        self.assertEqual(item.line_total, Decimal("5998.00"))

    def test_cart_subtotal_and_item_count_calculation(self) -> None:
        cart = Cart.objects.create(session_key="session-multi")
        CartItem.objects.create(cart=cart, variant=self.variant_1, quantity=2)  # 2 * 2999 = 5998.00
        CartItem.objects.create(cart=cart, variant=self.variant_2, quantity=1)  # 1 * 3499.50 = 3499.50

        self.assertEqual(cart.item_count, 3)
        self.assertEqual(cart.subtotal, Decimal("9497.50"))

    def test_unique_cart_variant_constraint(self) -> None:
        cart = Cart.objects.create(session_key="session-uniq")
        CartItem.objects.create(cart=cart, variant=self.variant_1, quantity=1)

        with self.assertRaises(IntegrityError):
            CartItem.objects.create(cart=cart, variant=self.variant_1, quantity=2)

    def test_quantity_positive_check_constraint(self) -> None:
        cart = Cart.objects.create(session_key="session-chk")
        with self.assertRaises(IntegrityError):
            CartItem.objects.create(cart=cart, variant=self.variant_1, quantity=0)

    def test_cascade_delete_items_on_cart_delete(self) -> None:
        cart = Cart.objects.create(session_key="session-del")
        CartItem.objects.create(cart=cart, variant=self.variant_1, quantity=1)
        self.assertEqual(CartItem.objects.filter(cart=cart).count(), 1)

        cart.delete()
        self.assertEqual(CartItem.objects.filter(cart_id=cart.id).count(), 0)
