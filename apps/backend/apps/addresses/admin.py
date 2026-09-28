"""Addresses app admin configuration."""

from django.contrib import admin

from apps.addresses.models import Address


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "full_name",
        "city",
        "state",
        "postal_code",
        "address_type",
        "is_default",
        "created_at",
    ]
    list_filter = ["address_type", "is_default", "country"]
    search_fields = ["full_name", "phone", "city", "state", "postal_code", "user__email"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-is_default", "-created_at"]
