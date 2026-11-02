"""
Closet by Chilli — Catalog Reference Cache and Storefront Invalidation.

Provides:
- In-memory process-local reference caching (LocMemCache) for public category hierarchy
  and collection metadata (TTL ~300 seconds).
- Transactional webhook dispatcher to Next.js /api/revalidate using REVALIDATION_SECRET.
- Strict transaction.on_commit execution so aborted/failed database transactions never
  trigger premature cache invalidations.
"""

import logging
from typing import Any, Callable, List, Optional
from django.conf import settings
from django.core.cache import caches
from django.db import transaction

logger = logging.getLogger(__name__)

CACHE_ALIAS = "reference_cache"
DEFAULT_TTL = 300  # 5 minutes

KEY_CATEGORIES_PREFIX = "catalog:categories:"
KEY_COLLECTIONS_PREFIX = "catalog:collections:"


def get_reference_cache():
    """Returns the dedicated reference_cache, or falls back to default cache."""
    try:
        return caches[CACHE_ALIAS]
    except Exception:
        return caches["default"]


def get_category_cache_key(storefront: Optional[bool] = None) -> str:
    if storefront is True:
        return f"{KEY_CATEGORIES_PREFIX}storefront_true"
    elif storefront is False:
        return f"{KEY_CATEGORIES_PREFIX}storefront_false"
    return f"{KEY_CATEGORIES_PREFIX}all"


def get_collection_cache_key() -> str:
    return f"{KEY_COLLECTIONS_PREFIX}all"


def get_or_set_cached_categories(
    storefront: Optional[bool], fetcher: Callable[[], Any], ttl: int = DEFAULT_TTL
) -> Any:
    """Gets cached serialized category hierarchy or evaluates fetcher and caches."""
    cache = get_reference_cache()
    key = get_category_cache_key(storefront)
    data = cache.get(key)
    if data is not None:
        return data
    data = fetcher()
    cache.set(key, data, ttl)
    return data


def get_or_set_cached_collections(
    fetcher: Callable[[], Any], ttl: int = DEFAULT_TTL
) -> Any:
    """Gets cached serialized collection list or evaluates fetcher and caches."""
    cache = get_reference_cache()
    key = get_collection_cache_key()
    data = cache.get(key)
    if data is not None:
        return data
    data = fetcher()
    cache.set(key, data, ttl)
    return data


def invalidate_reference_cache(
    categories: bool = True, collections: bool = True
) -> None:
    """Invalidates the local in-memory reference cache keys."""
    cache = get_reference_cache()
    if categories:
        for sf in (None, True, False):
            cache.delete(get_category_cache_key(sf))
    if collections:
        cache.delete(get_collection_cache_key())


def dispatch_frontend_revalidation(tags: List[str]) -> bool:
    """
    Dispatches a secure revalidation request to the Next.js frontend /api/revalidate route.
    Safely captures timeouts and network issues so backend workflows are never blocked.
    """
    if not tags:
        return False

    url = getattr(settings, "FRONTEND_REVALIDATE_URL", "")
    secret = getattr(settings, "REVALIDATION_SECRET", "")

    if not url or not secret:
        logger.debug(
            "Frontend revalidation skipped: FRONTEND_REVALIDATE_URL or REVALIDATION_SECRET not configured."
        )
        return False

    import requests

    headers = {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
        "User-Agent": "ClosetByChilli-Backend/1.0",
    }

    payload = {"tags": list(set(tags))}

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=2.5,  # Short timeout to prevent hanging backend requests
        )
        if response.status_code == 200:
            logger.info("Successfully dispatched frontend revalidation for tags: %s", tags)
            return True
        else:
            logger.warning(
                "Frontend revalidation failed: status=%s, response=%s",
                response.status_code,
                response.text[:200],
            )
            return False
    except Exception as exc:
        logger.warning("Frontend revalidation request failed: %s", str(exc))
        return False


def queue_catalog_invalidation(
    tags: Optional[List[str]] = None,
    clear_categories: bool = False,
    clear_collections: bool = False,
) -> None:
    """
    Executes cache invalidation inside transaction.on_commit so invalidation only fires
    when the transaction successfully commits to PostgreSQL.
    """
    tags_to_dispatch = list(tags) if tags else []

    def _execute():
        if clear_categories or clear_collections:
            invalidate_reference_cache(
                categories=clear_categories, collections=clear_collections
            )
        if tags_to_dispatch:
            dispatch_frontend_revalidation(tags_to_dispatch)

    transaction.on_commit(_execute)

