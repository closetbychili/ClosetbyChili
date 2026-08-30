"""
Closet by Chilli — Common API Views & Error Handlers.

Provides standard JSON responses for framework-level 404 and 500 conditions.
"""

from typing import Any

from django.http import JsonResponse


def custom_404_handler(
    request: Any, exception: Exception | None = None
) -> JsonResponse:
    """Fallback 404 handler ensuring JSON response for unmatched routes."""
    return JsonResponse(
        {
            "error": {
                "code": "NOT_FOUND",
                "message": f"Resource not found: {request.path}",
                "details": {},
            }
        },
        status=404,
    )


def custom_500_handler(request: Any) -> JsonResponse:
    """Fallback 500 handler ensuring JSON response for unhandled server errors."""
    return JsonResponse(
        {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "details": {},
            }
        },
        status=500,
    )
