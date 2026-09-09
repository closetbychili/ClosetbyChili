"""
Closet by Chilli — Cart Domain API Views.

Endpoints defined in 07-api-architecture.md §32-37 and 22-cart-checkout-architecture.md:
- GET    /api/v1/cart/               → Get active cart
- POST   /api/v1/cart/               → Add item (alias)
- DELETE /api/v1/cart/               → Clear all items in cart
- POST   /api/v1/cart/items/         → Add item to cart
- PATCH  /api/v1/cart/items/{id}/    → Update item quantity
- DELETE /api/v1/cart/items/{id}/    → Remove item from cart
- DELETE /api/v1/cart/clear/         → Clear all items in cart (alias)
"""

import secrets
from typing import Any

from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.exceptions import (
    CartSessionExpiredError,
    InactiveVariantError,
    InsufficientStockError,
)
from apps.cart.models import Cart, CartItem
from apps.cart.serializers import (
    AddToCartInputSerializer,
    CartSerializer,
    UpdateCartItemInputSerializer,
)
from apps.catalog.models import Product, ProductVariant


def _extract_session_key(request: Request) -> str | None:
    """
    Extract guest session token from X-Cart-Session header or cart_session cookie.
    """
    session_key = request.headers.get("X-Cart-Session") or request.COOKIES.get("cart_session")
    if session_key:
        return session_key.strip()
    return None


def _get_cart(request: Request, must_exist: bool = False) -> Cart | None:
    """
    Look up the active cart for the current session.

    If must_exist is True and a session key was provided that cannot be found,
    raises CartSessionExpiredError.
    """
    session_key = _extract_session_key(request)
    if not session_key:
        if must_exist:
            raise CartSessionExpiredError("No cart session provided.")
        return None

    cart = Cart.objects.prefetch_related(
        "items__variant__product__category",
    ).filter(session_key=session_key, is_active=True).first()

    if not cart and must_exist:
        raise CartSessionExpiredError(f"Cart session '{session_key}' is invalid or has expired.")

    return cart


def _get_or_create_cart(request: Request) -> tuple[Cart, bool]:
    """
    Look up an existing active cart or instantiate a new one with a secure session key.
    """
    session_key = _extract_session_key(request)

    if session_key:
        cart = Cart.objects.filter(session_key=session_key, is_active=True).first()
        if cart:
            return cart, False

    # Generate cryptographically secure guest session identifier
    new_session_key = secrets.token_urlsafe(32)
    cart = Cart.objects.create(session_key=new_session_key, is_active=True)
    return cart, True


def _attach_cart_session(response: Response, cart: Cart) -> Response:
    """
    Set X-Cart-Session response header and cart_session cookie for client persistence.
    """
    response["X-Cart-Session"] = cart.session_key
    response.set_cookie(
        key="cart_session",
        value=cart.session_key,
        max_age=30 * 24 * 60 * 60,  # 30 days
        httponly=False,  # Allow frontend API client reading if needed
        samesite="Lax",
    )
    return response


class CartView(APIView):
    """
    Cart Root Endpoint.

    GET: Returns the active cart.
    DELETE: Clears all items in the active cart.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        session_key = _extract_session_key(request)
        if not session_key:
            # Return standard empty cart structure for fresh guest sessions
            return Response(
                {
                    "id": None,
                    "session_key": None,
                    "items": [],
                    "item_count": 0,
                    "subtotal": "0.00",
                    "is_active": True,
                    "created_at": None,
                    "updated_at": None,
                },
                status=status.HTTP_200_OK,
            )

        cart = _get_cart(request, must_exist=True)
        serializer = CartSerializer(cart)
        response = Response(serializer.data, status=status.HTTP_200_OK)
        return _attach_cart_session(response, cart)

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Alias to add an item directly via POST /api/v1/cart/."""
        return CartItemAddView().post(request, *args, **kwargs)

    def delete(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Clears all items in the current active cart."""
        cart = _get_cart(request, must_exist=False)
        if cart:
            with transaction.atomic():
                cart.items.all().delete()
                cart.save()
            serializer = CartSerializer(cart)
            response = Response(serializer.data, status=status.HTTP_200_OK)
            return _attach_cart_session(response, cart)

        return Response(
            {
                "id": None,
                "session_key": None,
                "items": [],
                "item_count": 0,
                "subtotal": "0.00",
                "is_active": True,
                "created_at": None,
                "updated_at": None,
            },
            status=status.HTTP_200_OK,
        )


class CartItemAddView(APIView):
    """
    Add an item to the shopping cart.

    Validates:
    - Variant existence and active status.
    - Product sellability.
    - Quantity >= 1.
    - Server-authoritative stock availability.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = AddToCartInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        variant_id = serializer.validated_data["variant_id"]
        requested_quantity = serializer.validated_data["quantity"]

        # Validate variant
        variant = (
            ProductVariant.objects.select_related("product", "inventory")
            .filter(id=variant_id)
            .first()
        )
        if not variant:
            raise NotFound("The requested product variant does not exist.")

        if not variant.is_active:
            raise InactiveVariantError("The selected product variant is currently inactive.")

        if (
            variant.product.status != Product.Status.ACTIVE
            or not variant.product.is_active
        ):
            raise ValidationError(
                {"variant_id": ["This product is not currently available for purchase."]}
            )

        # Check stock availability
        inventory = getattr(variant, "inventory", None)
        available_stock = inventory.quantity_available if inventory else 0

        with transaction.atomic():
            cart, _ = _get_or_create_cart(request)

            existing_item = cart.items.filter(variant=variant).first()
            current_qty = existing_item.quantity if existing_item else 0
            new_total_qty = current_qty + requested_quantity

            if new_total_qty > available_stock:
                raise InsufficientStockError(
                    f"Requested total quantity ({new_total_qty}) exceeds available stock ({available_stock})."
                )

            if existing_item:
                existing_item.quantity = new_total_qty
                existing_item.save(update_fields=["quantity", "updated_at"])
            else:
                CartItem.objects.create(
                    cart=cart,
                    variant=variant,
                    quantity=requested_quantity,
                )

            cart.save(update_fields=["updated_at"])

        # Fetch refreshed cart with relations
        cart = Cart.objects.prefetch_related(
            "items__variant__product__category"
        ).get(id=cart.id)

        response_data = CartSerializer(cart).data
        response = Response(response_data, status=status.HTTP_201_CREATED)
        return _attach_cart_session(response, cart)


class CartItemDetailView(APIView):
    """
    Manage an individual cart line item.

    PATCH: Update item quantity.
    DELETE: Remove item from cart.
    """

    permission_classes = [AllowAny]

    def patch(self, request: Request, item_id: str, *args: Any, **kwargs: Any) -> Response:
        serializer = UpdateCartItemInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_quantity = serializer.validated_data["quantity"]

        cart = _get_cart(request, must_exist=True)

        cart_item = (
            cart.items.select_related("variant__product", "variant__inventory")
            .filter(id=item_id)
            .first()
        )
        if not cart_item:
            raise NotFound("The specified cart item was not found in your cart.")

        # Revalidate variant and stock
        variant = cart_item.variant
        if not variant.is_active or not variant.product.is_active:
            raise InactiveVariantError("The selected product variant is no longer active.")

        inventory = getattr(variant, "inventory", None)
        available_stock = inventory.quantity_available if inventory else 0

        if new_quantity > available_stock:
            raise InsufficientStockError(
                f"Requested quantity ({new_quantity}) exceeds available stock ({available_stock})."
            )

        with transaction.atomic():
            cart_item.quantity = new_quantity
            cart_item.save(update_fields=["quantity", "updated_at"])
            cart.save(update_fields=["updated_at"])

        cart = Cart.objects.prefetch_related(
            "items__variant__product__category"
        ).get(id=cart.id)

        response = Response(CartSerializer(cart).data, status=status.HTTP_200_OK)
        return _attach_cart_session(response, cart)

    def delete(self, request: Request, item_id: str, *args: Any, **kwargs: Any) -> Response:
        """Idempotently removes an item from the cart."""
        cart = _get_cart(request, must_exist=True)

        with transaction.atomic():
            cart.items.filter(id=item_id).delete()
            cart.save(update_fields=["updated_at"])

        cart = Cart.objects.prefetch_related(
            "items__variant__product__category"
        ).get(id=cart.id)

        response = Response(CartSerializer(cart).data, status=status.HTTP_200_OK)
        return _attach_cart_session(response, cart)


class CartClearView(APIView):
    """Explicit endpoint for clearing all items from the active cart."""

    permission_classes = [AllowAny]

    def delete(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return CartView().delete(request, *args, **kwargs)
