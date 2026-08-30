"""
Closet by Chilli — Catalog & Inventory Seeding Command.

Populates the development database with realistic product categories,
collections, products, variants, and initial inventory levels.

Idempotent: Uses update_or_create keyed on unique slugs and SKUs.
Safe: Development data only.

Usage:
    python manage.py seed_catalog
"""

from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
    ProductVariant,
)
from apps.catalog.seed_data import CATEGORIES, COLLECTIONS, PRODUCTS
from apps.inventory.models import InventoryItem


def run_catalog_seed() -> dict[str, int]:
    """
    Executes idempotent catalog seeding.

    Returns summary counts of processed domain entities.
    """
    counts = {
        "categories": 0,
        "collections": 0,
        "products": 0,
        "variants": 0,
        "inventory_items": 0,
    }

    with transaction.atomic():
        # 1. Seed Categories — First pass: Parents (parent_slug is None)
        category_map: dict[str, Category] = {}
        for name, slug, description, parent_slug in CATEGORIES:
            if parent_slug is None:
                category, _ = Category.objects.update_or_create(
                    slug=slug,
                    defaults={
                        "name": name,
                        "description": description,
                        "parent": None,
                        "is_active": True,
                    },
                )
                category_map[slug] = category
                counts["categories"] += 1

        # Second pass: Child categories
        for name, slug, description, parent_slug in CATEGORIES:
            if parent_slug is not None:
                parent_cat = category_map.get(parent_slug)
                category, _ = Category.objects.update_or_create(
                    slug=slug,
                    defaults={
                        "name": name,
                        "description": description,
                        "parent": parent_cat,
                        "is_active": True,
                    },
                )
                category_map[slug] = category
                counts["categories"] += 1

        # 2. Seed Collections
        collection_map: dict[str, Collection] = {}
        for name, slug, description in COLLECTIONS:
            collection, _ = Collection.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "description": description,
                    "is_active": True,
                },
            )
            collection_map[slug] = collection
            counts["collections"] += 1

        # 3. Seed Products, ProductCollections, Variants, and Inventory
        for p_data in PRODUCTS:
            cat = (
                category_map.get(p_data["category_slug"])
                if p_data.get("category_slug")
                else None
            )
            product, _ = Product.objects.update_or_create(
                slug=p_data["slug"],
                defaults={
                    "name": p_data["name"],
                    "description": p_data["description"],
                    "category": cat,
                    "status": p_data["status"],
                    "is_active": True,
                },
            )
            counts["products"] += 1

            # Merchandising collection memberships
            for idx, col_slug in enumerate(p_data.get("collections", [])):
                col = collection_map.get(col_slug)
                if col:
                    ProductCollection.objects.update_or_create(
                        product=product,
                        collection=col,
                        defaults={
                            "ordering": idx + 1,
                            "is_active": True,
                        },
                    )

            # Product Variants & Inventory Items
            for v_data in p_data.get("variants", []):
                variant, _ = ProductVariant.objects.update_or_create(
                    sku=v_data["sku"],
                    defaults={
                        "product": product,
                        "size": v_data["size"],
                        "color": v_data["color"],
                        "retail_price": v_data["retail_price"],
                        "wholesale_price": v_data.get("wholesale_price"),
                        "is_active": v_data["is_active"],
                    },
                )
                counts["variants"] += 1

                # 1:1 Inventory Item per variant
                InventoryItem.objects.update_or_create(
                    variant=variant,
                    defaults={
                        "quantity_available": v_data.get("inventory_qty", 0),
                        "quantity_reserved": 0,
                    },
                )
                counts["inventory_items"] += 1

    return counts


class Command(BaseCommand):
    """Django management command to seed development catalog and inventory data."""

    help = "Seeds the database with development categories, collections, products, variants, and inventory."

    def handle(self, *args: Any, **options: Any) -> None:
        self.stdout.write(
            self.style.NOTICE("Seeding Closet by Chilli development catalog data...")
        )
        counts = run_catalog_seed()
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded catalog data:\n"
                f"  - Categories:      {counts['categories']}\n"
                f"  - Collections:     {counts['collections']}\n"
                f"  - Products:        {counts['products']}\n"
                f"  - Variants:        {counts['variants']}\n"
                f"  - Inventory Items: {counts['inventory_items']}"
            )
        )
