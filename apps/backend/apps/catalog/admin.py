"""Catalog app admin configuration."""

from django.contrib import admin

from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
    ProductImage,
    ProductVariant,
)


class ProductImageInline(admin.TabularInline):
    """Inline editor for ProductImage entries on the Product admin page."""

    model = ProductImage
    extra = 1
    fields = ["image_url", "alt_text", "ordering", "is_primary"]
    ordering = ["ordering"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Product admin with inline image management."""

    inlines = [ProductImageInline]
    list_display = ["name", "slug", "status", "is_active", "created_at"]
    list_filter = ["status", "is_active", "category"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


admin.site.register(Category)
admin.site.register(Collection)
admin.site.register(ProductCollection)
admin.site.register(ProductVariant)
admin.site.register(ProductImage)
