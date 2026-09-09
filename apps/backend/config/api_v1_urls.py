"""
Closet by Chilli — API v1 URL Configuration.

Mounts the v1 API root and provides extension points for domain APIs.
"""

from typing import Any

from django.urls import include, path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def api_v1_root(request: Any) -> Response:
    """
    API v1 Root / Health Endpoint.

    Returns service identity, version, and operational status.
    """
    return Response(
        {
            "service": "Closet by Chilli API",
            "version": "1.0.0",
            "status": "healthy",
            "endpoints": {
                "health": "/api/v1/",
                "catalog": {
                    "categories": "/api/v1/catalog/categories/",
                    "collections": "/api/v1/catalog/collections/",
                    "products": "/api/v1/catalog/products/",
                },
                "cart": "/api/v1/cart/",
            },
        }
    )


urlpatterns = [
    path("", api_v1_root, name="api-v1-root"),
    path("catalog/", include("apps.catalog.urls")),
    path("cart/", include("apps.cart.urls")),
]
