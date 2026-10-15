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
