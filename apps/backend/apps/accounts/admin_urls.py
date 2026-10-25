from django.urls import path

from apps.accounts.admin_views import AdminDashboardOverviewView, AdminVerifyAuthView
from apps.inventory.admin_views import (
    AdminInventoryAdjustView,
    AdminInventoryAlertAcknowledgeView,
    AdminInventoryDetailView,
    AdminInventoryListView,
    AdminInventoryMovementsListView,
    AdminInventorySummaryView,
    AdminInventoryThresholdUpdateView,
    AdminLowStockAlertsListView,
    AdminOutOfStockAlertsListView,
)
from apps.catalog.admin_views import (
    AdminCategoryDetailView,
    AdminCategoryImageUploadView,
    AdminCategoryListCreateView,
    AdminCollectionDetailView,
    AdminCollectionListCreateView,
    AdminCollectionProductDetailView,
    AdminCollectionProductsView,
    AdminMediaDetailView,
    AdminMediaListView,
    AdminMediaUploadView,
    AdminProductArchiveView,
    AdminProductDetailView,
    AdminProductDraftView,
    AdminProductImageDetailView,
    AdminProductImageListView,
    AdminProductImageReorderView,
    AdminProductListCreateView,
    AdminProductPublishView,
    AdminProductValidateView,
    AdminProductVariantDetailView,
    AdminProductVariantListView,
    AdminVariantStockAdjustmentView,
)
from apps.orders.admin_views import (
    AdminOrderCancelView,
    AdminOrderDetailView,
    AdminOrderHistoryView,
    AdminOrderListView,
    AdminOrderShipmentCreateView,
    AdminOrderTransitionView,
    AdminShipmentDetailView,
    AdminShipmentDispatchView,
    AdminShipmentListView,
    AdminShipmentTrackingUpdateView,
    AdminShipmentTransitionView,
)
from apps.orders.coupon_views import (
    AdminCouponActivateView,
    AdminCouponDeactivateView,
    AdminCouponDetailView,
    AdminCouponListCreateView,
)
from apps.payments.admin_views import (
    AdminPaymentDetailView,
    AdminPaymentListView,
    AdminPaymentReconcileView,
)

urlpatterns = [
    path("auth/verify/", AdminVerifyAuthView.as_view(), name="admin-auth-verify"),
    path(
        "dashboard/overview/",
        AdminDashboardOverviewView.as_view(),
        name="admin-dashboard-overview",
    ),
    path("coupons/", AdminCouponListCreateView.as_view(), name="admin-coupons-list-create"),
    path("coupons/<uuid:pk>/activate/", AdminCouponActivateView.as_view(), name="admin-coupons-activate"),
    path("coupons/<uuid:pk>/deactivate/", AdminCouponDeactivateView.as_view(), name="admin-coupons-deactivate"),
    path("coupons/<uuid:pk>/", AdminCouponDetailView.as_view(), name="admin-coupons-detail"),
    path("shipments/", AdminShipmentListView.as_view(), name="admin-shipments-list"),
    path("shipments/<str:shipment_id>/tracking/", AdminShipmentTrackingUpdateView.as_view(), name="admin-shipments-tracking"),
    path("shipments/<str:shipment_id>/dispatch/", AdminShipmentDispatchView.as_view(), name="admin-shipments-dispatch"),
    path("shipments/<str:shipment_id>/transition/", AdminShipmentTransitionView.as_view(), name="admin-shipments-transition"),
    path("shipments/<str:shipment_id>/status/", AdminShipmentTransitionView.as_view(), name="admin-shipments-status"),
    path("shipments/<str:shipment_id>/", AdminShipmentDetailView.as_view(), name="admin-shipments-detail"),
    path("orders/", AdminOrderListView.as_view(), name="admin-orders-list"),
    path("orders/<str:order_id>/shipments/", AdminOrderShipmentCreateView.as_view(), name="admin-orders-shipments-create"),
    path("orders/<str:order_id>/transition/", AdminOrderTransitionView.as_view(), name="admin-orders-transition"),
    path("orders/<str:order_id>/cancel/", AdminOrderCancelView.as_view(), name="admin-orders-cancel"),
    path("orders/<str:order_id>/history/", AdminOrderHistoryView.as_view(), name="admin-orders-history"),
    path("orders/<str:order_id>/", AdminOrderDetailView.as_view(), name="admin-orders-detail"),
    path("payments/", AdminPaymentListView.as_view(), name="admin-payments-list"),
    path("payments/<str:payment_id>/reconcile/", AdminPaymentReconcileView.as_view(), name="admin-payments-reconcile"),
    path("payments/<str:payment_id>/", AdminPaymentDetailView.as_view(), name="admin-payments-detail"),
    path("inventory/", AdminInventoryListView.as_view(), name="admin-inventory-list"),
    path(
        "inventory/alerts/low-stock/",
        AdminLowStockAlertsListView.as_view(),
        name="admin-inventory-alerts-low-stock",
    ),
    path(
        "inventory/alerts/out-of-stock/",
        AdminOutOfStockAlertsListView.as_view(),
        name="admin-inventory-alerts-out-of-stock",
    ),
    path(
        "inventory/summary/",
        AdminInventorySummaryView.as_view(),
        name="admin-inventory-summary",
    ),
    path(
        "inventory/metrics/",
        AdminInventorySummaryView.as_view(),
        name="admin-inventory-metrics",
    ),
    path(
        "inventory/<uuid:variant_id>/",
        AdminInventoryDetailView.as_view(),
        name="admin-inventory-detail",
    ),
    path(
        "inventory/<uuid:variant_id>/threshold/",
        AdminInventoryThresholdUpdateView.as_view(),
        name="admin-inventory-threshold",
    ),
    path(
        "inventory/<uuid:variant_id>/acknowledge/",
        AdminInventoryAlertAcknowledgeView.as_view(),
        name="admin-inventory-acknowledge",
    ),
    path(
        "inventory/<uuid:variant_id>/adjust/",
        AdminInventoryAdjustView.as_view(),
        name="admin-inventory-adjust",
    ),
    path(
        "inventory/<uuid:variant_id>/movements/",
        AdminInventoryMovementsListView.as_view(),
        name="admin-inventory-movements",
    ),
    path("media/", AdminMediaListView.as_view(), name="admin-media-list"),
    path("media/upload/", AdminMediaUploadView.as_view(), name="admin-media-upload"),
    path(
        "media/<uuid:pk>/",
        AdminMediaDetailView.as_view(),
        name="admin-media-detail",
    ),
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
        "products/<uuid:pk>/validate/",
        AdminProductValidateView.as_view(),
        name="admin-products-validate",
    ),
    path(
        "products/<uuid:pk>/publish/",
        AdminProductPublishView.as_view(),
        name="admin-products-publish",
    ),
    path(
        "products/<uuid:pk>/archive/",
        AdminProductArchiveView.as_view(),
        name="admin-products-archive",
    ),
    path(
        "products/<uuid:pk>/draft/",
        AdminProductDraftView.as_view(),
        name="admin-products-draft",
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



