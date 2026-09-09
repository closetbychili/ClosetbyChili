"""
Closet by Chilli — Cart Domain Exceptions.
"""

from rest_framework import exceptions, status


class InsufficientStockError(exceptions.APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Requested quantity exceeds available stock."
    default_code = "INSUFFICIENT_STOCK"


class InactiveVariantError(exceptions.APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The selected variant is no longer active."
    default_code = "INACTIVE_VARIANT"


class CartSessionExpiredError(exceptions.APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Cart session is invalid or has expired."
    default_code = "CART_NOT_FOUND"
