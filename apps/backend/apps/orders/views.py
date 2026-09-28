from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.core.cache import cache
from django.db import transaction
from django.db.models import QuerySet
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.addresses.models import Address
from apps.cart.exceptions import InsufficientStockError
from apps.cart.models import Cart
from apps.catalog.models import Product
from apps.inventory.models import InventoryItem
from apps.orders.models import Order, OrderItem
from apps.orders.serializers import OrderDetailSerializer, OrderListSerializer


class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_order_for_cart(self, user_id: str, cart_id: str) -> Order | None:
        return (
            Order.objects.select_related("user")
            .prefetch_related("items")
            .filter(user_id=user_id, cart_id=cart_id)
            .first()
        )

    def _get_order_for_key(self, user_id: str, idempotency_key: str) -> Order | None:
        return (
            Order.objects.select_related("user")
            .prefetch_related("items")
            .filter(user_id=user_id, idempotency_key=idempotency_key)
            .first()
        )

    def _get_cached_order_for_cart(self, user_id: str, cart_id: str) -> Order | None:
        cached_order_id = cache.get(f"checkout:cart:{user_id}:{cart_id}")
        if not cached_order_id:
            return None
        return (
            Order.objects.select_related("user")
            .prefetch_related("items")
            .filter(id=cached_order_id)
            .first()
        )

    def _get_cached_order_for_key(self, user_id: str, idempotency_key: str) -> Order | None:
        cached_order_id = cache.get(f"checkout:key:{user_id}:{idempotency_key}")
        if not cached_order_id:
            return None
        return (
            Order.objects.select_related("user")
            .prefetch_related("items")
            .filter(id=cached_order_id)
            .first()
        )

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        shipping_address_id = request.data.get("shipping_address_id") or request.data.get(
            "address_id"
        )
        if not shipping_address_id:
            raise DRFValidationError(
                {"shipping_address_id": "Shipping address is required."}
            )

        idempotency_key = request.data.get("idempotency_key") or request.headers.get(
            "Idempotency-Key"
        )
        if idempotency_key:
            order_by_key = self._get_order_for_key(str(request.user.id), idempotency_key)
            if order_by_key:
                return Response(
                    OrderDetailSerializer(order_by_key).data,
                    status=status.HTTP_200_OK,
                )

        cart = (
            Cart.objects.filter(user=request.user, is_active=True)
            .prefetch_related("items__variant__product")
            .first()
        )
        if cart:
            order_by_cart = self._get_order_for_cart(str(request.user.id), str(cart.id))
            if order_by_cart:
                return Response(
                    OrderDetailSerializer(order_by_cart).data,
                    status=status.HTTP_200_OK,
                )

        if not cart or cart.items.count() == 0:
            raise DRFValidationError({"cart": "Your cart is empty."})

        shipping_address = Address.objects.filter(
            user=request.user,
            id=shipping_address_id,
        ).first()
        if not shipping_address:
            raise DRFValidationError(
                {"shipping_address_id": "Shipping address does not belong to this user."}
            )

        with transaction.atomic():
            cart = (
                Cart.objects.select_for_update()
                .filter(user=request.user, is_active=True)
                .prefetch_related("items__variant__product")
                .first()
            )
            if not cart:
                raise DRFValidationError({"cart": "Your cart is empty."})

            order_by_cart = self._get_order_for_cart(str(request.user.id), str(cart.id))
            if order_by_cart:
                return Response(
                    OrderDetailSerializer(order_by_cart).data,
                    status=status.HTTP_200_OK,
                )

            if idempotency_key:
                order_by_key = self._get_order_for_key(str(request.user.id), idempotency_key)
                if order_by_key:
                    return Response(
                        OrderDetailSerializer(order_by_key).data,
                        status=status.HTTP_200_OK,
                    )

            if cart.items.count() == 0:
                raise DRFValidationError({"cart": "Your cart is empty."})

            variant_ids = [item.variant_id for item in cart.items.all()]
            inventory_map = {
                row.variant_id: row
                for row in InventoryItem.objects.select_for_update()
                .filter(variant_id__in=variant_ids)
                .order_by("variant_id")
            }

            line_items = []
            subtotal = Decimal("0.00")
            for cart_item in cart.items.select_related("variant__product").all():
                variant = cart_item.variant
                if not variant.is_active:
                    raise InsufficientStockError(
                        f"Variant {variant.sku} is no longer active."
                    )
                if (
                    not variant.product.is_active
                    or variant.product.status != Product.Status.ACTIVE
                ):
                    raise DRFValidationError(
                        {"variant_id": "This product is not currently available for purchase."}
                    )

                inventory = inventory_map.get(variant.id)
                available = inventory.quantity_available if inventory else 0
                if cart_item.quantity > available:
                    raise InsufficientStockError(
                        f"Requested quantity ({cart_item.quantity}) exceeds available stock ({available}) for {variant.sku}."
                    )

                unit_price = variant.retail_price
                line_total = (unit_price * cart_item.quantity).quantize(Decimal("0.01"))
                subtotal += line_total
                line_items.append(
                    {
                        "variant": variant,
                        "product": variant.product,
                        "quantity": cart_item.quantity,
                        "unit_price": unit_price,
                        "line_total": line_total,
                    }
                )

            shipping_snapshot = {
                "id": str(shipping_address.id),
                "full_name": shipping_address.full_name,
                "phone": shipping_address.phone,
                "address_line1": shipping_address.address_line1,
                "address_line2": shipping_address.address_line2,
                "landmark": shipping_address.landmark,
                "city": shipping_address.city,
                "state": shipping_address.state,
                "postal_code": shipping_address.postal_code,
                "country": shipping_address.country,
                "address_type": shipping_address.address_type,
                "is_default": shipping_address.is_default,
            }
            billing_snapshot = shipping_snapshot.copy()

            try:
                order = Order.objects.create(
                    user=request.user,
                    cart=cart,
                    idempotency_key=idempotency_key,
                    status=Order.Status.PENDING,
                    payment_status=Order.PaymentStatus.PENDING,
                    currency="INR",
                    subtotal=subtotal,
                    discount=Decimal("0.00"),
                    shipping_amount=Decimal("0.00"),
                    tax_amount=Decimal("0.00"),
                    total=subtotal,
                    shipping_address_snapshot=shipping_snapshot,
                    billing_address_snapshot=billing_snapshot,
                )
            except IntegrityError:
                if idempotency_key:
                    order = self._get_order_for_key(str(request.user.id), idempotency_key)
                else:
                    order = self._get_order_for_cart(str(request.user.id), str(cart.id))
                if order:
                    return Response(
                        OrderDetailSerializer(order).data,
                        status=status.HTTP_200_OK,
                    )
                raise

            for line in line_items:
                OrderItem.objects.create(
                    order=order,
                    product=line["product"],
                    variant=line["variant"],
                    product_name=line["product"].name,
                    variant_name=(
                        f"{line['variant'].size} / {line['variant'].color}".strip(" /")
                    ),
                    sku=line["variant"].sku,
                    unit_price=line["unit_price"],
                    quantity=line["quantity"],
                    line_total=line["line_total"],
                )

            cart.items.all().delete()
            cart.save(update_fields=["updated_at"])

            cache.set(f"checkout:cart:{request.user.id}:{cart.id}", str(order.id), timeout=60 * 60 * 24)
            if idempotency_key:
                cache.set(
                    f"checkout:key:{request.user.id}:{idempotency_key}",
                    str(order.id),
                    timeout=60 * 60 * 24,
                )

            order = (
                Order.objects.select_related("user")
                .prefetch_related("items")
                .get(id=order.id)
            )
            return Response(
                OrderDetailSerializer(order).data,
                status=status.HTTP_201_CREATED,
            )


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
