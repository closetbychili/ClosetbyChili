"""Inventory app configuration."""

from django.apps import AppConfig


class InventoryConfig(AppConfig):
    """Configuration for the Inventory domain app."""

    default_auto_field = "django.db.models.UUIDField"
    name = "apps.inventory"
    verbose_name = "Inventory"
