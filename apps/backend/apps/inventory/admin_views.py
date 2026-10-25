"""
Closet by Chilli — Admin Inventory Views.

Implements secure, paginated inventory overview and summary KPI endpoints.
Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprint A3.2.
"""

from __future__ import annotations

import uuid
from typing import Any

from django.db.models import F, Max, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminUser
from apps.catalog.models import ProductImage, ProductVariant
from apps.common.pagination import StandardResultsSetPagination
from apps.inventory.models import InventoryItem, InventoryMovement, InventoryReservation
from apps.inventory.serializers import (
    AdminAlertAcknowledgementSerializer,
    AdminInventoryDetailSerializer,
    AdminInventoryItemSerializer,
    AdminInventoryMovementSerializer,
    AdminInventorySummarySerializer,
    AdminStockAdjustmentActionSerializer,
    AdminThresholdUpdateSerializer,
)
from apps.inventory.services import (
    DEFAULT_LOW_STOCK_THRESHOLD,
    acknowledge_variant_alert,
    adjust_variant_stock,
    calculate_variant_stock,
    get_inventory_summary_metrics,
    update_variant_low_stock_threshold,
)


class AdminInventoryFilterBackend(filters.BaseFilterBackend):
    """
    Filter backend for administrative inventory listing.
    Supports:
    - Search: product name or variant SKU
    - stock_status: 'in_stock', 'low_stock', 'out_of_stock'
    - category: category slug or UUID
    - is_active: variant active state ('true', 'false')
    - acknowledged: alert acknowledgement ('true', 'false')
    """

    def filter_queryset(self, request: Request, queryset, view):
        # 1. Search term across product name or variant SKU
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(variant__product__name__icontains=search)
                | Q(variant__sku__icontains=search)
            )

        # 2. Stock status filter ('in_stock', 'low_stock', 'out_of_stock')
        stock_status = request.query_params.get(
            "stock_status", getattr(view, "default_stock_status", "")
        ).strip().lower()
        has_threshold_override = "low_stock_threshold" in request.query_params

        if stock_status and stock_status != "all":
            if stock_status == "out_of_stock":
                queryset = queryset.filter(quantity_available__lte=0)
            elif stock_status == "low_stock":
                if has_threshold_override:
                    queryset = queryset.filter(
                        quantity_available__gt=0, quantity_available__lte=view.low_stock_threshold
                    )
                else:
                    queryset = queryset.filter(
                        quantity_available__gt=0, quantity_available__lte=F("low_stock_threshold")
                    )
            elif stock_status == "in_stock":
                if has_threshold_override:
                    queryset = queryset.filter(quantity_available__gt=view.low_stock_threshold)
                else:
                    queryset = queryset.filter(quantity_available__gt=F("low_stock_threshold"))

        # 3. Alert acknowledgement filter ('true', 'false')
        acknowledged = request.query_params.get("acknowledged", "").strip().lower()
        if acknowledged in ("true", "1"):
            queryset = queryset.filter(is_alert_acknowledged=True)
        elif acknowledged in ("false", "0"):
            queryset = queryset.filter(is_alert_acknowledged=False)

        # 4. Category filter (by slug or UUID)
        category = request.query_params.get("category", "").strip()
        if category and category.lower() != "all":
            try:
                cat_uuid = uuid.UUID(category)
                queryset = queryset.filter(
                    Q(variant__product__category__id=cat_uuid)
                    | Q(variant__product__category__slug=category)
                )
            except ValueError:
                queryset = queryset.filter(variant__product__category__slug=category)

        # 5. Variant is_active boolean filter
        is_active = request.query_params.get("is_active", "").strip().lower()
        if is_active in ("true", "1"):
            queryset = queryset.filter(variant__is_active=True)
        elif is_active in ("false", "0"):
            queryset = queryset.filter(variant__is_active=False)

        return queryset


class AdminInventoryListView(generics.ListAPIView):
    """
    GET /api/v1/admin/inventory/

    Paginated listing of inventory items with authoritative stock calculations,
    variant attributes, persisted product thumbnails, and movement timestamps.
    Restricted to verified administrators.
    """

    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [AdminInventoryFilterBackend]
    serializer_class = AdminInventoryItemSerializer

    @property
    def low_stock_threshold(self) -> int:
        threshold_param = self.request.query_params.get("low_stock_threshold")
        if threshold_param:
            try:
                val = int(threshold_param)
                if val >= 0:
                    return val
            except (ValueError, TypeError):
                pass
        return DEFAULT_LOW_STOCK_THRESHOLD

    def get_serializer_context(self) -> dict[str, Any]:
        context: dict[str, Any] = dict(super().get_serializer_context())
        context["low_stock_threshold"] = self.low_stock_threshold
        return context

    def get_queryset(self):
        # Base optimized queryset with select_related and prefetch_related
        qs = (
            InventoryItem.objects.select_related(
                "variant",
                "variant__product",
                "variant__product__category",
            )
            .prefetch_related(
                Prefetch(
                    "variant__product__images",
                    queryset=ProductImage.objects.order_by(
                        "-is_primary", "ordering", "created_at"
                    ),
                    to_attr="prefetched_images",
                ),
                Prefetch(
                    "reservations",
                    queryset=InventoryReservation.objects.filter(
                        status=InventoryReservation.Status.ACTIVE
                    ),
                    to_attr="active_reservations",
                ),
                Prefetch(
                    "movements",
                    queryset=InventoryMovement.objects.order_by("-created_at"),
                    to_attr="prefetched_movements",
                ),
            )
            .annotate(last_movement_at_annotated=Max("movements__created_at"))
        )

        # Sorting logic
        ordering_param = self.request.query_params.get("ordering", "").strip()
        sort_map = {
            "product": "variant__product__name",
            "-product": "-variant__product__name",
            "name": "variant__product__name",
            "-name": "-variant__product__name",
            "sku": "variant__sku",
            "-sku": "-variant__sku",
            "available": "quantity_available",
            "-available": "-quantity_available",
            "quantity_available": "quantity_available",
            "-quantity_available": "-quantity_available",
            "last_movement": F("last_movement_at_annotated").asc(nulls_last=True),
            "-last_movement": F("last_movement_at_annotated").desc(nulls_last=True),
            "last_movement_at": F("last_movement_at_annotated").asc(nulls_last=True),
            "-last_movement_at": F("last_movement_at_annotated").desc(nulls_last=True),
            "updated_at": "updated_at",
            "-updated_at": "-updated_at",
        }

        if ordering_param in sort_map:
            order_expr = sort_map[ordering_param]
            return qs.order_by(order_expr, "variant__sku")

        # Default ordering: most recently updated first, then SKU
        return qs.order_by("-updated_at", "variant__sku")


class AdminInventorySummaryView(APIView):
    """
    GET /api/v1/admin/inventory/summary/
    GET /api/v1/admin/inventory/metrics/

    Returns aggregated summary metrics for inventory management:
    - active_variants_tracked
    - total_on_hand
    - total_reserved
    - total_available
    - out_of_stock_variants
    - low_stock_variants
    - in_stock_variants
    - low_stock_threshold
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request) -> Response:
        threshold_param = request.query_params.get("low_stock_threshold")
        threshold = None
        if threshold_param:
            try:
                val = int(threshold_param)
                if val >= 0:
                    threshold = val
            except (ValueError, TypeError):
                pass

        category = request.query_params.get("category")
        metrics = get_inventory_summary_metrics(
            low_stock_threshold=threshold,
            category=category,
        )

        serializer = AdminInventorySummarySerializer(metrics)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminInventoryDetailView(APIView):
    """
    GET /api/v1/admin/inventory/<uuid:variant_id>/

    Authoritative detail endpoint for an inventory item by variant ID.
    Returns product info, images, attributes, stock status, on-hand/reserved/available
    quantities, and recent movement history.
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request, variant_id: uuid.UUID) -> Response:
        variant = get_object_or_404(
            ProductVariant.objects.select_related("product__category").prefetch_related(
                Prefetch(
                    "product__images",
                    queryset=ProductImage.objects.order_by("-is_primary", "ordering", "created_at"),
                    to_attr="prefetched_images",
                )
            ),
            pk=variant_id,
        )

        item, _ = InventoryItem.objects.get_or_create(
            variant=variant,
            defaults={"quantity_available": 0, "quantity_reserved": 0},
        )

        threshold_param = request.query_params.get("low_stock_threshold")
        threshold = None
        if threshold_param:
            try:
                val = int(threshold_param)
                if val >= 0:
                    threshold = val
            except (ValueError, TypeError):
                pass

        serializer = AdminInventoryDetailSerializer(
            item, context={"low_stock_threshold": threshold}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminInventoryAdjustView(APIView):
    """
    POST /api/v1/admin/inventory/<uuid:variant_id>/adjust/

    Authoritative stock adjustment action endpoint.
    Performs safe, transactional row-locked increase/decrease, enforces reservation protection,
    prevents negative inventory, and writes append-only movement audit record.
    """

    permission_classes = [IsAdminUser]

    def post(self, request: Request, variant_id: uuid.UUID) -> Response:
        serializer = AdminStockAdjustmentActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        result = adjust_variant_stock(
            variant_id=variant_id,
            adjustment_type=data["adjustment_type"],
            quantity=data["quantity"],
            reason_code=data["reason_code"],
            note=data.get("note", ""),
            actor=request.user,
            idempotency_key=data.get("idempotency_key", ""),
        )

        result["message"] = (
            f"Stock adjusted successfully for SKU {result['sku']} "
            f"({result['stock_status_label']})."
        )
        return Response(result, status=status.HTTP_200_OK)


class AdminInventoryMovementsListView(generics.ListAPIView):
    """
    GET /api/v1/admin/inventory/<uuid:variant_id>/movements/

    Paginated movement history for a specific variant.
    Ordered newest-first, supports filtering by movement_type, reason_code, and is_manual.
    Append-only: Read-only endpoint; never mutates inventory.
    """

    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    serializer_class = AdminInventoryMovementSerializer

    def get_queryset(self):
        variant_id = self.kwargs["variant_id"]
        # Ensure variant exists or return 404
        get_object_or_404(ProductVariant, pk=variant_id)

        qs = (
            InventoryMovement.objects.filter(inventory_item__variant_id=variant_id)
            .select_related("actor", "inventory_item__variant")
        )

        movement_type = self.request.query_params.get("movement_type", "").strip()
        if movement_type and movement_type != "all":
            qs = qs.filter(movement_type=movement_type)

        reason_code = self.request.query_params.get("reason_code", "").strip()
        if reason_code and reason_code != "all":
            qs = qs.filter(reason_code=reason_code)

        is_manual = self.request.query_params.get("is_manual", "").strip().lower()
        if is_manual in ("true", "1"):
            qs = qs.filter(movement_type=InventoryMovement.MovementType.MANUAL_ADJUSTMENT)
        elif is_manual in ("false", "0"):
            qs = qs.exclude(movement_type=InventoryMovement.MovementType.MANUAL_ADJUSTMENT)

        return qs.order_by("-created_at")


class AdminInventoryThresholdUpdateView(APIView):
    """
    PATCH /api/v1/admin/inventory/<uuid:variant_id>/threshold/

    Updates the low-stock alert threshold for a specific variant.
    Requires admin privileges.
    """

    permission_classes = [IsAdminUser]

    def patch(self, request: Request, variant_id: uuid.UUID) -> Response:
        serializer = AdminThresholdUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_threshold = serializer.validated_data["low_stock_threshold"]
        stock_data = update_variant_low_stock_threshold(
            variant_id=variant_id,
            threshold=new_threshold,
        )
        return Response(
            {
                "variant_id": str(variant_id),
                "low_stock_threshold": new_threshold,
                "stock_status": stock_data["stock_status"],
                "stock_status_label": stock_data["stock_status_label"],
                "quantity_available": stock_data["quantity_available"],
                "is_alert_acknowledged": stock_data["is_alert_acknowledged"],
                "message": f"Threshold updated to {new_threshold} successfully.",
            },
            status=status.HTTP_200_OK,
        )


class AdminInventoryAlertAcknowledgeView(APIView):
    """
    POST /api/v1/admin/inventory/<uuid:variant_id>/acknowledge/

    Acknowledges or dismisses an alert for a specific variant.
    Requires admin privileges.
    """

    permission_classes = [IsAdminUser]

    def post(self, request: Request, variant_id: uuid.UUID) -> Response:
        serializer = AdminAlertAcknowledgementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ack = serializer.validated_data["acknowledged"]
        stock_data = acknowledge_variant_alert(
            variant_id=variant_id,
            acknowledged=ack,
        )
        return Response(
            {
                "variant_id": str(variant_id),
                "is_alert_acknowledged": stock_data["is_alert_acknowledged"],
                "alert_acknowledged_at": stock_data["alert_acknowledged_at"],
                "stock_status": stock_data["stock_status"],
                "stock_status_label": stock_data["stock_status_label"],
                "message": "Alert acknowledged successfully." if ack else "Alert unacknowledged.",
            },
            status=status.HTTP_200_OK,
        )


class AdminLowStockAlertsListView(AdminInventoryListView):
    """
    GET /api/v1/admin/inventory/alerts/low-stock/

    Dedicated paginated view for low-stock inventory variants.
    """

    default_stock_status = "low_stock"


class AdminOutOfStockAlertsListView(AdminInventoryListView):
    """
    GET /api/v1/admin/inventory/alerts/out-of-stock/

    Dedicated paginated view for out-of-stock inventory variants.
    """

    default_stock_status = "out_of_stock"


