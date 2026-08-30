"""
Closet by Chilli — Centralized API Exception Handling.

Standardizes all DRF error responses according to the contract defined in
35-api-error-response-standards.md §7:

{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable description",
        "details": {}
    }
}
"""

import logging
from typing import Any

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_exception_handler

logger = logging.getLogger(__name__)

# Mapping from standard DRF / Django exception classes to documented error codes
EXCEPTION_CODE_MAP: dict[type[Exception], str] = {
    exceptions.ValidationError: "VALIDATION_ERROR",
    exceptions.NotAuthenticated: "AUTHENTICATION_REQUIRED",
    exceptions.AuthenticationFailed: "AUTHENTICATION_FAILED",
    exceptions.PermissionDenied: "FORBIDDEN",
    DjangoPermissionDenied: "FORBIDDEN",
    exceptions.NotFound: "NOT_FOUND",
    Http404: "NOT_FOUND",
    exceptions.MethodNotAllowed: "METHOD_NOT_ALLOWED",
    exceptions.NotAcceptable: "NOT_ACCEPTABLE",
    exceptions.UnsupportedMediaType: "UNSUPPORTED_MEDIA_TYPE",
    exceptions.Throttled: "RATE_LIMITED",
}


def _extract_error_code(exc: Exception, response: Response | None) -> str:
    """Determine the machine-readable error code for an exception."""
    for exc_class, code in EXCEPTION_CODE_MAP.items():
        if isinstance(exc, exc_class):
            return code

    # Check for custom default_code on APIException subclasses
    if hasattr(exc, "default_code") and isinstance(exc.default_code, str):
        return exc.default_code.upper()

    if response is not None:
        if response.status_code == status.HTTP_404_NOT_FOUND:
            return "NOT_FOUND"
        if response.status_code == status.HTTP_403_FORBIDDEN:
            return "FORBIDDEN"
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            return "AUTHENTICATION_REQUIRED"
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            return "BAD_REQUEST"

    return "INTERNAL_ERROR"


def _extract_message_and_details(
    exc: Exception, response_data: Any
) -> tuple[str, dict[str, Any]]:
    """
    Extract a safe summary message and structured field details.

    Handles:
    - ValidationError dictionary: {"field": ["error msg"]}
    - ValidationError list: ["general error"]
    - Detail string: ErrorDetail("message", code="...")
    """
    if isinstance(exc, exceptions.ValidationError):
        if isinstance(response_data, dict):
            return "Validation failed. Please check the provided data.", response_data
        if isinstance(response_data, list):
            return "Validation failed.", {"non_field_errors": response_data}

    if isinstance(response_data, dict):
        if "detail" in response_data:
            detail_val = response_data["detail"]
            if isinstance(detail_val, str):
                return str(detail_val), {}
            return "An error occurred.", response_data
        return "Validation failed.", response_data

    if isinstance(response_data, list):
        return "An error occurred.", {"errors": response_data}

    if hasattr(exc, "detail") and isinstance(exc.detail, str):
        return str(exc.detail), {}

    return "An unexpected error occurred. Please try again later.", {}


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response:
    """
    Global exception handler for Django REST Framework views.

    Intercepts DRF and Django exceptions, ensures JSON output, and formats
    errors into the standard Closet by Chilli error envelope.
    """
    response = drf_default_exception_handler(exc, context)

    if response is None:
        # Unhandled server-side exception (HTTP 500)
        logger.exception("Unhandled API exception: %s", exc, exc_info=True)
        return Response(
            {
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred. Please try again later.",
                    "details": {},
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    error_code = _extract_error_code(exc, response)
    message, details = _extract_message_and_details(exc, response.data)

    formatted_data = {
        "error": {
            "code": error_code,
            "message": message,
            "details": details,
        }
    }

    response.data = formatted_data
    return response
