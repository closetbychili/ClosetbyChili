import os
import re
import uuid

from django.conf import settings
from django.core.files.storage import default_storage
from django.db import models, transaction
from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminUser
from apps.catalog.cloudinary_service import (
    CloudinaryConfigurationError,
    cleanup_orphaned_asset,
    delete_product_media,
    upload_product_media,
)
from apps.catalog.models import (
    Category,
    Collection,
    Product,
    ProductCollection,
    ProductImage,
    ProductVariant,
)
from apps.catalog.serializers import (
    AdminCategorySerializer,
    AdminCollectionProductSerializer,
    AdminCollectionSerializer,
    AdminProductImageSerializer,
    AdminProductListSerializer,
    AdminProductVariantSerializer,
    AdminProductWriteSerializer,
    AdminStockAdjustmentSerializer,
    ProductImageSerializer,
)
from apps.common.pagination import StandardResultsSetPagination
from apps.inventory.models import InventoryItem, InventoryMovement


class AdminProductFilterBackend(filters.BaseFilterBackend):
    """
    Advanced filter backend for administrative product listings.

    Supports:
    - Search: matches name, slug, description, or any variant SKU
    - Category: slug or UUID
    - Collection: slug or UUID
    - Status: publication status (draft, active, archived)
    - Active status: is_active boolean
    """

    def filter_queryset(self, request: Request, queryset, view):
        # 1. Search term across name, slug, description, or variant SKU
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(slug__icontains=search)
                | Q(description__icontains=search)
                | Q(variants__sku__icontains=search)
            ).distinct()

        # 2. Category filter (by slug or UUID)
        category = request.query_params.get("category", "").strip()
        if category and category.lower() != "all":
            try:
                cat_uuid = uuid.UUID(category)
                queryset = queryset.filter(Q(category__id=cat_uuid) | Q(category__slug=category))
            except ValueError:
                queryset = queryset.filter(category__slug=category)

        # 3. Collection filter (by slug or UUID)
        collection = request.query_params.get("collection", "").strip()
        if collection and collection.lower() != "all":
            try:
                col_uuid = uuid.UUID(collection)
                queryset = queryset.filter(
                    Q(collections__id=col_uuid) | Q(collections__slug=collection)
                ).distinct()
            except ValueError:
                queryset = queryset.filter(collections__slug=collection).distinct()

        # 4. Publication Status filter ('draft', 'active', 'archived')
        status_val = request.query_params.get("status", "").strip().lower()
        if status_val and status_val != "all":
            queryset = queryset.filter(status=status_val)

        # 5. Active boolean filter
        is_active = request.query_params.get("is_active", "").strip().lower()
        if is_active in ("true", "1"):
            queryset = queryset.filter(is_active=True)
        elif is_active in ("false", "0"):
            queryset = queryset.filter(is_active=False)

        return queryset


class AdminProductListCreateView(generics.ListCreateAPIView):
    """
    GET /api/v1/admin/products/
    POST /api/v1/admin/products/

    Administrative product listing and creation endpoint (Sprint A2.1 & A2.2).
    Restricted to verified administrators (IsAdminUser).
    List returns paginated catalog with real stock summaries and SKUs.
    Create creates a new Product and safely associates categories and collections.
    """

    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [AdminProductFilterBackend, filters.OrderingFilter]
    ordering_fields = ["name", "created_at", "updated_at", "status"]
    ordering = ["-updated_at"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminProductWriteSerializer
        return AdminProductListSerializer

    def get_queryset(self):
        return (
            Product.objects.all()
            .select_related("category")
            .prefetch_related(
                "collections",
                "variants__inventory",
                "images",
            )
            .distinct()
        )


# Alias for backwards compatibility
AdminProductListView = AdminProductListCreateView


class AdminProductDetailView(generics.RetrieveUpdateAPIView):
    """
    GET /api/v1/admin/products/{id}/
    PUT /api/v1/admin/products/{id}/
    PATCH /api/v1/admin/products/{id}/

    Administrative product retrieve and update endpoint (Sprint A2.2).
    Restricted to verified administrators (IsAdminUser).
    Optimizes related object loading for category, collections, variants, and images.
    """

    permission_classes = [IsAdminUser]
    serializer_class = AdminProductWriteSerializer
    queryset = (
        Product.objects.all()
        .select_related("category")
        .prefetch_related(
            "collections",
            "images",
            "variants__inventory",
        )
    )


class AdminMediaUploadView(APIView):
    """
    POST /api/v1/admin/media/upload/

    Upload product media files directly to Cloudinary.
    Restricted to verified administrators (IsAdminUser).
    Validates file formats (JPEG, PNG, WebP, AVIF, GIF) and file sizes (<5MB).
    """

    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"}
    ALLOWED_MIME_TYPES = {
        "image/jpeg",
        "image/pjpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/gif",
    }

    def post(self, request: Request) -> Response:
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "details": {"file": ["No file was provided for upload."]},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_size = getattr(settings, "CLOUDINARY_MAX_FILE_SIZE", 5 * 1024 * 1024)
        if file_obj.size > max_size:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "details": {
                            "file": [
                                f"File size exceeds maximum allowed limit of {max_size // (1024 * 1024)}MB."
                            ]
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate extension
        _, ext = os.path.splitext(file_obj.name)
        ext_lower = ext.lower()
        if ext_lower not in self.ALLOWED_EXTENSIONS:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "details": {
                            "file": [
                                f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(self.ALLOWED_EXTENSIONS))}"
                            ]
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate MIME type if available
        content_type = getattr(file_obj, "content_type", "")
        if content_type and content_type.lower() not in self.ALLOWED_MIME_TYPES:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "details": {
                            "file": [
                                f"Unsupported MIME type '{content_type}'. Allowed types: {', '.join(sorted(self.ALLOWED_MIME_TYPES))}"
                            ]
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            upload_res = upload_product_media(file_obj)
            return Response(
                {
                    "image_url": upload_res["secure_url"],
                    "secure_url": upload_res["secure_url"],
                    "public_id": upload_res["public_id"],
                    "original_name": file_obj.name,
                    "file_size": file_obj.size,
                    "width": upload_res.get("width"),
                    "height": upload_res.get("height"),
                    "format": upload_res.get("format"),
                    "resource_type": upload_res.get("resource_type"),
                    "bytes": upload_res.get("bytes"),
                },
                status=status.HTTP_201_CREATED,
            )
        except CloudinaryConfigurationError as cfg_err:
            return Response(
                {
                    "error": {
                        "code": "CONFIGURATION_ERROR",
                        "message": str(cfg_err),
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as upload_err:
            return Response(
                {
                    "error": {
                        "code": "UPLOAD_FAILED",
                        "message": f"Cloudinary upload failed: {str(upload_err)}",
                    }
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )


class AdminProductImageListView(APIView):
    """
    GET /api/v1/admin/products/<uuid:product_id>/images/
    POST /api/v1/admin/products/<uuid:product_id>/images/

    Manage gallery images for a specific product.
    Supports:
    - Direct multipart file upload (uploads to Cloudinary & persists ProductImage atomically).
    - JSON payload (with image_url, public_id, alt_text, ordering, is_primary).
    """

    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"}
    ALLOWED_MIME_TYPES = {
        "image/jpeg",
        "image/pjpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/gif",
    }

    def get(self, request: Request, product_id: uuid.UUID) -> Response:
        product = get_object_or_404(Product, pk=product_id)
        images = product.images.all().order_by("ordering", "created_at")
        serializer = ProductImageSerializer(images, many=True)
        return Response(serializer.data)

    def post(self, request: Request, product_id: uuid.UUID) -> Response:
        product = get_object_or_404(Product, pk=product_id)

        file_obj = request.FILES.get("file")
        if file_obj:
            # 1. Validate file size
            max_size = getattr(settings, "CLOUDINARY_MAX_FILE_SIZE", 5 * 1024 * 1024)
            if file_obj.size > max_size:
                return Response(
                    {
                        "error": {
                            "code": "VALIDATION_ERROR",
                            "details": {
                                "file": [
                                    f"File size exceeds maximum allowed limit of {max_size // (1024 * 1024)}MB."
                                ]
                            },
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 2. Validate extension
            _, ext = os.path.splitext(file_obj.name)
            ext_lower = ext.lower()
            if ext_lower not in self.ALLOWED_EXTENSIONS:
                return Response(
                    {
                        "error": {
                            "code": "VALIDATION_ERROR",
                            "details": {
                                "file": [
                                    f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(self.ALLOWED_EXTENSIONS))}"
                                ]
                            },
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 3. Validate MIME type
            content_type = getattr(file_obj, "content_type", "")
            if content_type and content_type.lower() not in self.ALLOWED_MIME_TYPES:
                return Response(
                    {
                        "error": {
                            "code": "VALIDATION_ERROR",
                            "details": {
                                "file": [
                                    f"Unsupported MIME type '{content_type}'. Allowed types: {', '.join(sorted(self.ALLOWED_MIME_TYPES))}"
                                ]
                            },
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 4. Upload to Cloudinary
            try:
                upload_res = upload_product_media(file_obj)
            except CloudinaryConfigurationError as cfg_err:
                return Response(
                    {
                        "error": {
                            "code": "CONFIGURATION_ERROR",
                            "message": str(cfg_err),
                        }
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            except Exception as upload_err:
                return Response(
                    {
                        "error": {
                            "code": "UPLOAD_FAILED",
                            "message": f"Cloudinary upload failed: {str(upload_err)}",
                        }
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            # 5. Persist metadata in DB with atomic transaction
            uploaded_public_id = upload_res.get("public_id")
            try:
                with transaction.atomic():
                    alt_text = request.data.get("alt_text", "")
                    if not alt_text:
                        base_name, _ = os.path.splitext(file_obj.name)
                        alt_text = base_name.replace("_", " ").replace("-", " ").strip()

                    is_primary_raw = request.data.get("is_primary")
                    is_primary = (
                        str(is_primary_raw).lower() in ("true", "1")
                        if is_primary_raw is not None
                        else False
                    )

                    ordering_raw = request.data.get("ordering")
                    ordering = (
                        int(ordering_raw)
                        if ordering_raw is not None and str(ordering_raw).lstrip("-").isdigit()
                        else None
                    )

                    serializer_data = {
                        "product": str(product.id),
                        "image_url": upload_res["secure_url"],
                        "public_id": uploaded_public_id or "",
                        "width": upload_res.get("width"),
                        "height": upload_res.get("height"),
                        "format": upload_res.get("format", ""),
                        "resource_type": upload_res.get("resource_type", "image"),
                        "bytes": upload_res.get("bytes") or file_obj.size,
                        "alt_text": alt_text,
                    }
                    if ordering is not None:
                        serializer_data["ordering"] = ordering
                    if is_primary_raw is not None:
                        serializer_data["is_primary"] = is_primary

                    serializer = AdminProductImageSerializer(data=serializer_data)
                    if not serializer.is_valid():
                        raise ValueError(f"Serializer error: {serializer.errors}")

                    image = serializer.save()
            except Exception as db_err:
                # Cleanup orphaned asset from Cloudinary
                cleanup_orphaned_asset(uploaded_public_id)
                return Response(
                    {
                        "error": {
                            "code": "PERSISTENCE_ERROR",
                            "message": f"Failed to persist image metadata: {str(db_err)}",
                        }
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            return Response(ProductImageSerializer(image).data, status=status.HTTP_201_CREATED)

        # JSON metadata payload path
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        data["product"] = str(product.id)

        serializer = AdminProductImageSerializer(data=data)
        if not serializer.is_valid():
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "details": serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        image = serializer.save()
        return Response(ProductImageSerializer(image).data, status=status.HTTP_201_CREATED)


class AdminProductImageDetailView(APIView):
    """
    PATCH /api/v1/admin/products/<uuid:product_id>/images/<uuid:image_id>/
    DELETE /api/v1/admin/products/<uuid:product_id>/images/<uuid:image_id>/
    """

    permission_classes = [IsAdminUser]

    def patch(self, request: Request, product_id: uuid.UUID, image_id: uuid.UUID) -> Response:
        image = get_object_or_404(ProductImage, pk=image_id, product_id=product_id)
        serializer = AdminProductImageSerializer(image, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "details": serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated = serializer.save()
        return Response(ProductImageSerializer(updated).data)

    def delete(self, request: Request, product_id: uuid.UUID, image_id: uuid.UUID) -> Response:
        image = get_object_or_404(ProductImage, pk=image_id, product_id=product_id)
        public_id = image.public_id
        was_primary = image.is_primary

        with transaction.atomic():
            image.delete()

            # If primary image was deleted, promote first remaining image to primary
            if was_primary:
                remaining = (
                    ProductImage.objects.filter(product_id=product_id)
                    .order_by("ordering", "created_at")
                    .first()
                )
                if remaining:
                    remaining.is_primary = True
                    remaining.save(update_fields=["is_primary"])

        # Coordinated Cloudinary lifecycle:
        # Check if public_id is still referenced by another record before destroying
        if public_id and public_id.strip():
            is_still_referenced = ProductImage.objects.filter(public_id=public_id).exists()
            if not is_still_referenced:
                try:
                    delete_product_media(public_id)
                except Exception as cleanup_err:
                    import logging
                    logging.getLogger(__name__).error(
                        "Cloudinary deletion failed for public_id '%s': %s",
                        public_id,
                        str(cleanup_err),
                    )

        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminProductImageReorderView(APIView):
    """
    POST /api/v1/admin/products/<uuid:product_id>/images/reorder/

    Reorder gallery images. Accepts:
    - { "image_ids": ["uuid-1", "uuid-2", ...] }
    - { "images": [ { "id": "uuid-1", "ordering": 0 }, ... ] }
    """

    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request: Request, product_id: uuid.UUID) -> Response:
        product = get_object_or_404(Product, pk=product_id)

        image_ids = request.data.get("image_ids")
        if not image_ids and "images" in request.data:
            images_data = request.data.get("images")
            if isinstance(images_data, list):
                if len(images_data) > 0 and isinstance(images_data[0], dict):
                    sorted_items = sorted(
                        images_data, key=lambda x: x.get("ordering", 0)
                    )
                    image_ids = [item.get("id") for item in sorted_items if item.get("id")]
                elif len(images_data) > 0 and isinstance(images_data[0], str):
                    image_ids = images_data

        if not isinstance(image_ids, list):
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "details": {"image_ids": ["Expected a list of image IDs."]},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_images = {str(img.id): img for img in product.images.all()}

        # Verify all provided IDs belong to this product
        for img_id in image_ids:
            if str(img_id) not in existing_images:
                return Response(
                    {
                        "error": {
                            "code": "VALIDATION_ERROR",
                            "details": {
                                "image_ids": [
                                    f"Image ID '{img_id}' does not belong to product '{product.id}'."
                                ]
                            },
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Temporary negative ordering offset to avoid unique constraint collisions during swap
        for idx, img_id in enumerate(image_ids):
            img = existing_images.get(str(img_id))
            if img:
                img.ordering = -(idx + 1000)
                img.save(update_fields=["ordering"])

        # Final ordering
        for idx, img_id in enumerate(image_ids):
            img = existing_images.get(str(img_id))
            if img:
                img.ordering = idx
                img.save(update_fields=["ordering"])

        updated_images = product.images.all().order_by("ordering", "created_at")
        return Response(ProductImageSerializer(updated_images, many=True).data)


class AdminProductVariantListView(APIView):
    """
    GET /api/v1/admin/products/<uuid:product_id>/variants/
    POST /api/v1/admin/products/<uuid:product_id>/variants/
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request, product_id: uuid.UUID) -> Response:
        product = get_object_or_404(Product, pk=product_id)
        variants = product.variants.all().select_related("inventory").order_by("sku")
        serializer = AdminProductVariantSerializer(variants, many=True)
        return Response(serializer.data)

    def post(self, request: Request, product_id: uuid.UUID) -> Response:
        product = get_object_or_404(Product, pk=product_id)
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        data["product"] = str(product.id)

        serializer = AdminProductVariantSerializer(data=data)
        if not serializer.is_valid():
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "details": serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        variant = serializer.save()
        return Response(AdminProductVariantSerializer(variant).data, status=status.HTTP_201_CREATED)


class AdminProductVariantDetailView(APIView):
    """
    PATCH /api/v1/admin/products/<uuid:product_id>/variants/<uuid:variant_id>/
    DELETE /api/v1/admin/products/<uuid:product_id>/variants/<uuid:variant_id>/
    """

    permission_classes = [IsAdminUser]

    def patch(self, request: Request, product_id: uuid.UUID, variant_id: uuid.UUID) -> Response:
        variant = get_object_or_404(ProductVariant, pk=variant_id, product_id=product_id)
        serializer = AdminProductVariantSerializer(variant, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "details": serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated = serializer.save()
        return Response(AdminProductVariantSerializer(updated).data)

    @transaction.atomic
    def delete(self, request: Request, product_id: uuid.UUID, variant_id: uuid.UUID) -> Response:
        variant = get_object_or_404(ProductVariant, pk=variant_id, product_id=product_id)

        # Check order history
        if variant.order_items.exists():
            variant.is_active = False
            variant.save(update_fields=["is_active"])
            return Response(
                {
                    "message": "Variant has historical order records and has been deactivated to preserve order integrity.",
                    "variant": AdminProductVariantSerializer(variant).data,
                },
                status=status.HTTP_200_OK,
            )

        variant.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminVariantStockAdjustmentView(APIView):
    """
    POST /api/v1/admin/variants/<uuid:variant_id>/stock-adjustment/

    Perform a safe, auditable inventory adjustment on a variant.
    """

    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request: Request, variant_id: uuid.UUID) -> Response:
        variant = get_object_or_404(ProductVariant, pk=variant_id)
        serializer = AdminStockAdjustmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "details": serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        adj_type = serializer.validated_data["adjustment_type"]
        qty = serializer.validated_data["quantity"]
        reason = serializer.validated_data.get("reason", "manual_adjustment")
        reference = serializer.validated_data.get("reference", "")

        # Select for update to lock the inventory item
        item = InventoryItem.objects.select_for_update().filter(variant=variant).first()
        if not item:
            item = InventoryItem.objects.create(
                variant=variant, quantity_available=0, quantity_reserved=0
            )

        current_avail = item.quantity_available
        if adj_type == "set":
            new_avail = qty
            change_delta = new_avail - current_avail
        else:
            change_delta = qty
            new_avail = current_avail + change_delta

        if new_avail < 0:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "details": {
                            "quantity": [
                                f"Adjustment would result in negative available inventory ({new_avail}). Minimum is 0."
                            ]
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.quantity_available = new_avail
        item.save(update_fields=["quantity_available", "updated_at"])

        if change_delta != 0:
            InventoryMovement.objects.create(
                inventory_item=item,
                movement_type=reason,
                quantity_change=change_delta,
                reference=reference or "Admin manual adjustment",
            )

        if new_avail <= 0:
            stock_status = "out_of_stock"
        elif new_avail <= 5:
            stock_status = "low_stock"
        else:
            stock_status = "in_stock"

        return Response(
            {
                "variant_id": str(variant.id),
                "sku": variant.sku,
                "quantity_available": item.quantity_available,
                "quantity_reserved": item.quantity_reserved,
                "stock_status": stock_status,
                "change_delta": change_delta,
                "message": f"Inventory for SKU {variant.sku} adjusted to {new_avail} ({stock_status.replace('_', ' ')}).",
            },
            status=status.HTTP_200_OK,
        )


# ==============================================================================
# Admin Category Management Views (Sprint A2.5)
# ==============================================================================


class AdminCategoryFilterBackend(filters.BaseFilterBackend):
    """
    Advanced filter backend for administrative category listings.

    Supports:
    - search: matches name, slug, or description
    - is_active: 'true' or 'false'
    - parent: 'root' / 'null' (categories with no parent) or parent UUID/slug
    """

    def filter_queryset(self, request: Request, queryset, view):
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(slug__icontains=search)
                | Q(description__icontains=search)
            )

        is_active = request.query_params.get("is_active", "").strip().lower()
        if is_active in ("true", "1"):
            queryset = queryset.filter(is_active=True)
        elif is_active in ("false", "0"):
            queryset = queryset.filter(is_active=False)

        is_visible = request.query_params.get("is_visible_on_storefront", "").strip().lower()
        if is_visible in ("true", "1"):
            queryset = queryset.filter(is_visible_on_storefront=True)
        elif is_visible in ("false", "0"):
            queryset = queryset.filter(is_visible_on_storefront=False)

        parent = request.query_params.get("parent", "").strip()
        if parent:
            if parent.lower() in ("null", "none", "root"):
                queryset = queryset.filter(parent__isnull=True)
            else:
                try:
                    parent_uuid = uuid.UUID(parent)
                    queryset = queryset.filter(parent_id=parent_uuid)
                except ValueError:
                    queryset = queryset.filter(parent__slug=parent)

        return queryset


class AdminCategoryListCreateView(generics.ListCreateAPIView):
    """
    GET /api/v1/admin/categories/
    POST /api/v1/admin/categories/

    Administrative category listing and creation endpoint (Sprint A2.5).
    Annotates each category with product_count without N+1 queries.
    """

    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    serializer_class = AdminCategorySerializer
    filter_backends = [AdminCategoryFilterBackend, filters.OrderingFilter]
    ordering_fields = ["name", "ordering", "created_at", "updated_at", "product_count"]
    ordering = ["ordering", "name"]

    def get_queryset(self):
        return (
            Category.objects.all()
            .annotate(product_count=Count("products", distinct=True))
            .select_related("parent")
            .prefetch_related("children")
        )

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all", "").lower() in ("true", "1"):
            return None
        return super().paginate_queryset(queryset)


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/v1/admin/categories/<uuid:pk>/
    PUT /api/v1/admin/categories/<uuid:pk>/
    PATCH /api/v1/admin/categories/<uuid:pk>/
    DELETE /api/v1/admin/categories/<uuid:pk>/

    Administrative category detail, update, and safe deletion endpoint.
    Safely prevents deletion of categories referenced by products or with subcategories.
    Cleans up associated Cloudinary image asset upon deletion if not shared.
    """

    permission_classes = [IsAdminUser]
    serializer_class = AdminCategorySerializer

    def get_queryset(self):
        return (
            Category.objects.all()
            .annotate(
                product_count=Count("products", distinct=True),
                children_count=Count("children", distinct=True),
            )
            .select_related("parent")
            .prefetch_related("children")
        )

    @transaction.atomic
    def delete(self, request: Request, *args, **kwargs) -> Response:
        category = self.get_object()
        if category.product_count > 0:
            return Response(
                {
                    "error": {
                        "code": "CANNOT_DELETE_REFERENCED_CATEGORY",
                        "message": (
                            f"Category '{category.name}' cannot be deleted because it is referenced "
                            f"by {category.product_count} product(s). Please reassign products or "
                            f"deactivate the category instead."
                        ),
                        "details": {
                            "product_count": category.product_count,
                            "category_id": str(category.id),
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if category.children_count > 0:
            return Response(
                {
                    "error": {
                        "code": "CANNOT_DELETE_PARENT_CATEGORY",
                        "message": (
                            f"Category '{category.name}' cannot be deleted because it has "
                            f"{category.children_count} subcategory/subcategories. Please reassign or "
                            f"delete subcategories first, or deactivate the category."
                        ),
                        "details": {
                            "children_count": category.children_count,
                            "category_id": str(category.id),
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_public_id = category.image_public_id
        category.delete()

        # Coordinated cleanup of Cloudinary asset
        if old_public_id and old_public_id.strip():
            is_still_referenced = (
                Category.objects.filter(image_public_id=old_public_id).exists()
                or ProductImage.objects.filter(public_id=old_public_id).exists()
            )
            if not is_still_referenced:
                try:
                    delete_product_media(old_public_id)
                except Exception:
                    pass

        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCategoryImageUploadView(APIView):
    """
    POST /api/v1/admin/categories/<uuid:pk>/image/
    DELETE /api/v1/admin/categories/<uuid:pk>/image/

    Administrative endpoint to upload, replace, or remove a Category card image (Sprint A2.5 Extension).
    - Multipart file upload directly to Cloudinary folder 'closet-by-chilli/categories'.
    - Validates file format and size (max 10MB).
    - Stores image_url, image_public_id, and image_alt on the Category.
    - Atomically persists metadata; rolls back Cloudinary asset on failure.
    - Handles safe asset replacement and deletion without leaving orphans or deleting shared assets.
    """

    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
    ALLOWED_MIME_TYPES = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
    }

    def post(self, request: Request, pk: uuid.UUID) -> Response:
        category = get_object_or_404(
            Category.objects.annotate(
                product_count=Count("products", distinct=True),
                children_count=Count("children", distinct=True),
            ),
            pk=pk,
        )

        file_obj = request.FILES.get("file")
        if not file_obj:
            # Metadata-only update (e.g. updating alt_text or short_description)
            alt_text = request.data.get("alt_text")
            if alt_text is not None:
                category.image_alt = str(alt_text).strip()
                category.save(update_fields=["image_alt", "updated_at"])
            return Response(AdminCategorySerializer(category).data, status=status.HTTP_200_OK)

        # 1. Validate file size
        if file_obj.size > self.MAX_FILE_SIZE:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "details": {
                            "file": [
                                f"File size ({file_obj.size / (1024 * 1024):.1f}MB) exceeds 10MB limit."
                            ]
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Validate file extension
        _, ext = os.path.splitext(file_obj.name)
        ext = ext.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "details": {
                            "file": [
                                f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(self.ALLOWED_EXTENSIONS))}"
                            ]
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Validate MIME type
        content_type = getattr(file_obj, "content_type", "")
        if content_type and content_type.lower() not in self.ALLOWED_MIME_TYPES:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "details": {
                            "file": [
                                f"Unsupported MIME type '{content_type}'. Allowed types: {', '.join(sorted(self.ALLOWED_MIME_TYPES))}"
                            ]
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Record previous public_id for replacement cleanup
        old_public_id = category.image_public_id

        # 4. Upload to Cloudinary under closet-by-chilli/categories
        folder = getattr(settings, "CLOUDINARY_FOLDER", "closet-by-chilli").rstrip("/") + "/categories"
        try:
            upload_res = upload_product_media(file_obj, folder=folder)
        except CloudinaryConfigurationError as cfg_err:
            return Response(
                {
                    "error": {
                        "code": "CONFIGURATION_ERROR",
                        "message": str(cfg_err),
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as upload_err:
            return Response(
                {
                    "error": {
                        "code": "UPLOAD_FAILED",
                        "message": f"Cloudinary upload failed: {str(upload_err)}",
                    }
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # 5. Persist metadata in DB with atomic transaction
        uploaded_public_id = upload_res.get("public_id")
        try:
            with transaction.atomic():
                alt_text = request.data.get("alt_text", "").strip()
                if not alt_text:
                    base_name, _ = os.path.splitext(file_obj.name)
                    alt_text = base_name.replace("_", " ").replace("-", " ").strip()

                category.image_url = upload_res["secure_url"]
                category.image_public_id = uploaded_public_id or ""
                category.image_alt = alt_text
                category.save(update_fields=["image_url", "image_public_id", "image_alt", "updated_at"])
        except Exception as db_err:
            cleanup_orphaned_asset(uploaded_public_id)
            return Response(
                {
                    "error": {
                        "code": "PERSISTENCE_ERROR",
                        "message": f"Failed to persist category image metadata: {str(db_err)}",
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 6. Safe cleanup of old Cloudinary asset if replaced
        if old_public_id and old_public_id.strip() and old_public_id != uploaded_public_id:
            is_still_referenced = (
                Category.objects.filter(image_public_id=old_public_id).exists()
                or ProductImage.objects.filter(public_id=old_public_id).exists()
            )
            if not is_still_referenced:
                try:
                    delete_product_media(old_public_id)
                except Exception:
                    pass

        return Response(AdminCategorySerializer(category).data, status=status.HTTP_200_OK)

    def delete(self, request: Request, pk: uuid.UUID) -> Response:
        category = get_object_or_404(
            Category.objects.annotate(
                product_count=Count("products", distinct=True),
                children_count=Count("children", distinct=True),
            ),
            pk=pk,
        )

        old_public_id = category.image_public_id

        with transaction.atomic():
            category.image_url = ""
            category.image_public_id = ""
            category.image_alt = ""
            category.save(update_fields=["image_url", "image_public_id", "image_alt", "updated_at"])

        if old_public_id and old_public_id.strip():
            is_still_referenced = (
                Category.objects.filter(image_public_id=old_public_id).exists()
                or ProductImage.objects.filter(public_id=old_public_id).exists()
            )
            if not is_still_referenced:
                try:
                    delete_product_media(old_public_id)
                except Exception:
                    pass

        return Response(AdminCategorySerializer(category).data, status=status.HTTP_200_OK)


# ==============================================================================
# Admin Collection Management Views (Sprint A2.5)
# ==============================================================================


class AdminCollectionFilterBackend(filters.BaseFilterBackend):
    """
    Filter backend for administrative collection listings.

    Supports:
    - search: matches name, slug, or description
    - is_active: 'true' or 'false'
    """

    def filter_queryset(self, request: Request, queryset, view):
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(slug__icontains=search)
                | Q(description__icontains=search)
            )

        is_active = request.query_params.get("is_active", "").strip().lower()
        if is_active in ("true", "1"):
            queryset = queryset.filter(is_active=True)
        elif is_active in ("false", "0"):
            queryset = queryset.filter(is_active=False)

        return queryset


class AdminCollectionListCreateView(generics.ListCreateAPIView):
    """
    GET /api/v1/admin/collections/
    POST /api/v1/admin/collections/

    Administrative collection listing and creation endpoint (Sprint A2.5).
    Annotates each collection with associated product_count.
    """

    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    serializer_class = AdminCollectionSerializer
    filter_backends = [AdminCollectionFilterBackend, filters.OrderingFilter]
    ordering_fields = ["name", "created_at", "updated_at", "product_count"]
    ordering = ["name"]

    def get_queryset(self):
        return Collection.objects.all().annotate(
            product_count=Count("product_collections", distinct=True)
        )

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all", "").lower() in ("true", "1"):
            return None
        return super().paginate_queryset(queryset)


class AdminCollectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/v1/admin/collections/<uuid:pk>/
    PUT /api/v1/admin/collections/<uuid:pk>/
    PATCH /api/v1/admin/collections/<uuid:pk>/
    DELETE /api/v1/admin/collections/<uuid:pk>/

    Administrative collection detail, update, and safe deletion endpoint.
    Safely prevents deletion of collections associated with products.
    """

    permission_classes = [IsAdminUser]
    serializer_class = AdminCollectionSerializer

    def get_queryset(self):
        return Collection.objects.all().annotate(
            product_count=Count("product_collections", distinct=True)
        )

    @transaction.atomic
    def delete(self, request: Request, *args, **kwargs) -> Response:
        collection = self.get_object()
        if collection.product_count > 0:
            return Response(
                {
                    "error": {
                        "code": "CANNOT_DELETE_REFERENCED_COLLECTION",
                        "message": (
                            f"Collection '{collection.name}' cannot be deleted because it is associated "
                            f"with {collection.product_count} product(s). Please remove all products "
                            f"from this collection or deactivate the collection instead."
                        ),
                        "details": {
                            "product_count": collection.product_count,
                            "collection_id": str(collection.id),
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        collection.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCollectionProductsView(APIView):
    """
    GET /api/v1/admin/collections/<uuid:collection_id>/products/
    POST /api/v1/admin/collections/<uuid:collection_id>/products/

    Manage products assigned to a collection (Sprint A2.5).
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request, collection_id: uuid.UUID) -> Response:
        collection = get_object_or_404(Collection, pk=collection_id)
        pcs = (
            ProductCollection.objects.filter(collection=collection)
            .select_related("product")
            .prefetch_related("product__images", "product__variants")
            .order_by("ordering", "created_at")
        )
        serializer = AdminCollectionProductSerializer(pcs, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request: Request, collection_id: uuid.UUID) -> Response:
        collection = get_object_or_404(Collection, pk=collection_id)

        product_id = request.data.get("product_id")
        product_ids = request.data.get("product_ids")
        ordering = request.data.get("ordering")

        if not product_id and not product_ids:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "details": {"product_id": ["product_id or product_ids is required."]},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if product_id:
            product = get_object_or_404(Product, pk=product_id)
            if ordering is None:
                max_order = (
                    ProductCollection.objects.filter(collection=collection).aggregate(
                        m=Max("ordering")
                    )["m"]
                    or 0
                )
                ordering = (
                    max_order + 1
                    if ProductCollection.objects.filter(collection=collection).exists()
                    else 0
                )

            pc, created = ProductCollection.objects.update_or_create(
                product=product,
                collection=collection,
                defaults={"ordering": int(ordering), "is_active": True},
            )
            serializer = AdminCollectionProductSerializer(pc)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

        # Batch assign
        created_pcs = []
        for idx, pid in enumerate(product_ids):
            try:
                prod = Product.objects.get(pk=pid)
                pc, _ = ProductCollection.objects.update_or_create(
                    product=prod,
                    collection=collection,
                    defaults={"ordering": idx, "is_active": True},
                )
                created_pcs.append(pc)
            except Product.DoesNotExist:
                continue

        serializer = AdminCollectionProductSerializer(created_pcs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminCollectionProductDetailView(APIView):
    """
    DELETE /api/v1/admin/collections/<uuid:collection_id>/products/<uuid:product_id>/

    Remove a product from a collection.
    """

    permission_classes = [IsAdminUser]

    @transaction.atomic
    def delete(
        self, request: Request, collection_id: uuid.UUID, product_id: uuid.UUID
    ) -> Response:
        pc = ProductCollection.objects.filter(
            collection_id=collection_id, product_id=product_id
        ).first()
        if not pc:
            return Response(
                {
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Product is not assigned to this collection.",
                    }
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        pc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


