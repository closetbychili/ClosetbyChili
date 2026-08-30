"""
Closet by Chilli — URL Configuration

API routes are namespaced under /api/v1/.
Domain-specific URL modules will be added as apps are created.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("config.api_v1_urls")),
]

handler404 = "apps.common.views.custom_404_handler"
handler500 = "apps.common.views.custom_500_handler"
