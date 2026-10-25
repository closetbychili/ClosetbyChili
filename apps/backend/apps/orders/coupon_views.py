"""
Closet by Chilli — Admin Coupon Views.

Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprint A5.1.
Implements coupon creation, listing, retrieval, partial modification, activation,
and deactivation endpoints with filtering, sorting, pagination, and audit logging.
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import filters, generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminUser
from apps.common.pagination import StandardResultsSetPagination
from apps.orders.coupon_serializers import (
    AdminCouponCreateSerializer,
    AdminCouponDetailSerializer,
    AdminCouponListSerializer,
    AdminCouponUpdateSerializer,
)
from apps.orders.models import Coupon, CouponAuditLog

ALLOWED_COUPON_ORDERING_FIELDS = {
    "created_at",
    "-created_at",
    "updated_at",
    "-updated_at",
    "code",
    "-code",
    "name",
    "-name",
    "discount_value",
    "-discount_value",
    "start_date",
    "-start_date",
    "end_date",
    "-end_date",
}


def resolve_coupon(coupon_id_param: Any) -> Coupon:
    """
    Look up a coupon by UUID with relationships preloaded for detail view and audits.
    """
    if isinstance(coupon_id_param, uuid.UUID):
        coupon_uuid = coupon_id_param
    else:
        cleaned = str(coupon_id_param or "").strip()
        if not cleaned:
            raise NotFound("Coupon not found.")
        try:
            coupon_uuid = uuid.UUID(cleaned)
        except (ValueError, AttributeError):
            raise NotFound(f"Coupon '{cleaned}' not found: invalid UUID.")

    coupon = (
        Coupon.objects.select_related("created_by", "updated_by")
        .prefetch_related(
            "audit_logs__actor",
            "applicable_products",
            "applicable_categories",
            "applicable_collections",
        )
        .filter(id=coupon_uuid)
        .first()
    )
    if not coupon:
        raise NotFound(f"Coupon '{coupon_id_param}' not found.")
    return coupon


class AdminCouponFilterBackend(filters.BaseFilterBackend):
    """
    Filters and sorts coupons for administrative listing.
    Supports search (code, name), active flag, discount type, targeting mode,
    lifecycle state, and deterministic ordering.
    """

    def filter_queryset(self, request: Request, queryset: Any, view: Any) -> Any:
        # 1. Search (code, name)
        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search) | Q(name__icontains=search)
            )

        # 2. Active filter (is_active: 'true'/'false'/'1'/'0')
        is_active_param = request.query_params.get("is_active")
        if is_active_param is not None and is_active_param != "":
            val = is_active_param.strip().lower()
            if val in ("true", "1"):
                queryset = queryset.filter(is_active=True)
            elif val in ("false", "0"):
                queryset = queryset.filter(is_active=False)

        # 3. Discount Type (PERCENTAGE, FIXED_AMOUNT)
        discount_type = (request.query_params.get("discount_type") or "").strip().upper()
        if discount_type:
            if discount_type not in (Coupon.DiscountType.PERCENTAGE, Coupon.DiscountType.FIXED_AMOUNT):
                raise ValidationError({
                    "discount_type": f"Invalid discount type '{discount_type}'. Allowed: PERCENTAGE, FIXED_AMOUNT."
                })
            queryset = queryset.filter(discount_type=discount_type)

        # 4. Targeting Mode (ALL_PRODUCTS, SPECIFIC_PRODUCTS, etc.)
        targeting_mode = (request.query_params.get("targeting_mode") or "").strip().upper()
        if targeting_mode:
            if targeting_mode not in Coupon.TargetingMode.values:
                raise ValidationError({
                    "targeting_mode": f"Invalid targeting mode '{targeting_mode}'. Allowed: {', '.join(Coupon.TargetingMode.values)}."
                })
            queryset = queryset.filter(targeting_mode=targeting_mode)

        # 5. Lifecycle state (scheduled, currently_valid, valid, expired, inactive)
        lifecycle = (request.query_params.get("lifecycle") or request.query_params.get("lifecycle_state") or "").strip().lower()
        if lifecycle:
            now = timezone.now()
            if lifecycle == "inactive":
                queryset = queryset.filter(is_active=False)
            elif lifecycle in ("currently_valid", "valid", "active"):
                queryset = queryset.filter(is_active=True, start_date__lte=now).filter(
                    Q(end_date__isnull=True) | Q(end_date__gte=now)
                )
            elif lifecycle == "scheduled":
                queryset = queryset.filter(is_active=True, start_date__gt=now)
            elif lifecycle == "expired":
                queryset = queryset.filter(is_active=True, end_date__lt=now)
            else:
                raise ValidationError({
                    "lifecycle": f"Invalid lifecycle state '{lifecycle}'. Allowed: scheduled, currently_valid, expired, inactive."
                })

        # 6. Deterministic Ordering
        ordering = (request.query_params.get("ordering") or "-created_at").strip()
        if ordering:
            if ordering not in ALLOWED_COUPON_ORDERING_FIELDS:
                raise ValidationError({
                    "ordering": (
                        f"Invalid ordering field '{ordering}'. Allowed fields: {', '.join(sorted(ALLOWED_COUPON_ORDERING_FIELDS))}."
                    )
                })
            if ordering in ("-id", "id"):
                queryset = queryset.order_by(ordering)
            else:
                queryset = queryset.order_by(ordering, "-id")
        else:
            queryset = queryset.order_by("-created_at", "-id")

        return queryset


class AdminCouponListCreateView(generics.ListCreateAPIView):
    """
    GET /api/v1/admin/coupons/
    POST /api/v1/admin/coupons/

    Administrative coupon listing with multi-field search, status filtering,
    deterministic ordering, pagination, and coupon creation with audit tracking.
    """

    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [AdminCouponFilterBackend]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminCouponCreateSerializer
        return AdminCouponListSerializer

    def get_queryset(self):
        return (
            Coupon.objects.select_related("created_by", "updated_by")
            .prefetch_related(
                "applicable_products",
                "applicable_categories",
                "applicable_collections",
            )
            .all()
        )

    @transaction.atomic
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = AdminCouponCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user if request.user and request.user.is_authenticated else None
        coupon = serializer.save(
            created_by=user,
            updated_by=user,
        )

        # Record audit log
        CouponAuditLog.objects.create(
            coupon=coupon,
            event_type=CouponAuditLog.EventType.CREATED,
            actor=user,
            actor_email=user.email if user else "",
            notes=(
                f"Coupon '{coupon.code}' created with discount {coupon.discount_value} "
                f"({coupon.discount_type}) [Targeting: {coupon.targeting_mode}]."
            ),
            metadata={
                "code": coupon.code,
                "discount_type": coupon.discount_type,
                "discount_value": str(coupon.discount_value),
                "is_active": coupon.is_active,
                "targeting_mode": coupon.targeting_mode,
                "target_summary": coupon.target_summary,
                "applicable_products_count": coupon.applicable_products.count(),
                "applicable_categories_count": coupon.applicable_categories.count(),
                "applicable_collections_count": coupon.applicable_collections.count(),
                "start_date": coupon.start_date.isoformat() if coupon.start_date else None,
                "end_date": coupon.end_date.isoformat() if coupon.end_date else None,
            },
        )

        detail_serializer = AdminCouponDetailSerializer(coupon)
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)


def _json_safe(val: Any) -> Any:
    if isinstance(val, (uuid.UUID, Decimal)):
        return str(val)
    if hasattr(val, "isoformat"):
        return val.isoformat()
    if isinstance(val, (list, tuple, set)):
        return [_json_safe(x) for x in val]
    if isinstance(val, dict):
        return {k: _json_safe(v) for k, v in val.items()}
    return val


class AdminCouponDetailView(APIView):
    """
    GET /api/v1/admin/coupons/<id>/
    PATCH /api/v1/admin/coupons/<id>/

    Inspects or partially modifies a promotional coupon.
    Records an immutable audit trail entry upon update.
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request, pk: str) -> Response:
        coupon = resolve_coupon(pk)
        serializer = AdminCouponDetailSerializer(coupon)
        return Response(serializer.data)

    @transaction.atomic
    def patch(self, request: Request, pk: str) -> Response:
        coupon = resolve_coupon(pk)
        serializer = AdminCouponUpdateSerializer(coupon, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        user = request.user if request.user and request.user.is_authenticated else None
        updated_coupon = serializer.save(updated_by=user)

        # Record audit log
        changed_fields = [k for k in serializer.validated_data.keys() if not k.startswith("_")]
        CouponAuditLog.objects.create(
            coupon=updated_coupon,
            event_type=CouponAuditLog.EventType.UPDATED,
            actor=user,
            actor_email=user.email if user else "",
            notes=f"Coupon '{updated_coupon.code}' modified fields: {', '.join(changed_fields)}.",
            metadata={
                "changed_fields": changed_fields,
                "targeting_mode": updated_coupon.targeting_mode,
                "target_summary": updated_coupon.target_summary,
                "applicable_products_count": updated_coupon.applicable_products.count(),
                "applicable_categories_count": updated_coupon.applicable_categories.count(),
                "applicable_collections_count": updated_coupon.applicable_collections.count(),
                "updated_values": {
                    k: _json_safe(v)
                    for k, v in serializer.validated_data.items()
                    if not k.startswith("_")
                },
            },
        )

        detail_serializer = AdminCouponDetailSerializer(updated_coupon)
        return Response(detail_serializer.data)


class AdminCouponActivateView(APIView):
    """
    POST /api/v1/admin/coupons/<id>/activate/

    Explicit, auditable activation of a promotional coupon.
    """

    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request: Request, pk: str) -> Response:
        coupon = resolve_coupon(pk)
        user = request.user if request.user and request.user.is_authenticated else None

        if not coupon.is_active:
            coupon.is_active = True
            coupon.updated_by = user
            coupon.save()

            CouponAuditLog.objects.create(
                coupon=coupon,
                event_type=CouponAuditLog.EventType.ACTIVATED,
                actor=user,
                actor_email=user.email if user else "",
                notes=f"Coupon '{coupon.code}' activated by admin.",
            )

        detail_serializer = AdminCouponDetailSerializer(coupon)
        return Response(detail_serializer.data, status=status.HTTP_200_OK)


class AdminCouponDeactivateView(APIView):
    """
    POST /api/v1/admin/coupons/<id>/deactivate/

    Explicit, auditable deactivation of a promotional coupon.
    Prevents any future redemption.
    """

    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request: Request, pk: str) -> Response:
        coupon = resolve_coupon(pk)
        user = request.user if request.user and request.user.is_authenticated else None

        if coupon.is_active:
            coupon.is_active = False
            coupon.updated_by = user
            coupon.save()

            CouponAuditLog.objects.create(
                coupon=coupon,
                event_type=CouponAuditLog.EventType.DEACTIVATED,
                actor=user,
                actor_email=user.email if user else "",
                notes=f"Coupon '{coupon.code}' deactivated by admin.",
            )

        detail_serializer = AdminCouponDetailSerializer(coupon)
        return Response(detail_serializer.data, status=status.HTTP_200_OK)
