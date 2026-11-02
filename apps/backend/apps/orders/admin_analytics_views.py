"""
Closet by Chilli — Admin Analytics & Business Intelligence Views.

Complies with Sprint A7, 04-backend-architecture.md, and 18-admin-operations.md.
Provides:
- GET /api/v1/admin/analytics/
Enforces IsAdminUser authorization in Django.
"""

from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminUser
from apps.orders.admin_analytics_serializers import AdminAnalyticsParamsSerializer
from apps.orders.admin_analytics_service import get_admin_analytics_data


class AdminAnalyticsView(APIView):
    """
    GET /api/v1/admin/analytics/

    Provides comprehensive, aggregated business intelligence metrics:
    - Executive KPI summary cards (Gross sales, Net revenue, Orders, AOV, Units, New patrons)
    - Revenue and order volume trend over time with flexible granularity
    - Order fulfillment and payment status breakdowns
    - Product performance rankings (top revenue, top volume, slow-moving stock)
    - Category sales and contribution share
    - Customer acquisition and new vs returning patron breakdown

    Parameters:
    - period: 'today' | '7d' | '30d' | '90d' | 'this_month' | 'last_month' | 'custom' (default '30d')
    - start_date: ISO date string for custom range
    - end_date: ISO date string for custom range
    - granularity: 'auto' | 'day' | 'week' | 'month' (default 'auto')
    - refresh: boolean to bypass cache
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        params_serializer = AdminAnalyticsParamsSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)

        validated = params_serializer.validated_data
        period = validated.get("period", "30d")
        start_date = validated.get("start_date") or None
        end_date = validated.get("end_date") or None
        granularity = validated.get("granularity", "auto")
        refresh = validated.get("refresh", False)

        data = get_admin_analytics_data(
            period=period,
            start_date=start_date,
            end_date=end_date,
            granularity=granularity,
            use_cache=not refresh,
        )

        return Response(data, status=status.HTTP_200_OK)

