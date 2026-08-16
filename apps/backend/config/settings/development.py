"""
Closet by Chilli — Development Settings

Extends base settings for local development.
"""

import os

os.environ.setdefault(
    "DJANGO_SECRET_KEY", "django-insecure-development-secret-key-for-local-dev"
)

from config.settings.base import *  # noqa: F403

# ============================================================
# Debug
# ============================================================
DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() in ("true", "1", "yes")

# ============================================================
# Allowed Hosts
# ============================================================
ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]

# ============================================================
# CORS — permissive for local development
# ============================================================
CORS_ALLOW_ALL_ORIGINS = DEBUG

# ============================================================
# Email — console backend for development
# ============================================================
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ============================================================
# DRF — add browsable API in development
# ============================================================
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # type: ignore[name-defined]  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]
