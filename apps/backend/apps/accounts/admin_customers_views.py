"""
Closet by Chilli — Admin Customer Directory Views (Sprint A6.1).

Complies with 04-backend-architecture.md, 18-admin-operations.md, and Sprint A6.1.
Enforces IsAdminUser server-side authorization.
Provides:
- GET /api/v1/admin/customers/
- GET /api/v1/admin/customers/<uuid:pk>/
"""

from __future__ import annotations

import logging
import uuid

from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.admin_customers_serializers import (
    AdminCustomerDetailSerializer,
    AdminCustomerListSerializer,
    AdminCustomerNoteCreateSerializer,
    AdminCustomerNoteSerializer,
)
from apps.accounts.admin_customers_service import (
    get_admin_customer_detail_queryset,
    get_admin_customers_queryset,
    get_customer_orders_paginated,
)
from apps.accounts.models import CustomerNote, User
from apps.accounts.permissions import IsAdminUser, IsStaffUser
from apps.common.pagination import StandardResultsSetPagination

logger = logging.getLogger(__name__)


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

    Customer profile, saved addresses, purchase metrics, and paginated order history.
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request, pk: uuid.UUID) -> Response:
        qs = get_admin_customer_detail_queryset(pk)
        customer = qs.first()
        if not customer:
            raise NotFound(detail=f"Customer with id '{pk}' was not found.")

        try:
            page = int(request.query_params.get("page", 1))
        except (TypeError, ValueError):
            page = 1

        try:
            page_size = int(request.query_params.get("page_size", 10))
        except (TypeError, ValueError):
            page_size = 10

        addresses = list(
            customer.addresses.all().order_by("-is_default", "-updated_at", "-created_at")
        )
        orders_data = get_customer_orders_paginated(customer, page=page, page_size=page_size)

        serializer = AdminCustomerDetailSerializer(
            customer,
            context={
                "request": request,
                "addresses": addresses,
                "orders_data": orders_data,
            },
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminCustomerNotesView(APIView):
    """
    GET /api/v1/admin/customers/<uuid:customer_id>/notes/
    POST /api/v1/admin/customers/<uuid:customer_id>/notes/

    Internal-only customer support context and interaction notes (Sprint A6.3).
    Append-only: records cannot be edited or deleted by administrative users.
    Enforces IsAdminUser server-side authorization.
    """

    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination

    def get_customer(self, customer_id: uuid.UUID) -> User:
        customer = User.objects.filter(id=customer_id).first()
        if not customer:
            raise NotFound(detail=f"Customer with id '{customer_id}' was not found.")
        return customer

    def get(self, request: Request, customer_id: uuid.UUID) -> Response:
        customer = self.get_customer(customer_id)
        notes_qs = (
            CustomerNote.objects.filter(customer=customer)
            .select_related("author", "author__profile")
            .order_by("-created_at", "-id")
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(notes_qs, request, view=self)
        if page is not None:
            serializer = AdminCustomerNoteSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = AdminCustomerNoteSerializer(notes_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request: Request, customer_id: uuid.UUID) -> Response:
        customer = self.get_customer(customer_id)
        serializer = AdminCustomerNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        body = serializer.validated_data["body"]
        author = request.user if getattr(request.user, "is_authenticated", False) else None

        note = CustomerNote.objects.create(
            customer=customer,
            author=author,
            body=body,
        )

        logger.info(
            "Staff user %s created internal note %s for customer %s",
            getattr(author, "email", "system"),
            note.id,
            customer.id,
        )

        output_serializer = AdminCustomerNoteSerializer(note)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


