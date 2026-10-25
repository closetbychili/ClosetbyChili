"""Orders domain models."""

from __future__ import annotations

import uuid
from decimal import Decimal
from urllib.parse import urlparse

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
    cart = models.ForeignKey(
        "cart.Cart",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        help_text="The active cart that was converted into this order.",
    )
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="orders",
    )
    idempotency_key = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        help_text="Client-supplied checkout idempotency key for this user.",
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
    razorpay_order_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        help_text="Razorpay order identifier (order_xxxx).",
    )
    razorpay_payment_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        help_text="Razorpay payment identifier (pay_xxxx).",
    )
    razorpay_signature = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Razorpay payment verification signature.",
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
        constraints = [
            models.UniqueConstraint(
                fields=["user", "idempotency_key"],
                condition=Q(idempotency_key__isnull=False),
                name="uq_order_user_idempotency_key",
            ),
            models.UniqueConstraint(
                fields=["cart"],
                condition=Q(cart__isnull=False),
                name="uq_order_cart",
            ),
            models.UniqueConstraint(
                fields=["razorpay_order_id"],
                condition=Q(razorpay_order_id__isnull=False),
                name="uq_order_razorpay_order_id",
            ),
            models.UniqueConstraint(
                fields=["razorpay_payment_id"],
                condition=Q(razorpay_payment_id__isnull=False),
                name="uq_order_razorpay_payment_id",
            ),
        ]
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


class OrderAuditLog(models.Model):
    """
    Durable, append-only audit record for privileged order operations.
    Tracks status changes, cancellations, actor identity, timestamps, and operational notes.
    """

    class OperationType(models.TextChoices):
        STATUS_TRANSITION = "status_transition", "Status Transition"
        CANCELLATION = "cancellation", "Order Cancellation"
        RECONCILIATION = "reconciliation", "Payment Reconciliation"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    from_status = models.CharField(max_length=32)
    to_status = models.CharField(max_length=32)
    operation_type = models.CharField(
        max_length=32,
        choices=OperationType.choices,
        default=OperationType.STATUS_TRANSITION,
    )
    actor = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_audit_logs",
    )
    actor_email = models.CharField(max_length=255, blank=True, default="")
    note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "orders_audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["order", "created_at"], name="idx_order_audit_created"),
            models.Index(fields=["operation_type"], name="idx_order_audit_op_type"),
        ]

    def __str__(self) -> str:
        return f"{self.order.order_number}: {self.from_status} -> {self.to_status} ({self.operation_type})"


SAFE_TRACKING_URL_SCHEMES = ("http", "https")


def validate_tracking_url(value: str) -> None:
    """
    Validate that tracking URLs use only safe schemes (http or https).
    Rejects dangerous schemes like javascript:, data:, file:, etc.
    """
    if not value:
        return
    trimmed = value.strip()
    parsed = urlparse(trimmed)
    if parsed.scheme.lower() not in SAFE_TRACKING_URL_SCHEMES:
        raise ValidationError(
            f"Invalid tracking URL scheme '{parsed.scheme}'. Only HTTP and HTTPS URLs are permitted."
        )
    if not parsed.netloc:
        raise ValidationError("Invalid tracking URL: missing host or domain.")


class Shipment(models.Model):
    """
    Authoritative order shipment record for Closet by Chilli atelier and fulfillment.
    Tracks carrier, tracking credentials, dispatch lifecycle, and delivery verification.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        READY_TO_SHIP = "READY_TO_SHIP", "Ready to Ship"
        SHIPPED = "SHIPPED", "Shipped"
        IN_TRANSIT = "IN_TRANSIT", "In Transit"
        OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", "Out for Delivery"
        DELIVERED = "DELIVERED", "Delivered"
        FAILED = "FAILED", "Failed"
        RETURNED = "RETURNED", "Returned"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="shipments",
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    carrier = models.CharField(max_length=100, blank=True, default="")
    tracking_number = models.CharField(max_length=100, blank=True, default="", db_index=True)
    tracking_url = models.CharField(
        max_length=500,
        blank=True,
        default="",
        validators=[validate_tracking_url],
    )
    internal_note = models.TextField(blank=True, default="")
    dispatched_at = models.DateTimeField(null=True, blank=True, db_index=True)
    dispatched_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dispatched_shipments",
    )
    delivered_at = models.DateTimeField(null=True, blank=True, db_index=True)
    delivered_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="delivered_shipments",
    )
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_shipments",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders_shipments"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["order"],
                condition=~Q(status__in=["FAILED", "RETURNED"]),
                name="uq_order_single_active_shipment",
            ),
        ]
        indexes = [
            models.Index(fields=["order", "status"], name="idx_shipment_order_status"),
            models.Index(fields=["carrier"], name="idx_shipment_carrier"),
            models.Index(fields=["status"], name="idx_shipment_status"),
            models.Index(fields=["created_at"], name="idx_shipment_created"),
        ]

    def clean(self):
        super().clean()
        if self.tracking_url:
            validate_tracking_url(self.tracking_url)
        # Check active shipment constraint in application layer
        if self.order_id and self.status not in (self.Status.FAILED, self.Status.RETURNED):
            existing = Shipment.objects.filter(order_id=self.order_id).exclude(
                status__in=[self.Status.FAILED, self.Status.RETURNED]
            )
            if self.pk:
                existing = existing.exclude(pk=self.pk)
            if existing.exists():
                raise ValidationError({
                    "order": (
                        f"Order {self.order.order_number} already has an active shipment "
                        f"({existing.first().id}). Multiple active shipments per order are not supported."
                    )
                })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Shipment {self.id} for {self.order.order_number} [{self.status}]"


class ShipmentAuditLog(models.Model):
    """
    Durable, append-only audit trail for shipment operations.
    Captures status transitions, dispatch events, carrier tracking changes, and operational notes.
    """

    class EventType(models.TextChoices):
        CREATED = "created", "Shipment Created"
        STATUS_TRANSITION = "status_transition", "Status Transition"
        DISPATCHED = "dispatched", "Shipment Dispatched"
        TRACKING_UPDATED = "tracking_updated", "Tracking Updated"
        IN_TRANSIT = "in_transit", "In Transit"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for Delivery"
        DELIVERED = "delivered", "Shipment Delivered"
        FAILED = "failed", "Delivery Failed"
        RETURNED = "returned", "Shipment Returned"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    from_status = models.CharField(max_length=32, blank=True, default="")
    to_status = models.CharField(max_length=32)
    event_type = models.CharField(
        max_length=64,
        choices=EventType.choices,
        default=EventType.STATUS_TRANSITION,
    )
    actor = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shipment_audit_logs",
    )
    actor_email = models.CharField(max_length=255, blank=True, default="")
    note = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "orders_shipment_audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["shipment", "created_at"], name="idx_shipment_audit_created"),
            models.Index(fields=["event_type"], name="idx_shipment_audit_event"),
        ]

    def __str__(self) -> str:
        return f"{self.shipment_id}: {self.from_status} -> {self.to_status} ({self.event_type})"


class Coupon(models.Model):
    """
    Authoritative promotional and discount coupon model for Closet by Chilli.
    Defines promo codes, fixed/percentage discounts, validity windows,
    subtotal requirements, usage caps, and activation lifecycle.
    """

    class DiscountType(models.TextChoices):
        PERCENTAGE = "PERCENTAGE", "Percentage"
        FIXED_AMOUNT = "FIXED_AMOUNT", "Fixed Amount"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique normalized promotional coupon code (e.g. SUMMER25, WELCOME10).",
    )
    name = models.CharField(
        max_length=150,
        help_text="Human-readable promotional campaign or coupon name.",
    )
    description = models.TextField(
        blank=True,
        default="",
        help_text="Optional internal or customer-facing description of promotional terms.",
    )
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE,
        db_index=True,
    )
    discount_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Discount value: percentage points (e.g. 15.00) or fixed amount (e.g. 500.00).",
    )
    currency = models.CharField(
        max_length=3,
        default="INR",
        help_text="ISO 4217 3-letter currency code for fixed discounts.",
    )
    min_order_subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Minimum order subtotal before discount eligibility is unlocked.",
    )
    max_discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Maximum discount cap applicable to percentage discounts.",
    )
    start_date = models.DateTimeField(
        db_index=True,
        help_text="Start of promotional validity period (UTC).",
    )
    end_date = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="End of promotional validity period (UTC). If omitted, coupon has no expiration.",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Administrative toggle to activate or deactivate coupon redemption.",
    )
    usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Total maximum redemptions across all customers. None implies unlimited.",
    )
    per_customer_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Maximum redemptions permitted per customer account. None implies unlimited.",
    )
    is_first_order_only = models.BooleanField(
        default=False,
        help_text="Flag indicating whether promotion is restricted to first-time buyers.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_coupons",
    )
    updated_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_coupons",
    )

    class Meta:
        db_table = "orders_coupons"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(discount_value__gt=0),
                name="chk_coupon_discount_value_positive",
            ),
            models.CheckConstraint(
                condition=~Q(discount_type="PERCENTAGE") | Q(discount_value__lte=100),
                name="chk_coupon_percentage_max_100",
            ),
            models.CheckConstraint(
                condition=Q(end_date__isnull=True) | Q(end_date__gt=models.F("start_date")),
                name="chk_coupon_end_date_after_start",
            ),
            models.CheckConstraint(
                condition=Q(min_order_subtotal__isnull=True) | Q(min_order_subtotal__gte=0),
                name="chk_coupon_min_order_subtotal_non_negative",
            ),
            models.CheckConstraint(
                condition=Q(max_discount_amount__isnull=True) | Q(max_discount_amount__gte=0),
                name="chk_coupon_max_discount_amount_non_negative",
            ),
            models.CheckConstraint(
                condition=Q(usage_limit__isnull=True) | Q(usage_limit__gt=0),
                name="chk_coupon_usage_limit_positive",
            ),
            models.CheckConstraint(
                condition=Q(per_customer_limit__isnull=True) | Q(per_customer_limit__gt=0),
                name="chk_coupon_per_customer_limit_positive",
            ),
        ]
        indexes = [
            models.Index(fields=["code"], name="idx_coupon_code"),
            models.Index(fields=["is_active", "start_date", "end_date"], name="idx_coupon_active_dates"),
            models.Index(fields=["discount_type"], name="idx_coupon_discount_type"),
            models.Index(fields=["created_at"], name="idx_coupon_created_at"),
        ]

    @property
    def lifecycle_status(self) -> str:
        now = timezone.now()
        if not self.is_active:
            return "INACTIVE"
        if self.end_date and self.end_date < now:
            return "EXPIRED"
        if self.start_date > now:
            return "SCHEDULED"
        return "CURRENTLY_VALID"

    def clean(self):
        super().clean()
        if self.code:
            self.code = self.code.strip().upper()
        if self.discount_value is not None:
            if self.discount_value <= Decimal("0.00"):
                raise ValidationError({"discount_value": "Discount value must be greater than zero."})
            if self.discount_type == self.DiscountType.PERCENTAGE and self.discount_value > Decimal("100.00"):
                raise ValidationError({"discount_value": "Percentage discount cannot exceed 100%."})
        if self.min_order_subtotal is not None and self.min_order_subtotal < Decimal("0.00"):
            raise ValidationError({"min_order_subtotal": "Minimum order subtotal cannot be negative."})
        if self.max_discount_amount is not None and self.max_discount_amount < Decimal("0.00"):
            raise ValidationError({"max_discount_amount": "Maximum discount amount cannot be negative."})
        if self.usage_limit is not None and self.usage_limit < 1:
            raise ValidationError({"usage_limit": "Usage limit must be at least 1."})
        if self.per_customer_limit is not None and self.per_customer_limit < 1:
            raise ValidationError({"per_customer_limit": "Per-customer usage limit must be at least 1."})
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValidationError({"end_date": "End date must be later than start date."})

    def save(self, *args, **kwargs):
        if self.code:
            self.code = self.code.strip().upper()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Coupon {self.code} ({self.name}) [{self.lifecycle_status}]"


class CouponAuditLog(models.Model):
    """
    Immutable audit trail for coupon administrative operations.
    Captures creation, modification, activation, and deactivation.
    """

    class EventType(models.TextChoices):
        CREATED = "CREATED", "Created"
        UPDATED = "UPDATED", "Updated"
        ACTIVATED = "ACTIVATED", "Activated"
        DEACTIVATED = "DEACTIVATED", "Deactivated"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    event_type = models.CharField(
        max_length=32,
        choices=EventType.choices,
        db_index=True,
    )
    actor = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="coupon_audit_logs",
    )
    actor_email = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    metadata = models.JSONField(blank=True, default=dict)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "orders_coupon_audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["coupon", "created_at"], name="idx_coupon_audit_created"),
            models.Index(fields=["event_type"], name="idx_coupon_audit_event"),
        ]

    def __str__(self) -> str:
        return f"{self.event_type} on {self.coupon.code} at {self.created_at}"

