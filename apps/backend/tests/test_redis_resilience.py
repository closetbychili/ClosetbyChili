"""
Unit tests for Redis resilience, timeout configurations, and environment-specific fallbacks.
Tests requirements from Phase 3:
- Read Redis configuration from environment variables.
- Avoid indefinite connection waits (connection and socket timeouts configured).
- If Redis is unavailable in development, provide safe fallback.
- Do not silently replace production Redis with LocMemCache.
"""

import os
import unittest
from unittest.mock import patch


class RedisResilienceTest(unittest.TestCase):
    def test_base_settings_redis_timeouts_configured(self):
        """Verify that RedisCache has socket and connect timeouts in base settings."""
        from django.conf import settings

        # In testing settings, default cache is LocMemCache, but let's verify base configuration logic
        from config.settings import base

        cache_config = base.CACHES["default"]
        self.assertEqual(
            cache_config["BACKEND"], "django.core.cache.backends.redis.RedisCache"
        )
        options = cache_config.get("OPTIONS", {})
        self.assertIn("socket_connect_timeout", options)
        self.assertIn("socket_timeout", options)
        self.assertLessEqual(options["socket_connect_timeout"], 5.0)
        self.assertLessEqual(options["socket_timeout"], 5.0)

    def test_development_fallback_when_redis_unavailable(self):
        """Verify development settings fallback to LocMemCache when Redis socket fails."""
        with patch.dict(os.environ, {"REDIS_URL": "redis://127.0.0.1:9999/0"}, clear=False):
            # Importing development settings with an unreachable port should trigger fallback
            import importlib
            import config.settings.development as dev_settings

            importlib.reload(dev_settings)

            self.assertEqual(
                dev_settings.CACHES["default"]["BACKEND"],
                "django.core.cache.backends.locmem.LocMemCache",
            )
            self.assertTrue(dev_settings.CELERY_TASK_ALWAYS_EAGER)

    def test_production_fails_if_redis_url_missing(self):
        """Verify production settings raise ValueError if REDIS_URL is not configured."""
        env_vars = {
            "DJANGO_SECRET_KEY": "valid-production-secret-key-1234567890",
            "DJANGO_ALLOWED_HOSTS": "closetbychilli.com",
            "REDIS_URL": "",
        }
        with patch.dict(os.environ, env_vars, clear=False):
            with self.assertRaises(ValueError) as ctx:
                import importlib
                import config.settings.production as prod_settings

                importlib.reload(prod_settings)
            self.assertIn("REDIS_URL", str(ctx.exception))
            self.assertIn("LocMemCache is forbidden", str(ctx.exception))

