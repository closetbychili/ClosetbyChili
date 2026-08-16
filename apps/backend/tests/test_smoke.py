"""
Closet by Chilli — Backend Smoke Tests

These tests verify that the Django project can initialize correctly.
No business logic is tested here.
"""

import django
from django.test import SimpleTestCase


class DjangoSmokeTest(SimpleTestCase):
    """Verify Django can start and basic infrastructure works."""

    def test_django_is_configured(self):
        """Django settings module loads without errors."""
        from django.conf import settings

        assert settings.ROOT_URLCONF == "config.urls"
        assert settings.DEFAULT_AUTO_FIELD == "django.db.models.BigAutoField"

    def test_django_version(self):
        """Django is importable and has a version."""
        assert django.VERSION[0] >= 5

    def test_rest_framework_installed(self):
        """Django REST Framework is in INSTALLED_APPS."""
        from django.conf import settings

        assert "rest_framework" in settings.INSTALLED_APPS

    def test_debug_is_false_in_testing(self):
        """Testing settings should have DEBUG=False."""
        from django.conf import settings

        assert settings.DEBUG is False

    def test_celery_configured(self):
        """Celery is configured for eager execution in tests."""
        from django.conf import settings

        assert getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False) is True
