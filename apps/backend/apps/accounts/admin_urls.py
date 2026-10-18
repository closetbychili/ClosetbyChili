from django.urls import path

from apps.accounts.admin_views import AdminDashboardOverviewView, AdminVerifyAuthView
from apps.catalog.admin_views import (
    AdminCategoryDetailView,
    AdminCategoryImageUploadView,
    AdminCategoryListCreateView,
    AdminCollectionDetailView,
    AdminCollectionListCreateView,
    AdminCollectionProductDetailView,
    AdminCollectionProductsView,
    AdminMediaUploadView,
    AdminProductDetailView,
    AdminProductImageDetailView,
    AdminProductImageListView,
    AdminProductImageReorderView,
    AdminProductListCreateView,
    AdminProductVariantDetailView,
    AdminProductVariantListView,
    AdminVariantStockAdjustmentView,
)

urlpatterns = [
    path("auth/verify/", AdminVerifyAuthView.as_view(), name="admin-auth-verify"),
    path(
        "dashboard/overview/",
        AdminDashboardOverviewView.as_view(),
        name="admin-dashboard-overview",
    ),
    path("media/upload/", AdminMediaUploadView.as_view(), name="admin-media-upload"),
    path("categories/", AdminCategoryListCreateView.as_view(), name="admin-categories-list"),
    path(
        "categories/<uuid:pk>/",
        AdminCategoryDetailView.as_view(),
        name="admin-categories-detail",
    ),
    path(
        "categories/<uuid:pk>/image/",
        AdminCategoryImageUploadView.as_view(),
        name="admin-categories-image",
    ),
    path("collections/", AdminCollectionListCreateView.as_view(), name="admin-collections-list"),
    path(
        "collections/<uuid:pk>/",
        AdminCollectionDetailView.as_view(),
        name="admin-collections-detail",
    ),
    path(
        "collections/<uuid:collection_id>/products/",
        AdminCollectionProductsView.as_view(),
        name="admin-collections-products",
    ),
    path(
        "collections/<uuid:collection_id>/products/<uuid:product_id>/",
        AdminCollectionProductDetailView.as_view(),
        name="admin-collections-product-detail",
    ),
    path("products/", AdminProductListCreateView.as_view(), name="admin-products-list"),
    path(
        "products/<uuid:pk>/",
        AdminProductDetailView.as_view(),
        name="admin-products-detail",
    ),
    path(
        "products/<uuid:product_id>/images/",
        AdminProductImageListView.as_view(),
        name="admin-product-images-list",
    ),
    path(
        "products/<uuid:product_id>/images/<uuid:image_id>/",
        AdminProductImageDetailView.as_view(),
        name="admin-product-image-detail",
    ),
    path(
        "products/<uuid:product_id>/images/reorder/",
        AdminProductImageReorderView.as_view(),
        name="admin-product-images-reorder",
    ),
    path(
        "products/<uuid:product_id>/variants/",
        AdminProductVariantListView.as_view(),
        name="admin-product-variants-list",
    ),
    path(
        "products/<uuid:product_id>/variants/<uuid:variant_id>/",
        AdminProductVariantDetailView.as_view(),
        name="admin-product-variant-detail",
    ),
    path(
        "variants/<uuid:variant_id>/stock-adjustment/",
        AdminVariantStockAdjustmentView.as_view(),
        name="admin-variant-stock-adjustment",
    ),
]



