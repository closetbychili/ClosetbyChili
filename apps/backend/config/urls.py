"""
Closet by Chilli — URL Configuration

API routes are namespaced under /api/v1/.
Domain-specific URL modules will be added as apps are created.
"""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path


def api_root(request):
    """Health check / API root endpoint."""
    return JsonResponse(
        {
            "service": "Closet by Chilli API",
            "version": "0.1.0",
            "status": "ok",
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", api_root, name="api-root"),
]
