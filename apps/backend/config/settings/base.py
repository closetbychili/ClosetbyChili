"""
Closet by Chilli — Base Django Settings

This module contains settings shared across all environments.
Environment-specific settings override these in their respective modules.

Security defaults:
- DEBUG is False unless explicitly overridden
- SECRET_KEY must be provided via environment variable
- No credentials are hardcoded
"""

import os
from pathlib import Path

# ============================================================
# Paths
# ============================================================
# BASE_DIR points to apps/backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ============================================================
# Security
# ============================================================
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    raise ValueError(
        "DJANGO_SECRET_KEY environment variable is required. "
        "Set it in your .env file or environment."
    )

# DEBUG is False by default. Override in development.py.
DEBUG = False

ALLOWED_HOSTS: list[str] = []

# ============================================================
# Application Definition
# ============================================================
INSTALLED_APPS = [
    # Django built-in
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    # Project apps — Sprint 1
    "apps.catalog",
    "apps.inventory",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ============================================================
# Database — PostgreSQL via Supabase
# ============================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "closet_by_chilli"),
        "USER": os.environ.get("DB_USER", "postgres"),
        "PASSWORD": os.environ.get("DB_PASSWORD", ""),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
        "OPTIONS": {
            "connect_timeout": 10,
        },
    }
}

# ============================================================
# Password Validation
# ============================================================
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",  # noqa: E501
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# ============================================================
# Internationalization
# ============================================================
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ============================================================
# Static Files
# ============================================================
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# ============================================================
# Media Files
# ============================================================
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# ============================================================
# Default Primary Key
# ============================================================
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ============================================================
# Django REST Framework
# ============================================================
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

# ============================================================
# CORS
# ============================================================
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

# ============================================================
# Celery
# ============================================================
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/1")
CELERY_RESULT_BACKEND = os.environ.get(
    "CELERY_RESULT_BACKEND", "redis://localhost:6379/2"
)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"

# ============================================================
# Cache — Redis
# ============================================================
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
    }
}
