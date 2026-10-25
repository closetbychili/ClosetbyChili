"""
Closet by Chilli — Product Readiness Validation & Publication Workflows.

Domain Rules:
1. Basic Information (Section: 'basic'):
   - Name: required, non-empty, max length 255.
   - Slug: required, valid slug format, globally unique across products.
   - Category: required, exists, and must be active.
   - is_active: product must not be soft-deleted.

2. Images (Section: 'images'):
   - Product must have at least one gallery image.
   - Product must have a designated primary image (is_primary=True).
   - Primary image must have a valid non-empty URL.
   - All gallery images must have valid non-empty URLs.
   - Warning if images are missing alt text.

3. Variants & Pricing (Section: 'variants'):
   - Product must have at least one active purchasable variant (is_active=True).
   - Each active variant must have a valid, non-empty SKU (<= 100 chars).
   - Variant SKU must be globally unique across all variants in the catalog.
   - Variant retail price must be strictly greater than 0.
   - If sale price is set: 0 <= sale_price < retail_price.
   - Variant combinations (size, color) must be unique within the product.

4. Inventory (Section: 'inventory'):
   - Every active variant must have an associated InventoryItem tracking record.
   - Warning if all variants have 0 available inventory (out of stock).

Publication Lifecycle:
- Draft → Active (requires validate_product_readiness to pass)
- Active → Archived
- Archived → Draft
"""

from decimal import Decimal
import re
from typing import Any, Optional

from django.db import models, transaction

from apps.catalog.models import Category, Product, ProductImage, ProductVariant


SLUG_REGEX = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def validate_product_readiness(
    product: Product,
    name_override: Optional[str] = None,
    slug_override: Optional[str] = None,
    category_id_override: Optional[Any] = None,
    description_override: Optional[str] = None,
    check_uniqueness: bool = True,
) -> dict[str, Any]:
    """
    Evaluates whether a product meets all storefront publication requirements.

    Returns structured validation results with:
    - is_ready: bool (True only if zero blocking errors)
    - can_publish: bool (alias for is_ready)
    - summary: dict with counts
    - errors: list of error objects {code, section, field, message, item_id}
    - warnings: list of warning objects {code, section, field, message, item_id}
    - sections: grouped by 'basic', 'images', 'variants', 'inventory'
    - Backward-compatible keys for existing client code.
    """
    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    # --------------------------------------------------------------------------
    # 1. Basic Information Section
    # --------------------------------------------------------------------------
    name = (name_override if name_override is not None else product.name or "").strip()
    slug = (slug_override if slug_override is not None else product.slug or "").strip().lower()

    if not name:
        errors.append({
            "code": "MISSING_NAME",
            "section": "basic",
            "field": "name",
            "message": "Product name is required before publication.",
            "item_id": None,
        })
    elif len(name) > 255:
        errors.append({
            "code": "NAME_TOO_LONG",
            "section": "basic",
            "field": "name",
            "message": "Product name cannot exceed 255 characters.",
            "item_id": None,
        })

    if not slug:
        errors.append({
            "code": "MISSING_SLUG",
            "section": "basic",
            "field": "slug",
            "message": "Product URL slug is required before publication.",
            "item_id": None,
        })
    elif not SLUG_REGEX.match(slug):
        errors.append({
            "code": "INVALID_SLUG_FORMAT",
            "section": "basic",
            "field": "slug",
            "message": "Slug must contain only lowercase letters, numbers, and hyphens (e.g., 'silk-kurti').",
            "item_id": None,
        })
    else:
        # Check global slug uniqueness excluding this product instance
        if check_uniqueness:
            duplicate_slug_qs = Product.objects.filter(slug=slug)
            if product.pk:
                duplicate_slug_qs = duplicate_slug_qs.exclude(pk=product.pk)
            if duplicate_slug_qs.exists():
                errors.append({
                    "code": "DUPLICATE_SLUG",
                    "section": "basic",
                    "field": "slug",
                    "message": f"Product slug '{slug}' is already in use by another product silhouette.",
                    "item_id": None,
                })

    # Category validation
    category_id = (
        category_id_override if category_id_override is not None else product.category_id
    )
    if not category_id:
        errors.append({
            "code": "MISSING_CATEGORY",
            "section": "basic",
            "field": "category",
            "message": "Category taxonomy must be assigned before publication.",
            "item_id": None,
        })
    else:
        # Check category existence and active status
        category = product.category if product.category_id == category_id else Category.objects.filter(id=category_id).first()
        if not category:
            errors.append({
                "code": "INVALID_CATEGORY",
                "section": "basic",
                "field": "category",
                "message": "The assigned category does not exist in the taxonomy database.",
                "item_id": str(category_id),
            })
        elif not category.is_active:
            errors.append({
                "code": "INACTIVE_CATEGORY",
                "section": "basic",
                "field": "category",
                "message": f"Category '{category.name}' is inactive. Please assign an active category before publishing.",
                "item_id": str(category.id),
            })

    # is_active flag check
    if not product.is_active:
        errors.append({
            "code": "PRODUCT_INACTIVE",
            "section": "basic",
            "field": "is_active",
            "message": "Product is marked inactive (soft-deleted). Please reactivate it before publishing.",
            "item_id": None,
        })

    # --------------------------------------------------------------------------
    # 2. Images Section
    # --------------------------------------------------------------------------
    images = list(product.images.all()) if product.pk else []
    if len(images) == 0:
        errors.append({
            "code": "NO_IMAGES",
            "section": "images",
            "field": "images",
            "message": "Product must have at least one gallery image before publication.",
            "item_id": None,
        })
    else:
        primary_images = [img for img in images if img.is_primary]
        if len(primary_images) == 0:
            errors.append({
                "code": "MISSING_PRIMARY_IMAGE",
                "section": "images",
                "field": "images",
                "message": "Product must have a designated primary image for catalog display.",
                "item_id": None,
            })
        elif len(primary_images) > 1:
            errors.append({
                "code": "MULTIPLE_PRIMARY_IMAGES",
                "section": "images",
                "field": "images",
                "message": "Product has multiple primary images flagged. Exactly one primary image is allowed.",
                "item_id": str(primary_images[0].id),
            })

        # Validate URLs on all images
        for img in images:
            url = (img.image_url or "").strip()
            if not url:
                code = "INVALID_PRIMARY_IMAGE_URL" if img.is_primary else "INVALID_IMAGE_URL"
                msg = "Primary image URL cannot be blank." if img.is_primary else f"Image (order {img.ordering}) URL cannot be blank."
                errors.append({
                    "code": code,
                    "section": "images",
                    "field": "image_url",
                    "message": msg,
                    "item_id": str(img.id),
                })

            if not (img.alt_text or "").strip():
                warnings.append({
                    "code": "MISSING_IMAGE_ALT_TEXT",
                    "section": "images",
                    "field": "alt_text",
                    "message": f"Image (order {img.ordering}) is missing alt text. Providing alt text improves SEO and accessibility.",
                    "item_id": str(img.id),
                })

    # --------------------------------------------------------------------------
    # 3. Variants & Pricing Section
    # --------------------------------------------------------------------------
    variants = list(product.variants.all()) if product.pk else []
    active_variants = [v for v in variants if v.is_active]

    if len(active_variants) == 0:
        errors.append({
            "code": "NO_ACTIVE_VARIANTS",
            "section": "variants",
            "field": "variants",
            "message": "Product must have at least one active purchasable variant before publication.",
            "item_id": None,
        })
    else:
        # Collect active SKUs for batch uniqueness check
        external_skus = set()
        if check_uniqueness:
            skus_to_check = [v.sku.strip().upper() for v in active_variants if (v.sku or "").strip()]
            if skus_to_check:
                external_skus = set(
                    ProductVariant.objects.filter(sku__in=skus_to_check)
                    .exclude(product=product)
                    .values_list("sku", flat=True)
                )

        seen_skus: set[str] = set()
        seen_combinations: set[tuple[str, str]] = set()

        for v in active_variants:
            sku = (v.sku or "").strip().upper()
            if not sku:
                errors.append({
                    "code": "INVALID_SKU",
                    "section": "variants",
                    "field": "sku",
                    "message": "A variant has a blank SKU. All active variants must have a valid SKU.",
                    "item_id": str(v.id),
                })
            else:
                if sku in external_skus:
                    errors.append({
                        "code": "DUPLICATE_SKU",
                        "section": "variants",
                        "field": "sku",
                        "message": f"SKU '{sku}' is already in use by another product in the catalog.",
                        "item_id": str(v.id),
                    })
                if sku in seen_skus:
                    errors.append({
                        "code": "DUPLICATE_SKU_INTERNAL",
                        "section": "variants",
                        "field": "sku",
                        "message": f"SKU '{sku}' is duplicated within this product.",
                        "item_id": str(v.id),
                    })
                seen_skus.add(sku)

            # Retail pricing
            if v.retail_price is None or v.retail_price <= Decimal("0.00"):
                errors.append({
                    "code": "INVALID_RETAIL_PRICE",
                    "section": "variants",
                    "field": "retail_price",
                    "message": f"Variant '{sku or v.id}' must have a regular retail price greater than ₹0.00.",
                    "item_id": str(v.id),
                })

            # Sale pricing
            if v.sale_price is not None:
                if v.sale_price < Decimal("0.00"):
                    errors.append({
                        "code": "NEGATIVE_SALE_PRICE",
                        "section": "variants",
                        "field": "sale_price",
                        "message": f"Variant '{sku or v.id}' sale price cannot be negative.",
                        "item_id": str(v.id),
                    })
                elif v.retail_price is not None and v.sale_price >= v.retail_price:
                    errors.append({
                        "code": "INVALID_SALE_PRICE",
                        "section": "variants",
                        "field": "sale_price",
                        "message": f"Variant '{sku or v.id}' sale price (₹{v.sale_price}) must be strictly lower than regular retail price (₹{v.retail_price}).",
                        "item_id": str(v.id),
                    })

            # Combination uniqueness
            combo_key = (
                (v.size or "").strip().upper(),
                (v.color or "").strip().title(),
            )
            if combo_key != ("", ""):
                if combo_key in seen_combinations:
                    errors.append({
                        "code": "DUPLICATE_VARIANT_COMBINATION",
                        "section": "variants",
                        "field": "variants",
                        "message": f"Duplicate variant combination found with size '{v.size}' and color '{v.color}'.",
                        "item_id": str(v.id),
                    })
                seen_combinations.add(combo_key)

    # --------------------------------------------------------------------------
    # 4. Inventory Section
    # --------------------------------------------------------------------------
    total_available_stock = 0
    from apps.inventory.models import InventoryItem

    for v in active_variants:
        inv = getattr(v, "inventory", None)
        if inv is None and check_uniqueness:
            # Fall back to DB lookup in case relation wasn't prefetched
            inv = InventoryItem.objects.filter(variant=v).first()

        if inv is None:
            errors.append({
                "code": "MISSING_INVENTORY_RECORD",
                "section": "inventory",
                "field": "inventory",
                "message": f"Active variant '{v.sku or v.id}' lacks an inventory tracking ledger record.",
                "item_id": str(v.id),
            })
        else:
            total_available_stock += inv.quantity_available

    if len(active_variants) > 0 and total_available_stock <= 0:
        warnings.append({
            "code": "ALL_VARIANTS_OUT_OF_STOCK",
            "section": "inventory",
            "field": "stock",
            "message": "All variants currently have 0 available inventory. The product will display as 'Out of Stock' to customers upon publication.",
            "item_id": None,
        })

    # --------------------------------------------------------------------------
    # Aggregate and Return Structured Readiness Payload
    # --------------------------------------------------------------------------
    sections: dict[str, dict[str, Any]] = {}
    for sec_name in ["basic", "images", "variants", "inventory"]:
        sec_errors = [e for e in errors if e["section"] == sec_name]
        sec_warnings = [w for w in warnings if w["section"] == sec_name]
        sections[sec_name] = {
            "valid": len(sec_errors) == 0,
            "errors": sec_errors,
            "warnings": sec_warnings,
        }

    is_ready = len(errors) == 0

    # Backwards compatibility fields
    has_name = bool(name)
    has_category = bool(category_id)
    has_active_variants = len(active_variants) > 0
    has_prices = any(v.retail_price and v.retail_price > 0 for v in active_variants)
    has_images = len(images) > 0
    issues = [e["message"] for e in errors]

    return {
        "is_ready": is_ready,
        "can_publish": is_ready,
        "summary": {
            "total_errors": len(errors),
            "total_warnings": len(warnings),
            "can_publish": is_ready,
        },
        "errors": errors,
        "warnings": warnings,
        "sections": sections,
        # Backwards compatibility for existing client consumers
        "is_ready_for_publish": is_ready,
        "has_name": has_name,
        "has_title": has_name,
        "has_category": has_category,
        "has_variants": has_active_variants,
        "has_active_variants": has_active_variants,
        "has_price": has_prices,
        "has_prices": has_prices,
        "has_images": has_images,
        "missing_requirements": issues,
        "issues": issues,
    }


@transaction.atomic
def publish_product(product: Product) -> tuple[bool, Product, dict[str, Any]]:
    """
    Validates and publishes a product silhouette.

    Atomic state transition:
    - Runs validate_product_readiness
    - If valid, sets status=ACTIVE and is_active=True
    - Returns (success, product, validation_result)
    """
    validation_result = validate_product_readiness(product)
    if not validation_result["is_ready"]:
        return False, product, validation_result

    product.status = Product.Status.ACTIVE
    product.is_active = True
    product.save(update_fields=["status", "is_active", "updated_at"])
    return True, product, validation_result


@transaction.atomic
def archive_product(product: Product) -> Product:
    """
    Transitions a product to ARCHIVED status.
    Archived products remain hidden from public catalog endpoints.
    """
    product.status = Product.Status.ARCHIVED
    product.is_active = False
    product.save(update_fields=["status", "is_active", "updated_at"])
    return product


@transaction.atomic
def draft_product(product: Product) -> Product:
    """
    Transitions a product to DRAFT status.
    Draft products remain hidden from public catalog endpoints.
    """
    product.status = Product.Status.DRAFT
    product.is_active = True
    product.save(update_fields=["status", "is_active", "updated_at"])
    return product
