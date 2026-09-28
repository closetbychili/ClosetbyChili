from __future__ import annotations

import re
import uuid

from django.core.exceptions import ValidationError
from django.db import IntegrityError, models, transaction
from django.db.models import Q


class Address(models.Model):
    """Persistent customer address book entry."""

    class AddressType(models.TextChoices):
        HOME = "HOME", "Home"
        OFFICE = "OFFICE", "Office"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="addresses",
    )
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=15)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, default="")
    landmark = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    country = models.CharField(max_length=100, default="India")
    address_type = models.CharField(
        max_length=10,
        choices=AddressType.choices,
        default=AddressType.HOME,
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "addresses"
        ordering = ["-is_default", "-updated_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(is_default=True),
                name="uq_address_user_default",
            )
        ]
        indexes = [
            models.Index(fields=["user", "created_at"], name="idx_address_user_created"),
            models.Index(fields=["user", "is_default"], name="idx_address_user_default"),
            models.Index(fields=["is_default"], name="idx_address_default"),
        ]

    def clean(self):
        super().clean()
        self.full_name = (self.full_name or "").strip()
        self.phone = (self.phone or "").strip()
        self.address_line1 = (self.address_line1 or "").strip()
        self.address_line2 = (self.address_line2 or "").strip()
        self.landmark = (self.landmark or "").strip()
        self.city = (self.city or "").strip()
        self.state = (self.state or "").strip()
        self.postal_code = (self.postal_code or "").strip()
        self.country = (self.country or "").strip()

        if not self.full_name:
            raise ValidationError({"full_name": "Full name is required."})
        if not self.phone:
            raise ValidationError({"phone": "Phone number is required."})
        if not self.address_line1:
            raise ValidationError({"address_line1": "Address line 1 is required."})
        if not self.city:
            raise ValidationError({"city": "City is required."})
        if not self.state:
            raise ValidationError({"state": "State is required."})
        if not self.country:
            raise ValidationError({"country": "Country is required."})

        normalized_phone = re.sub(r"\D", "", self.phone)
        if not re.fullmatch(r"(?:\+91)?[6-9]\d{9}", self.phone.replace(" ", "").replace("-", "")):
            raise ValidationError({"phone": "Enter a valid Indian phone number."})
        if len(normalized_phone) != 10:
            raise ValidationError({"phone": "Phone number must contain 10 digits."})

        if not re.fullmatch(r"[1-9][0-9]{5}", self.postal_code):
            raise ValidationError({"postal_code": "Enter a valid 6-digit Indian postal code."})

        if len(self.country) > 100:
            raise ValidationError({"country": "Country name is too long."})

    @transaction.atomic
    def save(self, *args, **kwargs):
        is_new = self._state.adding or self.pk is None
        has_existing = Address.objects.filter(user=self.user).exists()
        has_default = Address.objects.filter(user=self.user, is_default=True).exists()

        if is_new and self.is_default and has_default:
            raise IntegrityError("A user can only have one default address.")

        if is_new and not has_existing and not self.is_default:
            self.is_default = True

        if is_new and self.is_default and has_existing:
            raise IntegrityError("A user can only have one default address.")

        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)

        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.full_name} - {self.city}"
