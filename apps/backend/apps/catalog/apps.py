"""Catalog app configuration."""

from django.apps import AppConfig


class CatalogConfig(AppConfig):
    """Configuration for the Catalog domain app."""

    default_auto_field = "django.db.models.UUIDField"
    name = "apps.catalog"
    verbose_name = "Catalog"
