"""Customer application identity mapped to Supabase Auth."""

import uuid

from django.core.exceptions import ValidationError
from django.db import models


class User(models.Model):
    """Application-level customer identity; authentication remains in Supabase."""

    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        WHOLESALE_CUSTOMER = "wholesale_customer", "Wholesale Customer"
        STAFF = "staff", "Staff"
        ADMIN = "admin", "Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supabase_user_id = models.UUIDField(unique=True, db_index=True)
    email = models.EmailField(blank=True)
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.CUSTOMER)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_users"
        indexes = [
            models.Index(fields=["supabase_user_id"], name="idx_account_supabase_id"),
            models.Index(fields=["role"], name="idx_account_user_role"),
        ]

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False

    @property
    def is_staff(self) -> bool:
        return bool(self.is_active and self.role in {self.Role.STAFF, self.Role.ADMIN})

    @property
    def is_admin(self) -> bool:
        return bool(self.is_active and self.role == self.Role.ADMIN)

    def __str__(self) -> str:
        return self.email or str(self.supabase_user_id)


class CustomerProfile(models.Model):
    """Commerce profile; contains no authentication secrets."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    display_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_customer_profiles"

    def __str__(self) -> str:
        return self.display_name or f"Profile for {self.user_id}"


class CustomerNote(models.Model):
    """
    Internal-only customer support note written by staff/admins.
    Preserves author attribution and creation timestamp.
    Append-only: records cannot be edited or deleted in administrative workflows.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="support_notes",
        help_text="Customer about whom this internal support note is written.",
    )
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authored_customer_notes",
        help_text="Administrator or staff member who composed this note.",
    )
    body = models.TextField(
        help_text="Body content of the internal customer note.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "accounts_customer_notes"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["customer", "created_at"], name="idx_custnote_cust_created"),
            models.Index(fields=["created_at"], name="idx_custnote_created"),
        ]

    def clean(self):
        super().clean()
        if not self.body or not self.body.strip():
            raise ValidationError({"body": "Note body cannot be empty."})
        if len(self.body.strip()) > 3000:
            raise ValidationError({"body": "Note body cannot exceed 3000 characters."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        author_str = self.author.email if self.author else "System"
        return f"Note on {self.customer_id} by {author_str} at {self.created_at}"

