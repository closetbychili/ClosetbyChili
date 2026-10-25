"""DRF permissions for Closet by Chilli administrative and staff access."""

from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from apps.accounts.models import User


class IsAdminUser(BasePermission):
    """
    Allows access only to authenticated, active administrators.

    Rejects:
    - Anonymous requests (triggers 401 via DRF authentication challenge)
    - Inactive accounts (403)
    - Regular customers and wholesale customers (403)
    - Non-admin staff (403)
    """

    message = "Administrator privileges are required to access this endpoint."

    def has_permission(self, request: Request, view: Any) -> bool:
        user = getattr(request, "user", None)
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "is_active", False)
            and getattr(user, "role", None) == User.Role.ADMIN
        )


class IsStaffUser(BasePermission):
    """
    Allows access to authenticated, active staff and administrators.

    Rejects:
    - Anonymous requests (triggers 401 via DRF authentication challenge)
    - Inactive accounts (403)
    - Regular customers and wholesale customers (403)
    """

    message = "Staff privileges are required to access this endpoint."

    def has_permission(self, request: Request, view: Any) -> bool:
        user = getattr(request, "user", None)
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "is_active", False)
            and getattr(user, "role", None) in {User.Role.STAFF, User.Role.ADMIN}
        )
