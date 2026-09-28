from __future__ import annotations

from typing import Any

from django.db.models import QuerySet
from rest_framework import generics, permissions
from rest_framework.request import Request
from rest_framework.response import Response

from apps.orders.models import Order
from apps.orders.serializers import OrderDetailSerializer, OrderListSerializer


class OrderListView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[Order]:
        return (
            Order.objects.filter(user=self.request.user)
            .select_related("user")
            .prefetch_related("items")
            .order_by("-created_at")
        )


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "order_number"

    def get_queryset(self) -> QuerySet[Order]:
        return (
            Order.objects.filter(user=self.request.user)
            .select_related("user")
            .prefetch_related("items")
            .order_by("-created_at")
        )
