"""
Closet by Chilli — Cart API URLs.

Routes:
- GET, POST, DELETE /api/v1/cart/
- POST              /api/v1/cart/items/
- PATCH, DELETE     /api/v1/cart/items/<id>/
- DELETE            /api/v1/cart/clear/
"""

from django.urls import path

from apps.cart.views import (
    CartClearView,
    CartItemAddView,
    CartItemDetailView,
    CartMergeView,
    CartView,
)

urlpatterns = [
    path("", CartView.as_view(), name="cart-root"),
    path("items/", CartItemAddView.as_view(), name="cart-item-add"),
    path(
        "items/<uuid:item_id>/", CartItemDetailView.as_view(), name="cart-item-detail"
    ),
    path("merge/", CartMergeView.as_view(), name="cart-merge"),
    path("clear/", CartClearView.as_view(), name="cart-clear"),
]
