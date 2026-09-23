"""
Closet by Chilli — Cart Domain Models

Entities defined by 05-database-architecture.md §25-26 and 06-domain-model.md §25-27:
- Cart: Mutable shopping session record for guests (and future authenticated users).
- CartItem: Selected product variant and quantity within a cart.

Authoritative prices and inventory are resolved dynamically from
catalog and inventory domains.
Cart records never duplicate financial or product catalog data.
"""

import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class Cart(models.Model):
    """
    Shopping session state for guest and authenticated customers.

    Maintains active items selected for purchase.
    Cart data is temporary and mutable — never treated as a final order record.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="carts",
        help_text="Authenticated owner of the shopping cart.",
    )
    session_key = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        unique=True,
        db_index=True,
        help_text="Secure anonymous guest identifier or session token.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text=(
            "Soft status flag; deactivated upon order conversion "
            "or explicit expiration."
        ),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cart_carts"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(user__isnull=False, is_active=True),
                name="uq_active_user_cart",
            ),
        ]
        indexes = [
            models.Index(fields=["session_key"], name="idx_cart_session_key"),
            models.Index(fields=["is_active"], name="idx_cart_is_active"),
            models.Index(fields=["user", "is_active"], name="idx_cart_user_active"),
        ]

    def __str__(self) -> str:
        if self.user:
            return f"Cart {self.id} (user={self.user})"
        session_part = self.session_key[:8] if self.session_key else "none"
        return f"Cart {self.id} (session={session_part}...)"

    @property
    def item_count(self) -> int:
        """Total number of items in the cart across all variants."""
        return sum(item.quantity for item in self.items.all())

    @property
    def subtotal(self) -> Decimal:
        """
        Authoritative calculated subtotal across all cart items.
        Always computed dynamically from current variant retail prices.
        """
        total = Decimal("0.00")
        for item in self.items.select_related("variant"):
            total += item.line_total
        return total.quantize(Decimal("0.01"))


class CartItem(models.Model):
    """
    Selected product variant configuration and quantity in a cart.

    References the purchasable ProductVariant directly (06-domain-model.md §26).
    Prices are never hardcoded here — they derive server-side from ProductVariant.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
    )
    variant = models.ForeignKey(
        "catalog.ProductVariant",
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    quantity = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cart_items"
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "variant"],
                name="uq_cart_variant",
            ),
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1),
                name="chk_cart_item_quantity_positive",
            ),
        ]
        indexes = [
            models.Index(fields=["cart", "variant"], name="idx_cart_item_variant"),
        ]

    def __str__(self) -> str:
        return f"{self.quantity}x {self.variant.sku} in Cart {self.cart_id}"

    @property
    def unit_price(self) -> Decimal:
        """Authoritative unit price derived dynamically from catalog variant."""
        return self.variant.retail_price

    @property
    def line_total(self) -> Decimal:
        """Authoritative line total = unit_price * quantity."""
        return (self.unit_price * self.quantity).quantize(Decimal("0.01"))
