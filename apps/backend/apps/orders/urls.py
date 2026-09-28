from django.urls import path

from apps.orders.views import CheckoutView, OrderDetailView, OrderListView

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout-create"),
    path("", OrderListView.as_view(), name="order-list"),
    path("<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
]
