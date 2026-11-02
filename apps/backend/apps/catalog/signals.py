"""
Signals for Catalog Domain.

Invalidates local in-memory reference cache and dispatches Next.js
storefront cache revalidations via transaction.on_commit.
"""

import logging
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.catalog.cache import queue_catalog_invalidation
from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
    ProductImage,
    ProductVariant,
)

logger = logging.getLogger(__name__)


@receiver([post_save, post_delete], sender=Category)
def on_category_mutation(sender, instance, **kwargs):
    slug = getattr(instance, "slug", "")
    tags = ["catalog", "categories", "homepage"]
    if slug:
        tags.append(f"category-{slug}")
    queue_catalog_invalidation(tags=tags, clear_categories=True)


@receiver([post_save, post_delete], sender=Collection)
def on_collection_mutation(sender, instance, **kwargs):
    slug = getattr(instance, "slug", "")
    tags = ["catalog", "collections", "homepage"]
    if slug:
        tags.append(f"collection-{slug}")
    queue_catalog_invalidation(tags=tags, clear_collections=True)


@receiver([post_save, post_delete], sender=Product)
def on_product_mutation(sender, instance, **kwargs):
    slug = getattr(instance, "slug", "")
    tags = ["catalog", "products", "homepage"]
    if slug:
        tags.append(f"product-{slug}")
    category = getattr(instance, "category", None)
    if category and getattr(category, "slug", None):
        tags.append(f"category-{category.slug}")
    queue_catalog_invalidation(tags=tags)


@receiver([post_save, post_delete], sender=ProductVariant)
def on_product_variant_mutation(sender, instance, **kwargs):
    product = getattr(instance, "product", None)
    if product and getattr(product, "slug", None):
        queue_catalog_invalidation(
            tags=["catalog", "products", f"product-{product.slug}"]
        )


@receiver([post_save, post_delete], sender=ProductImage)
def on_product_image_mutation(sender, instance, **kwargs):
    product = getattr(instance, "product", None)
    if product and getattr(product, "slug", None):
        queue_catalog_invalidation(
            tags=["catalog", "products", f"product-{product.slug}", "homepage"]
        )


@receiver([post_save, post_delete], sender=ProductCollection)
def on_product_collection_mutation(sender, instance, **kwargs):
    tags = ["catalog", "products", "collections", "homepage"]
    product = getattr(instance, "product", None)
    if product and getattr(product, "slug", None):
        tags.append(f"product-{product.slug}")
    collection = getattr(instance, "collection", None)
    if collection and getattr(collection, "slug", None):
        tags.append(f"collection-{collection.slug}")
    queue_catalog_invalidation(tags=tags)

