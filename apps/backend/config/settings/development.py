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
    for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")
    if h.strip()
]
for _dev_host in ["localhost", "127.0.0.1", "testserver"]:
    if _dev_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_dev_host)

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

# ============================================================
# Safe Cache & Celery Fallback for Local Development
# ============================================================
# If REDIS_URL is not provided or if local Redis is unreachable on localhost:6379,
# safely fall back to in-memory LocMemCache and eager Celery execution to avoid
# blocking local developer workflows.
_redis_available = False
_dev_redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
try:
    import socket
    import urllib.parse
    parsed = urllib.parse.urlparse(_dev_redis_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 6379
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(0.5)
    result = sock.connect_ex((host, port))
    sock.close()
    if result == 0:
        _redis_available = True
except Exception:
    _redis_available = False

if not _redis_available and not os.environ.get("FORCE_REDIS"):
    import warnings
    warnings.warn(
        f"Redis is unavailable at {_dev_redis_url}. "
        "Falling back to LocMemCache and eager Celery tasks for local development.",
        RuntimeWarning,
    )
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "closet-by-chilli-dev-cache",
        }
    }
    CELERY_TASK_ALWAYS_EAGER = True
