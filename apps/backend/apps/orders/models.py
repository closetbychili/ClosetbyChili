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
    coupon = models.ForeignKey(
        "orders.Coupon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        help_text="Applied coupon for this order.",
    )
    coupon_code = models.CharField(
        max_length=50,
        blank=True,
        default="",
        db_index=True,
        help_text="Immutable snapshot of the coupon code applied at checkout.",
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
                first_shipment = existing.first()
                shipment_id = first_shipment.id if first_shipment else ""
                raise ValidationError({
                    "order": (
                        f"Order {self.order.order_number} already has an active shipment "
                        f"({shipment_id}). Multiple active shipments per order are not supported."
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

    class TargetingMode(models.TextChoices):
        ALL_PRODUCTS = "ALL_PRODUCTS", "All Products"
        SPECIFIC_PRODUCTS = "SPECIFIC_PRODUCTS", "Specific Products"
        SPECIFIC_CATEGORIES = "SPECIFIC_CATEGORIES", "Specific Categories"
        SPECIFIC_COLLECTIONS = "SPECIFIC_COLLECTIONS", "Specific Collections"
        PRODUCTS_AND_CATEGORIES = "PRODUCTS_AND_CATEGORIES", "Products and Categories"
        PRODUCTS_AND_COLLECTIONS = "PRODUCTS_AND_COLLECTIONS", "Products and Collections"
        CATEGORIES_AND_COLLECTIONS = "CATEGORIES_AND_COLLECTIONS", "Categories and Collections"
        MIXED = "MIXED", "Mixed (Products, Categories & Collections)"

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
    targeting_mode = models.CharField(
        max_length=32,
        choices=TargetingMode.choices,
        default=TargetingMode.ALL_PRODUCTS,
        db_index=True,
        help_text="Targeting scope determining which catalog products qualify for discount redemption.",
    )
    applicable_products = models.ManyToManyField(
        "catalog.Product",
        related_name="targeted_coupons",
        blank=True,
        help_text="Explicit products eligible for this coupon under product-targeted modes.",
    )
    applicable_categories = models.ManyToManyField(
        "catalog.Category",
        related_name="targeted_coupons",
        blank=True,
        help_text="Explicit categories eligible for this coupon under category-targeted modes.",
    )
    applicable_collections = models.ManyToManyField(
        "catalog.Collection",
        related_name="targeted_coupons",
        blank=True,
        help_text="Explicit merchandising collections eligible for this coupon under collection-targeted modes.",
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
            models.Index(fields=["targeting_mode"], name="idx_coupon_targeting_mode"),
            models.Index(fields=["created_at"], name="idx_coupon_created_at"),
        ]

    @property
    def target_summary(self) -> str:
        if self.targeting_mode == self.TargetingMode.ALL_PRODUCTS:
            return "All Products"
        if not self.pk:
            return str(self.get_targeting_mode_display())
        parts = []
        p_count = self.applicable_products.count()
        c_count = self.applicable_categories.count()
        col_count = self.applicable_collections.count()
        if p_count:
            parts.append(f"{p_count} Product{'s' if p_count != 1 else ''}")
        if c_count:
            parts.append(f"{c_count} Categor{'ies' if c_count != 1 else 'y'}")
        if col_count:
            parts.append(f"{col_count} Collection{'s' if col_count != 1 else ''}")
        return ", ".join(parts) if parts else str(self.get_targeting_mode_display())

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

    @property
    def total_redemptions_count(self) -> int:
        if not self.pk:
            return 0
        return self.redemptions.filter(state="REDEEMED").count()

    @property
    def active_reservations_count(self) -> int:
        if not self.pk:
            return 0
        now = timezone.now()
        return self.redemptions.filter(
            state="RESERVED"
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).count()

    @property
    def remaining_capacity(self) -> int | None:
        if self.usage_limit is None:
            return None
        remaining = self.usage_limit - self.total_redemptions_count
        return max(0, remaining)

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
        if self.targeting_mode and self.targeting_mode not in self.TargetingMode.values:
            raise ValidationError({"targeting_mode": f"Invalid targeting mode '{self.targeting_mode}'."})

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


class CouponRedemption(models.Model):
    """
    Durable record of coupon reservation and redemption lifecycle.
    Tracks state transitions: RESERVED -> REDEEMED (finalized) or RELEASED (abandoned/cancelled).
    Stores discount amount snapshots to preserve historical integrity.
    """

    class State(models.TextChoices):
        RESERVED = "RESERVED", "Reserved"
        REDEEMED = "REDEEMED", "Redeemed"
        RELEASED = "RELEASED", "Released"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.PROTECT,
        related_name="redemptions",
        help_text="The coupon being redeemed.",
    )
    customer = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="coupon_redemptions",
        help_text="Customer account redeeming the coupon.",
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="coupon_redemptions",
        help_text="Associated order once confirmed or finalized.",
    )
    state = models.CharField(
        max_length=20,
        choices=State.choices,
        default=State.RESERVED,
        db_index=True,
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Snapshot of the discount amount applied at finalization.",
    )
    currency = models.CharField(
        max_length=3,
        default="INR",
        help_text="Currency of the discount snapshot.",
    )
    idempotency_key = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        help_text="Unique client/checkout key preventing duplicate redemptions.",
    )
    reserved_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Reservation expiration timestamp (TTL). Expired reservations cease holding capacity.",
    )
    finalized_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when purchase succeeded and redemption finalized.",
    )
    released_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when reservation or redemption was cancelled or released.",
    )
    release_reason = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Optional rationale for release (e.g. checkout expired, payment failed, order cancelled).",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders_coupon_redemptions"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["coupon", "order"],
                condition=Q(order__isnull=False),
                name="uq_coupon_redemption_order",
            ),
            models.UniqueConstraint(
                fields=["customer", "idempotency_key"],
                condition=Q(idempotency_key__isnull=False),
                name="uq_coupon_redemption_customer_idempotency",
            ),
            models.CheckConstraint(
                condition=Q(discount_amount__gte=0),
                name="chk_coupon_redemption_discount_non_negative",
            ),
        ]
        indexes = [
            models.Index(fields=["coupon", "state"], name="idx_redemption_coupon_state"),
            models.Index(fields=["customer", "state"], name="idx_redemption_customer_state"),
            models.Index(fields=["coupon", "customer", "state"], name="idx_redemption_user_state"),
            models.Index(fields=["expires_at"], name="idx_redemption_expires_at"),
            models.Index(fields=["created_at"], name="idx_redemption_created_at"),
        ]

    def is_reservation_active(self, now: timezone.datetime | None = None) -> bool:
        if self.state != self.State.RESERVED:
            return False
        if self.expires_at is None:
            return True
        current_time = now or timezone.now()
        return self.expires_at > current_time

    def __str__(self) -> str:
        return f"Redemption {self.id} for {self.coupon.code} [{self.state}] by User {self.customer_id}"



class OrderNotification(models.Model):
    """
    Durable, append-only record of outgoing order email notifications.
    Acts as an outbox to ensure at-most-once delivery, prevent duplicate emails,
    track retry state, and preserve history for auditing and troubleshooting.
    """

    class EventType(models.TextChoices):
        ORDER_CONFIRMATION = "order_confirmation", "Order Confirmation"
        ORDER_STATUS_CHANGED = "order_status_changed", "Order Status Changed"
        SHIPMENT_DISPATCHED = "shipment_dispatched", "Shipment Dispatched"
        SHIPMENT_TRACKING_UPDATED = "shipment_tracking_updated", "Shipment Tracking Updated"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SENT = "SENT", "Sent"
        FAILED = "FAILED", "Failed"
        SKIPPED = "SKIPPED", "Skipped"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    event_type = models.CharField(
        max_length=50,
        choices=EventType.choices,
        db_index=True,
    )
    idempotency_key = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="Unique key ensuring idempotency per logical business event.",
    )
    recipient_email = models.EmailField(db_index=True)
    recipient_name = models.CharField(max_length=255, blank=True, default="")
    subject = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    resend_email_id = models.CharField(max_length=255, blank=True, default="", db_index=True)
    error_message = models.TextField(blank=True, default="")
    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)
    payload = models.JSONField(
        default=dict,
        blank=True,
        help_text="Context data for email rendering (carrier, tracking, status transitions, etc.).",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders_notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["order", "event_type"], name="idx_notif_order_event"),
            models.Index(fields=["status", "created_at"], name="idx_notif_status_created"),
        ]

    def __str__(self) -> str:
        return f"{self.event_type} for Order {self.order.order_number} to {self.recipient_email} [{self.status}]"
