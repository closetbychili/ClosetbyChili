from django.urls import path

from apps.orders.views import CheckoutView, OrderCancelView, OrderDetailView, OrderListView

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout-create"),
    path("", OrderListView.as_view(), name="order-list"),
    path("<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
    path("<str:order_number>/cancel/", OrderCancelView.as_view(), name="order-cancel"),
]

