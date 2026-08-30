"""
Tests for Django REST Framework API Foundation.

Verifies:
- API v1 Root endpoint (/api/v1/)
- HTTP Method enforcement (405)
- Fallback JSON 404 / 500 error responses
- Centralized custom exception handler
- StandardResultsSetPagination behavior
- DRF settings configuration
"""

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from django.test import RequestFactory, TestCase
from rest_framework import exceptions, status
from rest_framework.request import Request
from rest_framework.test import APIClient
from rest_framework.views import APIView

from apps.common.exceptions import custom_exception_handler
from apps.common.pagination import StandardResultsSetPagination


class ApiV1RootTest(TestCase):
    """Verify /api/v1/ root endpoint behavior."""

    def setUp(self):
        self.client = APIClient()

    def test_api_v1_root_success(self):
        """GET /api/v1/ returns 200 OK with service metadata."""
        response = self.client.get("/api/v1/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers["content-type"], "application/json")

        data = response.json()
        self.assertEqual(data["service"], "Closet by Chilli API")
        self.assertEqual(data["version"], "1.0.0")
        self.assertEqual(data["status"], "healthy")
        self.assertIn("endpoints", data)
        self.assertEqual(data["endpoints"]["health"], "/api/v1/")

    def test_api_v1_root_post_not_allowed(self):
        """POST /api/v1/ returns 405 Method Not Allowed with JSON error."""
        response = self.client.post("/api/v1/", {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(response.headers["content-type"], "application/json")

        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "METHOD_NOT_ALLOWED")

    def test_api_v1_root_delete_not_allowed(self):
        """DELETE /api/v1/ returns 405 Method Not Allowed with JSON error."""
        response = self.client.delete("/api/v1/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "METHOD_NOT_ALLOWED")


class ApiNotFoundTest(TestCase):
    """Verify 404 error formatting."""

    def setUp(self):
        self.client = APIClient()

    def test_unmatched_route_returns_json_404(self):
        """Unmatched routes return 404 JSON response instead of HTML."""
        response = self.client.get("/api/v1/nonexistent-endpoint/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.headers["content-type"], "application/json")

        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "NOT_FOUND")


class CustomExceptionHandlerTest(TestCase):
    """Verify custom exception handler translates exceptions to standard envelope."""

    def setUp(self):
        self.factory = RequestFactory()
        self.request = Request(self.factory.get("/api/v1/test/"))
        self.context = {"request": self.request, "view": APIView()}

    def test_validation_error_formatting(self):
        """ValidationError returns 400 with VALIDATION_ERROR and field details."""
        exc = exceptions.ValidationError({"email": ["Enter a valid email address."]})
        response = custom_exception_handler(exc, self.context)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Validation failed. Please check the provided data.",
                    "details": {"email": ["Enter a valid email address."]},
                }
            },
        )

    def test_not_authenticated_formatting(self):
        """NotAuthenticated returns 401 with AUTHENTICATION_REQUIRED code."""
        exc = exceptions.NotAuthenticated()
        response = custom_exception_handler(exc, self.context)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"]["code"], "AUTHENTICATION_REQUIRED")

    def test_permission_denied_formatting(self):
        """PermissionDenied returns 403 with FORBIDDEN code."""
        exc = exceptions.PermissionDenied("You do not have wholesale access.")
        response = custom_exception_handler(exc, self.context)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"]["code"], "FORBIDDEN")
        self.assertEqual(
            response.data["error"]["message"], "You do not have wholesale access."
        )

    def test_django_permission_denied_formatting(self):
        """Django's native PermissionDenied returns 403 with FORBIDDEN code."""
        exc = DjangoPermissionDenied("Access denied.")
        response = custom_exception_handler(exc, self.context)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"]["code"], "FORBIDDEN")

    def test_not_found_formatting(self):
        """NotFound returns 404 with NOT_FOUND code."""
        exc = exceptions.NotFound("Product not found.")
        response = custom_exception_handler(exc, self.context)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"]["code"], "NOT_FOUND")

    def test_http404_formatting(self):
        """Django's Http404 returns 404 with NOT_FOUND code."""
        exc = Http404("Item does not exist.")
        response = custom_exception_handler(exc, self.context)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"]["code"], "NOT_FOUND")

    def test_method_not_allowed_formatting(self):
        """MethodNotAllowed returns 405 with METHOD_NOT_ALLOWED code."""
        exc = exceptions.MethodNotAllowed("POST")
        response = custom_exception_handler(exc, self.context)

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(response.data["error"]["code"], "METHOD_NOT_ALLOWED")

    def test_throttled_formatting(self):
        """Throttled returns 429 with RATE_LIMITED code."""
        exc = exceptions.Throttled(wait=60)
        response = custom_exception_handler(exc, self.context)

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response.data["error"]["code"], "RATE_LIMITED")

    def test_unhandled_exception_formatting(self):
        """Unhandled exceptions return 500 without leaking stack traces."""
        exc = RuntimeError("Database disk full simulation")
        response = custom_exception_handler(exc, self.context)

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["error"]["code"], "INTERNAL_ERROR")
        self.assertNotIn(
            "Database disk full simulation", response.data["error"]["message"]
        )


class PaginationTest(TestCase):
    """Verify StandardResultsSetPagination configuration and behavior."""

    def setUp(self):
        self.pagination = StandardResultsSetPagination()
        self.factory = RequestFactory()

    def test_pagination_default_attributes(self):
        """Verify standard pagination attributes match specifications."""
        self.assertEqual(self.pagination.page_size, 20)
        self.assertEqual(self.pagination.page_size_query_param, "page_size")
        self.assertEqual(self.pagination.max_page_size, 100)
        self.assertEqual(self.pagination.page_query_param, "page")

    def test_paginate_in_memory_dataset(self):
        """Verify dataset pagination with custom page_size."""
        data = list(range(1, 101))  # 100 items
        django_request = self.factory.get("/api/v1/test/?page=2&page_size=10")
        request = Request(django_request)

        page = self.pagination.paginate_queryset(data, request)
        self.assertEqual(len(page), 10)
        self.assertEqual(page, list(range(11, 21)))

        response = self.pagination.get_paginated_response(page)
        self.assertEqual(response.data["count"], 100)
        self.assertIn("next", response.data)
        self.assertIn("previous", response.data)
        self.assertEqual(response.data["results"], list(range(11, 21)))

    def test_paginate_max_page_size_enforcement(self):
        """Verify client cannot request page_size exceeding max_page_size (100)."""
        data = list(range(1, 200))
        django_request = self.factory.get("/api/v1/test/?page_size=500")
        request = Request(django_request)

        page = self.pagination.paginate_queryset(data, request)
        self.assertEqual(len(page), 100)  # Capped at max_page_size


class DRFSettingsTest(TestCase):
    """Verify DRF settings in configuration."""

    def test_drf_settings_configured(self):
        """Verify DRF base settings dictionary has required keys."""
        from django.conf import settings

        drf_settings = settings.REST_FRAMEWORK
        self.assertEqual(
            drf_settings["DEFAULT_PAGINATION_CLASS"],
            "apps.common.pagination.StandardResultsSetPagination",
        )
        self.assertEqual(drf_settings["PAGE_SIZE"], 20)
        self.assertEqual(
            drf_settings["EXCEPTION_HANDLER"],
            "apps.common.exceptions.custom_exception_handler",
        )
        self.assertIn(
            "rest_framework.filters.SearchFilter",
            drf_settings["DEFAULT_FILTER_BACKENDS"],
        )
        self.assertIn(
            "rest_framework.filters.OrderingFilter",
            drf_settings["DEFAULT_FILTER_BACKENDS"],
        )
