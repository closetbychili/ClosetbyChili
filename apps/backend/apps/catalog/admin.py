"""Catalog app admin configuration."""

from django.contrib import admin

from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
    ProductVariant,
)

admin.site.register(Category)
admin.site.register(Collection)
admin.site.register(Product)
admin.site.register(ProductCollection)
admin.site.register(ProductVariant)
