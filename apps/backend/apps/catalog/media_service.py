"""
Closet by Chilli — Central Media Library Service (Sprint A3.1)

Encapsulates:
- Unified catalog media aggregation across MediaAsset, ProductImage, and Category.
- Direct database-driven usage relationship tracking (products, categories, unassigned).
- Idempotent catalog media synchronization for legacy/seeded items.
- Coordinated Cloudinary lifecycle and protected safe deletion.
"""

import logging
import os
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple

from django.db import transaction
from django.db.models import Q, QuerySet

from apps.catalog.cloudinary_service import delete_product_media
from apps.catalog.models import Category, MediaAsset, ProductImage

logger = logging.getLogger(__name__)


class MediaInUseError(Exception):
    """Raised when an administrator attempts to delete a media asset currently referenced in the catalog."""

    def __init__(self, message: str, products: List[Dict[str, Any]], categories: List[Dict[str, Any]]) -> None:
        super().__init__(message)
        self.products = products
        self.categories = categories


class CloudinaryDeletionFailedError(Exception):
    """Raised when Cloudinary asset destruction fails, signaling that the DB record was preserved."""

    def __init__(self, message: str, retryable: bool = True) -> None:
        super().__init__(message)
        self.retryable = retryable


def sync_catalog_media_assets() -> int:
    """
    Ensure every existing ProductImage and Category image has a corresponding MediaAsset record.
    Idempotent and safe to run whenever needed.
    Returns the count of newly synced media assets.
    """
    existing_pids: Set[str] = set(
        MediaAsset.objects.exclude(public_id="").values_list("public_id", flat=True)
    )
    existing_urls: Set[str] = set(
        MediaAsset.objects.values_list("image_url", flat=True)
    )

    new_assets: List[MediaAsset] = []

    # 1. Sync from ProductImage
    for pi in ProductImage.objects.all().iterator():
        if (pi.public_id and pi.public_id in existing_pids) or (pi.image_url in existing_urls):
            continue

        filename = os.path.basename(pi.image_url) if pi.image_url else (pi.public_id or "image")
        alt = pi.alt_text or filename.split(".")[0].replace("_", " ").replace("-", " ")

        new_assets.append(
            MediaAsset(
                id=uuid.uuid4(),
                image_url=pi.image_url,
                public_id=pi.public_id,
                original_filename=filename,
                alt_text=alt,
                width=pi.width,
                height=pi.height,
                format=pi.format,
                resource_type=pi.resource_type or "image",
                bytes=pi.bytes,
            )
        )
        if pi.public_id:
            existing_pids.add(pi.public_id)
        if pi.image_url:
            existing_urls.add(pi.image_url)

    # 2. Sync from Category
    for cat in Category.objects.exclude(image_url="").iterator():
        if (cat.image_public_id and cat.image_public_id in existing_pids) or (cat.image_url in existing_urls):
            continue

        filename = os.path.basename(cat.image_url) if cat.image_url else (cat.image_public_id or "category_image")
        alt = cat.image_alt or filename.split(".")[0].replace("_", " ").replace("-", " ")

        new_assets.append(
            MediaAsset(
                id=uuid.uuid4(),
                image_url=cat.image_url,
                public_id=cat.image_public_id,
                original_filename=filename,
                alt_text=alt,
                format=filename.split(".")[-1] if "." in filename else "",
                resource_type="image",
            )
        )
        if cat.image_public_id:
            existing_pids.add(cat.image_public_id)
        if cat.image_url:
            existing_urls.add(cat.image_url)

    if new_assets:
        MediaAsset.objects.bulk_create(new_assets, ignore_conflicts=True)

    return len(new_assets)


def register_media_asset(
    image_url: str,
    public_id: str = "",
    original_filename: str = "",
    alt_text: str = "",
    width: Optional[int] = None,
    height: Optional[int] = None,
    format: str = "",
    resource_type: str = "image",
    bytes_size: Optional[int] = None,
) -> MediaAsset:
    """
    Create or update a MediaAsset entry whenever an asset is uploaded or registered.
    """
    clean_url = str(image_url).strip()
    clean_pid = str(public_id).strip() if public_id else ""
    filename = original_filename or (os.path.basename(clean_url) if clean_url else "image")

    if not alt_text:
        base_name, _ = os.path.splitext(filename)
        alt_text = base_name.replace("_", " ").replace("-", " ").strip()

    asset = None
    if clean_pid:
        asset = MediaAsset.objects.filter(public_id=clean_pid).first()
    if not asset and clean_url:
        asset = MediaAsset.objects.filter(image_url=clean_url).first()

    if asset:
        updated = False
        if original_filename and not asset.original_filename:
            asset.original_filename = original_filename
            updated = True
        if width and not asset.width:
            asset.width = width
            updated = True
        if height and not asset.height:
            asset.height = height
            updated = True
        if format and not asset.format:
            asset.format = format
            updated = True
        if bytes_size and not asset.bytes:
            asset.bytes = bytes_size
            updated = True
        if clean_pid and not asset.public_id:
            asset.public_id = clean_pid
            updated = True
        if updated:
            asset.save()
        return asset

    return MediaAsset.objects.create(
        image_url=clean_url,
        public_id=clean_pid,
        original_filename=filename,
        alt_text=alt_text,
        width=width,
        height=height,
        format=format,
        resource_type=resource_type,
        bytes=bytes_size,
    )


def get_asset_usage(asset: MediaAsset) -> Dict[str, Any]:
    """
    Determine the real database usage relationships for an individual media asset.
    """
    pids = [asset.public_id] if asset.public_id else []
    urls = [asset.image_url] if asset.image_url else []

    prod_q = Q()
    if pids:
        prod_q |= Q(public_id__in=pids)
    if urls:
        prod_q |= Q(image_url__in=urls)

    product_images = (
        ProductImage.objects.filter(prod_q)
        .select_related("product")
        .order_by("product__name")
    ) if (pids or urls) else []

    products_map: Dict[str, Dict[str, Any]] = {}
    for pi in product_images:
        p = pi.product
        pid_str = str(p.id)
        if pid_str not in products_map:
            products_map[pid_str] = {
                "id": pid_str,
                "name": p.name,
                "slug": p.slug,
                "status": p.status,
                "is_primary": pi.is_primary,
            }
        elif pi.is_primary:
            products_map[pid_str]["is_primary"] = True

    cat_q = Q()
    if pids:
        cat_q |= Q(image_public_id__in=pids)
    if urls:
        cat_q |= Q(image_url__in=urls)

    categories = (
        Category.objects.filter(cat_q).order_by("name")
    ) if (pids or urls) else []

    categories_list = [
        {"id": str(c.id), "name": c.name, "slug": c.slug}
        for c in categories
    ]

    products_list = list(products_map.values())
    is_product = len(products_list) > 0
    is_category = len(categories_list) > 0

    if is_product and is_category:
        usage_type = "mixed"
    elif is_product:
        usage_type = "product"
    elif is_category:
        usage_type = "category"
    else:
        usage_type = "unassigned"

    return {
        "products": products_list,
        "categories": categories_list,
        "usage_type": usage_type,
        "is_used": is_product or is_category,
    }


def populate_batch_asset_usage(assets: List[MediaAsset]) -> List[Dict[str, Any]]:
    """
    Given a list of MediaAsset models, efficiently annotates and formats them with
    their full usage relationships using bulk lookups (no N+1 queries).
    """
    if not assets:
        return []

    pids: Set[str] = {a.public_id for a in assets if a.public_id}
    urls: Set[str] = {a.image_url for a in assets if a.image_url}

    # Bulk query product images
    prod_q = Q()
    if pids:
        prod_q |= Q(public_id__in=pids)
    if urls:
        prod_q |= Q(image_url__in=urls)

    product_images = (
        ProductImage.objects.filter(prod_q)
        .select_related("product")
    ) if (pids or urls) else []

    # Map product images by public_id and image_url
    pid_to_products: Dict[str, Dict[str, Dict[str, Any]]] = {}
    url_to_products: Dict[str, Dict[str, Dict[str, Any]]] = {}

    for pi in product_images:
        p = pi.product
        p_data = {
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "status": p.status,
            "is_primary": pi.is_primary,
        }
        if pi.public_id:
            pid_to_products.setdefault(pi.public_id, {})
            pid_to_products[pi.public_id][str(p.id)] = p_data
        if pi.image_url:
            url_to_products.setdefault(pi.image_url, {})
            url_to_products[pi.image_url][str(p.id)] = p_data

    # Bulk query categories
    cat_q = Q()
    if pids:
        cat_q |= Q(image_public_id__in=pids)
    if urls:
        cat_q |= Q(image_url__in=urls)

    categories = Category.objects.filter(cat_q) if (pids or urls) else []

    pid_to_categories: Dict[str, List[Dict[str, Any]]] = {}
    url_to_categories: Dict[str, List[Dict[str, Any]]] = {}

    for c in categories:
        c_data = {"id": str(c.id), "name": c.name, "slug": c.slug}
        if c.image_public_id:
            pid_to_categories.setdefault(c.image_public_id, []).append(c_data)
        if c.image_url:
            url_to_categories.setdefault(c.image_url, []).append(c_data)

    results: List[Dict[str, Any]] = []
    for a in assets:
        prods_dict: Dict[str, Dict[str, Any]] = {}
        if a.public_id and a.public_id in pid_to_products:
            prods_dict.update(pid_to_products[a.public_id])
        if a.image_url and a.image_url in url_to_products:
            prods_dict.update(url_to_products[a.image_url])

        cats_seen: Set[str] = set()
        cats_list: List[Dict[str, Any]] = []
        if a.public_id and a.public_id in pid_to_categories:
            for cat_item in pid_to_categories[a.public_id]:
                if cat_item["id"] not in cats_seen:
                    cats_seen.add(cat_item["id"])
                    cats_list.append(cat_item)
        if a.image_url and a.image_url in url_to_categories:
            for cat_item in url_to_categories[a.image_url]:
                if cat_item["id"] not in cats_seen:
                    cats_seen.add(cat_item["id"])
                    cats_list.append(cat_item)

        prods_list = list(prods_dict.values())
        is_prod = len(prods_list) > 0
        is_cat = len(cats_list) > 0

        if is_prod and is_cat:
            usage_type = "mixed"
        elif is_prod:
            usage_type = "product"
        elif is_cat:
            usage_type = "category"
        else:
            usage_type = "unassigned"

        results.append(
            {
                "id": str(a.id),
                "image_url": a.image_url,
                "public_id": a.public_id,
                "original_filename": a.original_filename or (os.path.basename(a.image_url) if a.image_url else ""),
                "alt_text": a.alt_text,
                "width": a.width,
                "height": a.height,
                "format": a.format,
                "resource_type": a.resource_type or "image",
                "bytes": a.bytes,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "updated_at": a.updated_at.isoformat() if a.updated_at else None,
                "products": prods_list,
                "categories": cats_list,
                "usage_type": usage_type,
                "is_used": is_prod or is_cat,
            }
        )

    return results


def update_media_asset_alt_text(asset: MediaAsset, new_alt_text: str) -> MediaAsset:
    """
    Update alt_text on MediaAsset and synchronize across all referencing ProductImage and Category records.
    """
    clean_alt = str(new_alt_text).strip()
    with transaction.atomic():
        asset.alt_text = clean_alt
        asset.save(update_fields=["alt_text", "updated_at"])

        # Synchronize referencing ProductImages
        if asset.public_id:
            ProductImage.objects.filter(public_id=asset.public_id).update(alt_text=clean_alt)
        if asset.image_url:
            ProductImage.objects.filter(image_url=asset.image_url).update(alt_text=clean_alt)

        # Synchronize referencing Categories
        if asset.public_id:
            Category.objects.filter(image_public_id=asset.public_id).update(image_alt=clean_alt)
        if asset.image_url:
            Category.objects.filter(image_url=asset.image_url).update(image_alt=clean_alt)

    return asset


def delete_media_asset_safely(asset: MediaAsset) -> None:
    """
    Safely delete an unassigned media asset:
    - Protects referenced assets with MediaInUseError.
    - Destroys Cloudinary asset if no other DB records share it.
    - If Cloudinary deletion fails, preserves DB record and raises CloudinaryDeletionFailedError.
    - Removes DB record on successful Cloudinary deletion.
    """
    usage = get_asset_usage(asset)
    if usage["is_used"]:
        raise MediaInUseError(
            f"Cannot delete media asset because it is currently used by "
            f"{len(usage['products'])} product(s) and {len(usage['categories'])} category(ies).",
            products=usage["products"],
            categories=usage["categories"],
        )

    # Check if other MediaAssets share this public_id
    has_other_media_asset = False
    if asset.public_id:
        has_other_media_asset = (
            MediaAsset.objects.filter(public_id=asset.public_id)
            .exclude(id=asset.id)
            .exists()
        )

    # Coordinate Cloudinary asset destruction
    if asset.public_id and not has_other_media_asset:
        try:
            delete_product_media(asset.public_id)
        except Exception as exc:
            logger.error(
                "Cloudinary asset deletion failed for '%s': %s",
                asset.public_id,
                str(exc),
                exc_info=True,
            )
            raise CloudinaryDeletionFailedError(
                f"Cloudinary asset destruction failed for '{asset.public_id}'. "
                f"The database record was safely preserved so the operation can be retried.",
                retryable=True,
            ) from exc

    # Clean up the DB record
    asset.delete()
