import os

# Ensure SECRET_KEY is present for test environment
os.environ.setdefault("DJANGO_SECRET_KEY", "testing-secret-key-12345")

from config.settings.base import *  # noqa: F403

# ============================================================
# Debug — off during testing
# ============================================================
DEBUG = False

# ============================================================
# Allowed Hosts
# ============================================================
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]

# ============================================================
# Password Hashing — fast hashing for tests
# ============================================================
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# ============================================================
# Email — in-memory backend for tests
# ============================================================
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# ============================================================
# Database — use in-memory SQLite for fast, isolated tests
# ============================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# ============================================================
# Cache — local memory for tests
# ============================================================
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# ============================================================
# Celery — run tasks synchronously in tests
# ============================================================
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
