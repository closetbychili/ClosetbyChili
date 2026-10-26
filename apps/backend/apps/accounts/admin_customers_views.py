"""
Closet by Chilli — Admin Customer Directory Views (Sprint A6.1).

Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprint A6.1.
Enforces IsAdminUser server-side authorization.
Provides:
- GET /api/v1/admin/customers/
- GET /api/v1/admin/customers/<uuid:pk>/
"""

from __future__ import annotations

import uuid

from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.admin_customers_serializers import (
    AdminCustomerDetailSerializer,
    AdminCustomerListSerializer,
)
from apps.accounts.admin_customers_service import (
    get_admin_customer_detail_queryset,
    get_admin_customers_queryset,
)
from apps.accounts.permissions import IsAdminUser
from apps.common.pagination import StandardResultsSetPagination


class AdminCustomerListView(APIView):
    """
    GET /api/v1/admin/customers/

    Administrative customer directory endpoint with search, status filtering,
    order presence filtering, account creation date-range filtering, and
    deterministic sorting.
    """

    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get(self, request: Request) -> Response:
        search = request.query_params.get("search")
        sort = request.query_params.get("sort")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        has_orders = request.query_params.get("has_orders")
        status_param = request.query_params.get("status")
        role = request.query_params.get("role")

        qs = get_admin_customers_queryset(
            search=search,
            sort=sort,
            date_from=date_from,
            date_to=date_to,
            has_orders=has_orders,
            status_param=status_param,
            role=role,
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request, view=self)
        if page is not None:
            serializer = AdminCustomerListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = AdminCustomerListSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminCustomerDetailView(APIView):
    """
    GET /api/v1/admin/customers/<uuid:pk>/

    Customer identity summary and aggregate metrics endpoint.
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request, pk: uuid.UUID) -> Response:
        qs = get_admin_customer_detail_queryset(pk)
        customer = qs.first()
        if not customer:
            raise NotFound(detail=f"Customer with id '{pk}' was not found.")

        serializer = AdminCustomerDetailSerializer(customer)
        return Response(serializer.data, status=status.HTTP_200_OK)
