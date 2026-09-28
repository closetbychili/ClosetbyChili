from django.urls import path

from apps.addresses.views import AddressDetailView, AddressListCreateView

urlpatterns = [
    path("", AddressListCreateView.as_view(), name="address-list-create"),
    path("<uuid:id>/", AddressDetailView.as_view(), name="address-detail"),
]
