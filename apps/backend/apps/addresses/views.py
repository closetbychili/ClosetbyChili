from __future__ import annotations

from typing import Any

from django.db.models import QuerySet
from rest_framework import generics, permissions
from rest_framework.request import Request

from apps.addresses.models import Address
from apps.addresses.serializers import AddressSerializer


class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Address.objects.select_related("user")

    def get_queryset(self) -> QuerySet[Address]:
        queryset = Address.objects.filter(user=self.request.user).select_related("user")
        if queryset.filter(is_default=True).exists():
            return queryset.order_by("-is_default", "-created_at")
        return queryset.order_by("-created_at")

    def perform_create(self, serializer: AddressSerializer) -> None:
        serializer.save()


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "id"
    lookup_url_kwarg = "id"

    def get_queryset(self) -> QuerySet[Address]:
        return Address.objects.filter(user=self.request.user).select_related("user")
