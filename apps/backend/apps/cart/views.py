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
from rest_framework.permissions import AllowAny, IsAuthenticated
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
from apps.inventory.models import InventoryItem


def _extract_session_key(request: Request) -> str | None:
    """
    Extract guest session token from X-Cart-Session header or cart_session cookie.
    """
    session_key = request.headers.get("X-Cart-Session") or request.COOKIES.get(
        "cart_session"
    )
    if session_key:
        return session_key.strip()
    return None


def _get_cart(request: Request, must_exist: bool = False) -> Cart | None:
    """
    Look up the active cart for the current user or guest session.

    If must_exist is True and a cart cannot be found, raises CartSessionExpiredError.
    """
    if getattr(request, "user", None) and request.user.is_authenticated:
        cart = (
            Cart.objects.prefetch_related(
                "items__variant__product__category",
            )
            .filter(user=request.user, is_active=True)
            .first()
        )
        if not cart and must_exist:
            raise CartSessionExpiredError("User cart does not exist or has expired.")
        return cart

    session_key = _extract_session_key(request)
    if not session_key:
        if must_exist:
            raise CartSessionExpiredError("No cart session provided.")
        return None

    cart = (
        Cart.objects.prefetch_related(
            "items__variant__product__category",
        )
        .filter(session_key=session_key, is_active=True)
        .first()
    )

    if not cart and must_exist:
        raise CartSessionExpiredError(
            f"Cart session '{session_key}' is invalid or has expired."
        )

    return cart


def _get_or_create_cart(request: Request) -> tuple[Cart, bool]:
    """
    Look up an existing active cart or instantiate a new one.
    For authenticated users, looks up or creates by user.
    For guests, looks up or creates by secure session key.
    """
    if getattr(request, "user", None) and request.user.is_authenticated:
        cart = Cart.objects.filter(user=request.user, is_active=True).first()
        if cart:
            return cart, False
        cart, created = Cart.objects.get_or_create(
            user=request.user,
            is_active=True,
            defaults={"session_key": None},
        )
        return cart, created

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
    Set X-Cart-Session header and cart_session cookie for guest persistence.
    For authenticated carts without session_key, no guest session is attached.
    """
    if cart.session_key:
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
            raise InactiveVariantError(
                "The selected product variant is currently inactive."
            )

        if (
            variant.product.status != Product.Status.ACTIVE
            or not variant.product.is_active
        ):
            raise ValidationError(
                {
                    "variant_id": [
                        "This product is not currently available for purchase."
                    ]
                }
            )

        # Check stock availability
        inventory = getattr(variant, "inventory", None)
        available_stock = inventory.quantity_available if inventory else 0

        with transaction.atomic():
            # Acquire row-level lock on the authoritative inventory item
            inventory = (
                InventoryItem.objects.select_for_update()
                .filter(variant=variant)
                .first()
            )
            available_stock = inventory.quantity_available if inventory else 0

            cart, _ = _get_or_create_cart(request)

            existing_item = (
                cart.items.select_for_update().filter(variant=variant).first()
            )
            current_qty = existing_item.quantity if existing_item else 0
            new_total_qty = current_qty + requested_quantity

            if new_total_qty > available_stock:
                raise InsufficientStockError(
                    f"Requested total quantity ({new_total_qty}) "
                    f"exceeds available stock ({available_stock})."
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
        cart = Cart.objects.prefetch_related("items__variant__product__category").get(
            id=cart.id
        )

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

    def patch(
        self, request: Request, item_id: str, *args: Any, **kwargs: Any
    ) -> Response:
        serializer = UpdateCartItemInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_quantity = serializer.validated_data["quantity"]

        with transaction.atomic():
            cart = _get_cart(request, must_exist=True)

            cart_item = (
                cart.items.select_for_update()
                .select_related("variant__product")
                .filter(id=item_id)
                .first()
            )
            if not cart_item:
                raise NotFound("The specified cart item was not found in your cart.")

            # Revalidate variant and stock
            variant = cart_item.variant
            if not variant.is_active or not variant.product.is_active:
                raise InactiveVariantError(
                    "The selected product variant is no longer active."
                )

            inventory = (
                InventoryItem.objects.select_for_update()
                .filter(variant=variant)
                .first()
            )
            available_stock = inventory.quantity_available if inventory else 0

            if new_quantity > available_stock:
                raise InsufficientStockError(
                    f"Requested quantity ({new_quantity}) "
                    f"exceeds available stock ({available_stock})."
                )

            cart_item.quantity = new_quantity
            cart_item.save(update_fields=["quantity", "updated_at"])
            cart.save(update_fields=["updated_at"])

        cart = Cart.objects.prefetch_related("items__variant__product__category").get(
            id=cart.id
        )

        response = Response(CartSerializer(cart).data, status=status.HTTP_200_OK)
        return _attach_cart_session(response, cart)

    def delete(
        self, request: Request, item_id: str, *args: Any, **kwargs: Any
    ) -> Response:
        """Idempotently removes an item from the cart."""
        cart = _get_cart(request, must_exist=True)

        with transaction.atomic():
            cart.items.filter(id=item_id).delete()
            cart.save(update_fields=["updated_at"])

        cart = Cart.objects.prefetch_related("items__variant__product__category").get(
            id=cart.id
        )

        response = Response(CartSerializer(cart).data, status=status.HTTP_200_OK)
        return _attach_cart_session(response, cart)


class CartClearView(APIView):
    """Explicit endpoint for clearing all items from the active cart."""

    permission_classes = [AllowAny]

    def delete(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return CartView().delete(request, *args, **kwargs)


class CartMergeView(APIView):
    """
    Merge the guest shopping cart into the authenticated customer's cart.

    Requirements:
    - Requires authentication.
    - Identifies guest cart via X-Cart-Session header, cart_session cookie,
      or guest_session_key in request body.
    - Locks authoritative inventory rows in sorted order (deadlock prevention).
    - Validates available inventory and variant status atomically.
    - Retires guest cart on successful merge.
    - Idempotent: repeated calls do not duplicate quantities.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        guest_session_key = request.data.get(
            "guest_session_key"
        ) or _extract_session_key(request)
        user = request.user

        if not guest_session_key:
            user_cart, _ = Cart.objects.get_or_create(
                user=user,
                is_active=True,
                defaults={"session_key": None},
            )
            user_cart = Cart.objects.prefetch_related(
                "items__variant__product__category"
            ).get(id=user_cart.id)
            response = Response(
                CartSerializer(user_cart).data, status=status.HTTP_200_OK
            )
            response.delete_cookie("cart_session")
            return response

        with transaction.atomic():
            guest_cart = (
                Cart.objects.select_for_update()
                .filter(session_key=guest_session_key, is_active=True)
                .first()
            )

            user_cart, _ = Cart.objects.select_for_update().get_or_create(
                user=user,
                is_active=True,
                defaults={"session_key": None},
            )

            # If guest cart not found or identical to user cart -> no-op
            if not guest_cart or guest_cart.id == user_cart.id:
                user_cart = Cart.objects.prefetch_related(
                    "items__variant__product__category"
                ).get(id=user_cart.id)
                response = Response(
                    CartSerializer(user_cart).data, status=status.HTTP_200_OK
                )
                response.delete_cookie("cart_session")
                return response

            guest_items = list(
                guest_cart.items.select_for_update()
                .select_related("variant__product")
                .all()
            )

            if not guest_items:
                guest_cart.is_active = False
                guest_cart.save(update_fields=["is_active", "updated_at"])
                user_cart = Cart.objects.prefetch_related(
                    "items__variant__product__category"
                ).get(id=user_cart.id)
                response = Response(
                    CartSerializer(user_cart).data, status=status.HTTP_200_OK
                )
                response.delete_cookie("cart_session")
                return response

            # Sort variant IDs deterministically to avoid deadlocks across merges
            variant_ids = sorted({item.variant_id for item in guest_items})

            inventory_rows = {
                inv.variant_id: inv
                for inv in InventoryItem.objects.select_for_update()
                .filter(variant_id__in=variant_ids)
                .order_by("variant_id")
            }

            existing_user_items = {
                item.variant_id: item
                for item in user_cart.items.select_for_update().filter(
                    variant_id__in=variant_ids
                )
            }

            # Phase 1: Validation
            merge_plan = []
            for g_item in guest_items:
                variant = g_item.variant
                if (
                    not variant.is_active
                    or not variant.product.is_active
                    or variant.product.status != Product.Status.ACTIVE
                ):
                    raise InactiveVariantError(
                        f"Variant {variant.sku} is no longer active."
                    )

                inv = inventory_rows.get(variant.id)
                available = inv.quantity_available if inv else 0

                existing_u_item = existing_user_items.get(variant.id)
                current_u_qty = existing_u_item.quantity if existing_u_item else 0
                combined_qty = current_u_qty + g_item.quantity

                if combined_qty > available:
                    raise InsufficientStockError(
                        f"Requested total quantity ({combined_qty}) for "
                        f"{variant.sku} exceeds available stock ({available})."
                    )

                merge_plan.append((g_item, existing_u_item, combined_qty))

            # Phase 2: Execution (all items validated)
            for g_item, existing_u_item, combined_qty in merge_plan:
                if existing_u_item:
                    existing_u_item.quantity = combined_qty
                    existing_u_item.save(update_fields=["quantity", "updated_at"])
                else:
                    CartItem.objects.create(
                        cart=user_cart,
                        variant=g_item.variant,
                        quantity=combined_qty,
                    )

            # Phase 3: Retire guest cart
            guest_cart.items.all().delete()
            guest_cart.is_active = False
            guest_cart.save(update_fields=["is_active", "updated_at"])

            user_cart.save(update_fields=["updated_at"])

        user_cart = Cart.objects.prefetch_related(
            "items__variant__product__category"
        ).get(id=user_cart.id)

        response = Response(CartSerializer(user_cart).data, status=status.HTTP_200_OK)
        response.delete_cookie("cart_session")
        return response
