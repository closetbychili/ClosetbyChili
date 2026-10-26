"""
Closet by Chilli — Coupon Targeting & Rule Evaluation Service.

Complies with 04-backend-architecture.md, 06-domain-model.md, and Sprint A5.2.
Provides an isolated, deterministic, and query-efficient evaluation engine to determine
whether catalog products and variants qualify for coupon promotional targeting rules.
"""

from __future__ import annotations

import uuid
from typing import Any, Iterable

from django.db.models import Q, QuerySet

from apps.catalog.models import Category, Collection, Product, ProductCollection, ProductVariant
from apps.orders.models import Coupon


def _resolve_product_entity(product_or_variant: Any) -> Product | None:
    """Safely extracts a Product model instance from Product, ProductVariant, CartItem, OrderItem, or dict."""
    if product_or_variant is None:
        return None
    if isinstance(product_or_variant, ProductVariant):
        return product_or_variant.product
    if isinstance(product_or_variant, Product):
        return product_or_variant
    if hasattr(product_or_variant, "variant"):
        var = getattr(product_or_variant, "variant")
        if isinstance(var, ProductVariant):
            return var.product
    if hasattr(product_or_variant, "product") and isinstance(product_or_variant.product, Product):
        return product_or_variant.product
    if isinstance(product_or_variant, dict):
        if "product" in product_or_variant and isinstance(product_or_variant["product"], Product):
            return product_or_variant["product"]
        if "variant" in product_or_variant and isinstance(product_or_variant["variant"], ProductVariant):
            return product_or_variant["variant"].product
    return None


def is_product_active_and_published(product: Product) -> bool:
    """
    Checks whether a product is active and in active publication status
    per established catalog business rules.
    """
    if not product or not getattr(product, "is_active", False):
        return False
    return getattr(product, "status", None) == Product.Status.ACTIVE


def product_matches_coupon_target(coupon: Coupon, product_or_variant: Any) -> bool:
    """
    Evaluates whether a given Product or ProductVariant qualifies for a coupon's targeting rules.

    Requirements:
    - Pure service logic independent of HTTP requests.
    - Deterministic evaluation.
    - Handles inactive or unpublished products safely (they never qualify).
    - Union semantics for composite targeting modes.
    - Does NOT silently convert empty or invalid configurations into ALL_PRODUCTS.
    """
    product = _resolve_product_entity(product_or_variant)
    if product is None:
        return False

    # Inactive or unpublished products never match promotional targeting
    if not is_product_active_and_published(product):
        return False

    mode = coupon.targeting_mode

    # ALL_PRODUCTS mode qualifies all otherwise-eligible published products
    if mode == Coupon.TargetingMode.ALL_PRODUCTS:
        return True

    # Check Product targeting match
    matches_product = False
    if mode in (
        Coupon.TargetingMode.SPECIFIC_PRODUCTS,
        Coupon.TargetingMode.PRODUCTS_AND_CATEGORIES,
        Coupon.TargetingMode.PRODUCTS_AND_COLLECTIONS,
        Coupon.TargetingMode.MIXED,
    ):
        matches_product = coupon.applicable_products.filter(
            id=product.id,
            is_active=True,
            status=Product.Status.ACTIVE,
        ).exists()
        if matches_product and mode in (
            Coupon.TargetingMode.SPECIFIC_PRODUCTS,
            Coupon.TargetingMode.PRODUCTS_AND_CATEGORIES,
            Coupon.TargetingMode.PRODUCTS_AND_COLLECTIONS,
            Coupon.TargetingMode.MIXED,
        ):
            if mode == Coupon.TargetingMode.SPECIFIC_PRODUCTS:
                return True
            # For union modes, product match is sufficient to qualify
            return True

    # Check Category targeting match (including active parent categories)
    matches_category = False
    if mode in (
        Coupon.TargetingMode.SPECIFIC_CATEGORIES,
        Coupon.TargetingMode.PRODUCTS_AND_CATEGORIES,
        Coupon.TargetingMode.CATEGORIES_AND_COLLECTIONS,
        Coupon.TargetingMode.MIXED,
    ):
        if product.category_id:
            # Check direct category (must be active)
            cat = getattr(product, "category", None)
            if cat and cat.is_active:
                category_ids_to_check = [cat.id]
                if cat.parent_id and getattr(cat.parent, "is_active", True):
                    category_ids_to_check.append(cat.parent_id)

                matches_category = coupon.applicable_categories.filter(
                    id__in=category_ids_to_check,
                    is_active=True,
                ).exists()

                if matches_category:
                    if mode == Coupon.TargetingMode.SPECIFIC_CATEGORIES:
                        return True
                    # For union modes, category match is sufficient to qualify
                    return True

    # Check Collection targeting match
    matches_collection = False
    if mode in (
        Coupon.TargetingMode.SPECIFIC_COLLECTIONS,
        Coupon.TargetingMode.PRODUCTS_AND_COLLECTIONS,
        Coupon.TargetingMode.CATEGORIES_AND_COLLECTIONS,
        Coupon.TargetingMode.MIXED,
    ):
        # Find active collections linked to this product through active ProductCollection relationships
        active_collection_ids = ProductCollection.objects.filter(
            product=product,
            is_active=True,
            collection__is_active=True,
        ).values_list("collection_id", flat=True)

        if active_collection_ids.exists():
            matches_collection = coupon.applicable_collections.filter(
                id__in=active_collection_ids,
                is_active=True,
            ).exists()

            if matches_collection:
                return True

    # If none of the applicable targeting criteria matched, product does not qualify
    return False


def batch_evaluate_products(
    coupon: Coupon,
    products_or_variants: Iterable[Any],
) -> dict[uuid.UUID, bool]:
    """
    Efficiently evaluates multiple products or variants against a coupon's targeting rules
    with prefetched targets to avoid N+1 queries.
    Returns a mapping of product/variant ID -> bool.
    """
    mode = coupon.targeting_mode

    # If ALL_PRODUCTS, evaluation depends only on active publication
    results: dict[uuid.UUID, bool] = {}
    items = list(products_or_variants)
    if not items:
        return results

    if mode == Coupon.TargetingMode.ALL_PRODUCTS:
        for item in items:
            prod = _resolve_product_entity(item)
            results[item.id] = is_product_active_and_published(prod) if prod else False
        return results

    # Preload coupon targeting IDs into memory sets
    target_product_ids = (
        set(
            coupon.applicable_products.filter(
                is_active=True, status=Product.Status.ACTIVE
            ).values_list("id", flat=True)
        )
        if mode in (
            Coupon.TargetingMode.SPECIFIC_PRODUCTS,
            Coupon.TargetingMode.PRODUCTS_AND_CATEGORIES,
            Coupon.TargetingMode.PRODUCTS_AND_COLLECTIONS,
            Coupon.TargetingMode.MIXED,
        )
        else set()
    )

    target_category_ids = (
        set(
            coupon.applicable_categories.filter(is_active=True).values_list(
                "id", flat=True
            )
        )
        if mode in (
            Coupon.TargetingMode.SPECIFIC_CATEGORIES,
            Coupon.TargetingMode.PRODUCTS_AND_CATEGORIES,
            Coupon.TargetingMode.CATEGORIES_AND_COLLECTIONS,
            Coupon.TargetingMode.MIXED,
        )
        else set()
    )

    target_collection_ids = (
        set(
            coupon.applicable_collections.filter(is_active=True).values_list(
                "id", flat=True
            )
        )
        if mode in (
            Coupon.TargetingMode.SPECIFIC_COLLECTIONS,
            Coupon.TargetingMode.PRODUCTS_AND_COLLECTIONS,
            Coupon.TargetingMode.CATEGORIES_AND_COLLECTIONS,
            Coupon.TargetingMode.MIXED,
        )
        else set()
    )

    # Collect product entities and preload collections
    product_map: dict[uuid.UUID, Product] = {}
    for item in items:
        prod = _resolve_product_entity(item)
        if prod:
            product_map[prod.id] = prod

    # Bulk query active product collections
    prod_to_collections: dict[uuid.UUID, set[uuid.UUID]] = {p_id: set() for p_id in product_map}
    if target_collection_ids and product_map:
        pcs = ProductCollection.objects.filter(
            product_id__in=product_map.keys(),
            collection_id__in=target_collection_ids,
            is_active=True,
            collection__is_active=True,
        ).values_list("product_id", "collection_id")
        for p_id, c_id in pcs:
            prod_to_collections[p_id].add(c_id)

    # Bulk query active categories and their parents
    cat_ids = {p.category_id for p in product_map.values() if p.category_id}
    cats = {c.id: c for c in Category.objects.filter(id__in=cat_ids, is_active=True).select_related("parent")}

    for item in items:
        prod = _resolve_product_entity(item)
        if not prod or not is_product_active_and_published(prod):
            results[item.id] = False
            continue

        matches = False

        # 1. Product check
        if prod.id in target_product_ids:
            matches = True

        # 2. Category check
        if not matches and prod.category_id and prod.category_id in cats:
            cat = cats[prod.category_id]
            if cat.id in target_category_ids:
                matches = True
            elif cat.parent_id and getattr(cat.parent, "is_active", False) and cat.parent_id in target_category_ids:
                matches = True

        # 3. Collection check
        if not matches and prod_to_collections.get(prod.id):
            matches = True

        results[item.id] = matches

    return results


def filter_qualifying_products(coupon: Coupon, queryset: QuerySet[Product]) -> QuerySet[Product]:
    """
    Applies targeting filters at the database level to a Product queryset.
    Ensures single-query evaluation where possible.
    """
    base_qs = queryset.filter(is_active=True, status=Product.Status.ACTIVE)
    mode = coupon.targeting_mode

    if mode == Coupon.TargetingMode.ALL_PRODUCTS:
        return base_qs

    q_filter = Q()

    # Product matching
    if mode in (
        Coupon.TargetingMode.SPECIFIC_PRODUCTS,
        Coupon.TargetingMode.PRODUCTS_AND_CATEGORIES,
        Coupon.TargetingMode.PRODUCTS_AND_COLLECTIONS,
        Coupon.TargetingMode.MIXED,
    ):
        q_filter |= Q(
            id__in=coupon.applicable_products.filter(
                is_active=True, status=Product.Status.ACTIVE
            ).values_list("id", flat=True)
        )

    # Category matching (direct or child of active targeted category)
    if mode in (
        Coupon.TargetingMode.SPECIFIC_CATEGORIES,
        Coupon.TargetingMode.PRODUCTS_AND_CATEGORIES,
        Coupon.TargetingMode.CATEGORIES_AND_COLLECTIONS,
        Coupon.TargetingMode.MIXED,
    ):
        targeted_cat_ids = coupon.applicable_categories.filter(is_active=True).values_list("id", flat=True)
        q_filter |= Q(category__is_active=True) & (
            Q(category_id__in=targeted_cat_ids) | Q(category__parent_id__in=targeted_cat_ids, category__parent__is_active=True)
        )

    # Collection matching
    if mode in (
        Coupon.TargetingMode.SPECIFIC_COLLECTIONS,
        Coupon.TargetingMode.PRODUCTS_AND_COLLECTIONS,
        Coupon.TargetingMode.CATEGORIES_AND_COLLECTIONS,
        Coupon.TargetingMode.MIXED,
    ):
        targeted_col_ids = coupon.applicable_collections.filter(is_active=True).values_list("id", flat=True)
        q_filter |= Q(
            product_collections__is_active=True,
            product_collections__collection__is_active=True,
            product_collections__collection_id__in=targeted_col_ids,
        )

    # If no conditions or empty targets, returns an empty queryset rather than matching all
    if not q_filter:
        return base_qs.none()

    return base_qs.filter(q_filter).distinct()
