"""
Closet by Chilli — Admin Coupon Reports & Analytics Views.

Complies with Sprint A5.5, 04-backend-architecture.md, 18-admin-operations.md, and 35-api-error-response-standards.md.
Implements:
- GET /api/v1/admin/coupons/reports/overview/
- GET /api/v1/admin/coupons/reports/performance/
- GET /api/v1/admin/coupons/reports/redemptions/
All endpoints enforce IsAdminUser authorization in Django.
"""

from __future__ import annotations

from typing import Any

from rest_framework import generics, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminUser
from apps.common.pagination import StandardResultsSetPagination
from apps.orders.coupon_reports_serializers import (
    AdminCouponPerformanceSerializer,
    AdminCouponRedemptionReportSerializer,
    AdminCouponReportOverviewSerializer,
)
from apps.orders.coupon_reports_service import (
    get_coupon_performance_queryset,
    get_coupon_redemptions_report_queryset,
    get_coupon_reports_overview,
    parse_reporting_date_range,
)


class AdminCouponReportOverviewView(APIView):
    """
    GET /api/v1/admin/coupons/reports/overview/

    Provides high-level aggregate promotion metrics across the system:
    - Active & total coupons
    - Finalized, reserved, and released redemption counts
    - Paid order revenue and total discount granted
    - Distinct customer reach
    - Order distributions by status and payment state
    - Capacity and remaining usage allowances
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        start_date, end_date = parse_reporting_date_range(
            request.query_params.get("start_date"),
            request.query_params.get("end_date"),
        )
        data = get_coupon_reports_overview(
            start_date=start_date,
            end_date=end_date,
        )
        serializer = AdminCouponReportOverviewSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminCouponReportPerformanceView(generics.ListAPIView):
    """
    GET /api/v1/admin/coupons/reports/performance/

    Benchmark coupon performance across revenue, discounts, redemption volume, and customer reach.
    Supports filtering by search, is_active, discount_type, lifecycle_status, and date ranges.
    Provides deterministic sorting and pagination.
    """

    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    serializer_class = AdminCouponPerformanceSerializer

    def get_queryset(self):
        start_date, end_date = parse_reporting_date_range(
            self.request.query_params.get("start_date"),
            self.request.query_params.get("end_date"),
        )
        return get_coupon_performance_queryset(
            search=self.request.query_params.get("search"),
            is_active=self.request.query_params.get("is_active"),
            discount_type=self.request.query_params.get("discount_type"),
            lifecycle_status=self.request.query_params.get("lifecycle_status"),
            start_date=start_date,
            end_date=end_date,
            ordering=self.request.query_params.get("ordering"),
        )


class AdminCouponReportRedemptionsView(generics.ListAPIView):
    """
    GET /api/v1/admin/coupons/reports/redemptions/

    Provides a cross-coupon paginated audit history of coupon redemptions and reservations.
    Includes snapshot discounts, order linkage, state transitions, release rationale,
    and masked customer identification.
    """

    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    serializer_class = AdminCouponRedemptionReportSerializer

    def get_queryset(self):
        start_date, end_date = parse_reporting_date_range(
            self.request.query_params.get("start_date"),
            self.request.query_params.get("end_date"),
        )
        return get_coupon_redemptions_report_queryset(
            coupon_id=self.request.query_params.get("coupon_id"),
            coupon_code=self.request.query_params.get("coupon_code"),
            state=self.request.query_params.get("state"),
            payment_status=self.request.query_params.get("payment_status"),
            order_status=self.request.query_params.get("order_status"),
            search=self.request.query_params.get("search"),
            start_date=start_date,
            end_date=end_date,
            ordering=self.request.query_params.get("ordering"),
        )
