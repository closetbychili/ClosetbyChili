"""
Closet by Chilli — Production Settings

Extends base settings with strict security requirements.
Production must never silently default to DEBUG=True.
"""

import os

from config.settings.base import *  # noqa: F403

# ============================================================
# Debug — NEVER True in production
# ============================================================
DEBUG = False

# ============================================================
# Security Enforcement
# ============================================================
# Verify SECRET_KEY is not the placeholder
if SECRET_KEY == "change-me-to-a-real-secret-key":  # type: ignore[name-defined]  # noqa: F405, S105
    raise ValueError(
        "Production SECRET_KEY must not be the default placeholder. "
        "Set DJANGO_SECRET_KEY to a unique, unpredictable value."
    )

# ============================================================
# Allowed Hosts — must be explicitly configured
# ============================================================
_hosts = os.environ.get("DJANGO_ALLOWED_HOSTS", "")
if not _hosts:
    raise ValueError(
        "DJANGO_ALLOWED_HOSTS must be set in production. "
        "Provide a comma-separated list of allowed hostnames."
    )
ALLOWED_HOSTS = [h.strip() for h in _hosts.split(",") if h.strip()]

# ============================================================
# HTTPS / Security Headers
# ============================================================
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "True").lower() in (
    "true",
    "1",
)
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ============================================================
# CORS — strict in production
# ============================================================
CORS_ALLOW_ALL_ORIGINS = False
