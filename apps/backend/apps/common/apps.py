"""
Closet by Chilli — Common App Configuration.
"""

from django.apps import AppConfig


class CommonConfig(AppConfig):
    """Configuration for shared API foundation utilities."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.common"
    verbose_name = "Common Foundation"
