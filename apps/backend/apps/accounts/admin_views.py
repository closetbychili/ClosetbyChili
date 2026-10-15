"""Administrative authentication and access verification views."""

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminUser
from apps.accounts.serializers import AdminUserSerializer


class AdminVerifyAuthView(APIView):
    """
    GET /api/v1/admin/auth/verify/

    Server-side verification of administrative authorization.
    Enforces IsAdminUser:
    - 401 Unauthorized if token is missing or invalid.
    - 403 Forbidden if user is authenticated as customer or non-admin staff.
    - 200 OK with safe admin details if user has Role.ADMIN and is active.
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request) -> Response:
        serializer = AdminUserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminDashboardOverviewView(APIView):
    """
    GET /api/v1/admin/dashboard/overview/

    Aggregated administrative dashboard metrics, including:
    - Total orders & status breakdown
    - Gross revenue & average order value (PAID, non-cancelled orders only)
    - Low-stock inventory ledger count and alerts
    - Historical period comparison (when mathematically valid)
    - Daily sales time-series overview
    - Recent orders
    - Top-selling products
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request) -> Response:
        from apps.accounts.admin_dashboard import get_admin_dashboard_overview

        period = request.query_params.get("period", "30d")
        low_stock_threshold = request.query_params.get("low_stock_threshold", 5)

        data = get_admin_dashboard_overview(
            period=period,
            low_stock_threshold=low_stock_threshold,
        )
        return Response(data, status=status.HTTP_200_OK)

