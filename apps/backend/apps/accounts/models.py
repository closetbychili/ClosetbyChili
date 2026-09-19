"""Customer application identity mapped to Supabase Auth."""

import uuid

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
