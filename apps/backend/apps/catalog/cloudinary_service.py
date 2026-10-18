"""
Closet by Chilli — Cloudinary Product Media Service (Sprint A2.4)

Provides production-ready integration with Cloudinary for product catalog media.
Handles secure authenticated uploads, asset destruction, metadata extraction,
and cleanup of orphaned assets.
"""

import logging
from typing import Any, Dict, Optional

from django.conf import settings

logger = logging.getLogger(__name__)


class CloudinaryConfigurationError(Exception):
    """Raised when Cloudinary credentials or configuration are missing or invalid."""
    pass


def is_cloudinary_configured() -> bool:
    """Check if Cloudinary has necessary credentials configured."""
    has_url = bool(getattr(settings, "CLOUDINARY_URL", "").strip())
    has_keys = bool(
        getattr(settings, "CLOUDINARY_CLOUD_NAME", "").strip()
        and getattr(settings, "CLOUDINARY_API_KEY", "").strip()
        and getattr(settings, "CLOUDINARY_API_SECRET", "").strip()
    )
    return has_url or has_keys


def validate_cloudinary_configuration() -> None:
    """
    Validate that Cloudinary credentials are fully configured.
    Raises CloudinaryConfigurationError with clear diagnostic information if missing.
    """
    if not is_cloudinary_configured():
        raise CloudinaryConfigurationError(
            "Cloudinary configuration is missing. "
            "Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET "
            "(or CLOUDINARY_URL) in backend environment settings."
        )


def upload_product_media(
    file_obj: Any,
    folder: Optional[str] = None,
    public_id: Optional[str] = None,
    tags: Optional[list] = None,
) -> Dict[str, Any]:
    """
    Upload a product media file directly to Cloudinary.

    Args:
        file_obj: Uploaded file object or file path / bytes.
        folder: Cloudinary destination folder (defaults to settings.CLOUDINARY_FOLDER).
        public_id: Optional specific public ID handle.
        tags: Optional list of tags to categorize the asset.

    Returns:
        Dict containing public_id, secure_url, format, width, height, bytes, resource_type.
    """
    validate_cloudinary_configuration()

    import cloudinary.uploader

    destination_folder = folder or getattr(
        settings, "CLOUDINARY_FOLDER", "closet-by-chilli/products"
    )

    upload_params: Dict[str, Any] = {
        "folder": destination_folder,
        "resource_type": "image",
        "use_filename": False,
        "unique_filename": True,
        "overwrite": False,
    }

    if public_id:
        upload_params["public_id"] = public_id

    if tags:
        upload_params["tags"] = tags

    try:
        # If file_obj has a seek method (UploadedFile), ensure pointer is at 0
        if hasattr(file_obj, "seek") and callable(file_obj.seek):
            file_obj.seek(0)

        response = cloudinary.uploader.upload(file_obj, **upload_params)

        return {
            "public_id": response.get("public_id"),
            "secure_url": response.get("secure_url"),
            "url": response.get("url"),
            "format": response.get("format", ""),
            "resource_type": response.get("resource_type", "image"),
            "width": response.get("width"),
            "height": response.get("height"),
            "bytes": response.get("bytes"),
            "created_at": response.get("created_at"),
        }
    except Exception as exc:
        logger.error(
            "Cloudinary media upload failed for folder '%s': %s",
            destination_folder,
            str(exc),
            exc_info=True,
        )
        raise


def delete_product_media(public_id: str, resource_type: str = "image") -> Dict[str, Any]:
    """
    Delete a media asset from Cloudinary by its public ID.

    Args:
        public_id: Cloudinary public_id of the asset.
        resource_type: Resource type ('image', 'raw', etc.). Defaults to 'image'.

    Returns:
        Cloudinary deletion API response (e.g. {'result': 'ok'}).
    """
    if not public_id or not public_id.strip():
        return {"result": "not_found"}

    validate_cloudinary_configuration()

    import cloudinary.uploader

    try:
        response = cloudinary.uploader.destroy(
            public_id.strip(),
            resource_type=resource_type,
            invalidate=True,
        )
        logger.info("Deleted Cloudinary asset '%s': %s", public_id, response)
        return response
    except Exception as exc:
        logger.error(
            "Cloudinary asset deletion failed for public_id '%s': %s",
            public_id,
            str(exc),
            exc_info=True,
        )
        raise


def cleanup_orphaned_asset(public_id: Optional[str]) -> None:
    """
    Safely cleanup an uploaded asset from Cloudinary when database persistence fails.
    Does not raise exceptions so it won't mask the underlying DB error.
    """
    if not public_id:
        return

    try:
        logger.warning(
            "Cleaning up orphaned Cloudinary asset '%s' due to failed DB transaction.",
            public_id,
        )
        delete_product_media(public_id)
    except Exception as cleanup_err:
        logger.error(
            "Failed to cleanup orphaned Cloudinary asset '%s': %s",
            public_id,
            str(cleanup_err),
        )
