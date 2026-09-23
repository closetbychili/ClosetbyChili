from typing import Any

from rest_framework import permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import CurrentUserSerializer, UpdateProfileSerializer


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return Response(CurrentUserSerializer(request.user).data)

    def patch(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        profile = request.user.profile
        serializer = UpdateProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            CurrentUserSerializer(request.user).data, status=status.HTTP_200_OK
        )
