from django.urls import path

from apps.orders.views import OrderDetailView, OrderListView

urlpatterns = [
    path("", OrderListView.as_view(), name="order-list"),
    path("<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
]
