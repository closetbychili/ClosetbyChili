"""Orders domain models."""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import IntegrityError, models, transaction
from django.db.models import Q
from django.utils import timezone


class Order(models.Model):
    """Customer order representing a purchase or confirmed sale."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        PROCESSING = "PROCESSING", "Processing"
        SHIPPED = "SHIPPED", "Shipped"
        DELIVERED = "DELIVERED", "Delivered"
        CANCELLED = "CANCELLED", "Cancelled"

    class PaymentStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="orders",
    )
    order_number = models.CharField(max_length=32, unique=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    currency = models.CharField(max_length=3, default="INR")
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        default=Decimal("0.00"),
    )
    discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        default=Decimal("0.00"),
    )
    shipping_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        default=Decimal("0.00"),
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        default=Decimal("0.00"),
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        default=Decimal("0.00"),
    )
    shipping_address_snapshot = models.JSONField(default=dict, blank=True)
    billing_address_snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"], name="idx_order_user_created"),
            models.Index(fields=["status"], name="idx_order_status"),
            models.Index(fields=["payment_status"], name="idx_order_payment_status"),
        ]

    def clean(self):
        super().clean()
        money_fields = [
            "subtotal",
            "discount",
            "shipping_amount",
            "tax_amount",
            "total",
        ]
        for field in money_fields:
            value = getattr(self, field)
            if value is not None and value < 0:
                raise ValidationError({field: "Money values cannot be negative."})

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self.generate_order_number()
        self.full_clean()
        super().save(*args, **kwargs)

    def generate_order_number(self):
        year = timezone.now().strftime("%Y")
        prefix = "CBC"
        while True:
            try:
                with transaction.atomic():
                    last = (
                        Order.objects.filter(order_number__startswith=f"{prefix}-{year}-")
                        .select_for_update()
                        .order_by("-order_number")
                        .first()
                    )
                    if last:
                        numeric = int(last.order_number.split("-")[-1]) + 1
                    else:
                        numeric = 1
                    candidate = f"{prefix}-{year}-{numeric:06d}"
                    if Order.objects.filter(order_number=candidate).exists():
                        continue
                    return candidate
            except IntegrityError:
                continue

    @property
    def item_count(self):
        return self.items.count()

    def __str__(self) -> str:
        return f"{self.order_number} ({self.user.email})"


class OrderItem(models.Model):
    """A purchased item snapshot recorded in an order."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )
    variant = models.ForeignKey(
        "catalog.ProductVariant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )
    product_name = models.CharField(max_length=255)
    variant_name = models.CharField(max_length=255, blank=True, default="")
    sku = models.CharField(max_length=100, blank=True, default="")
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    class Meta:
        db_table = "orders_items"
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0),
                name="chk_order_item_quantity_positive",
            ),
            models.CheckConstraint(
                condition=Q(line_total__gte=0),
                name="chk_order_item_line_total_non_negative",
            ),
        ]

    def clean(self):
        super().clean()
        if self.unit_price < 0:
            raise ValidationError({"unit_price": "Money values cannot be negative."})
        if self.line_total < 0:
            raise ValidationError({"line_total": "Money values cannot be negative."})
        if self.quantity <= 0:
            raise ValidationError({"quantity": "Quantity must be greater than zero."})
        expected = (self.unit_price * self.quantity).quantize(Decimal("0.01"))
        if self.line_total != expected:
            raise ValidationError({"line_total": "Line total must equal unit_price × quantity."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.product_name} x {self.quantity} ({self.order.order_number})"
