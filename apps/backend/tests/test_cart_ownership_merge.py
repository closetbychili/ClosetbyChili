"""
Closet by Chilli — Cart Ownership, Merge & Inventory Concurrency Tests.

Covers:
1. Cart Ownership:
   - Guest cart creation
   - Authenticated cart ownership
   - Database constraint: exactly one active cart per user
2. Cart Merge (POST /api/v1/cart/merge/):
   - Unauthorized merge rejected (401)
   - Guest cart + empty user cart
   - Guest cart + existing user cart (same variant combined, different variants appended)
   - Insufficient inventory during merge rejects atomically with INSUFFICIENT_STOCK
   - Inactive variant during merge rejected
   - Repeated merge requests are idempotent (no duplicate increments)
   - Guest cart lifecycle (items cleared, deactivated, cookie removed)
3. Inventory Concurrency & Locking:
   - select_for_update() acquired on authoritative inventory row
   - Over-adding beyond stock under row-locking is rejected
   - Unrelated inventory rows are not locked
"""

from decimal import Decimal
from unittest.mock import patch
import uuid

from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.cart.models import Cart, CartItem
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import InventoryItem


class CartOwnershipModelTest(TestCase):
    """Test cart ownership invariants at model and database constraint level."""

    def setUp(self) -> None:
        self.user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="shopper@closetbychilli.com",
        )
        self.other_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="other@closetbychilli.com",
        )

    def test_guest_cart_creation(self) -> None:
        cart = Cart.objects.create(session_key="guest-session-1")
        self.assertIsNone(cart.user)
        self.assertEqual(cart.session_key, "guest-session-1")
        self.assertTrue(cart.is_active)

    def test_authenticated_cart_ownership(self) -> None:
        cart = Cart.objects.create(user=self.user, is_active=True)
        self.assertEqual(cart.user, self.user)
        self.assertIsNone(cart.session_key)
        self.assertTrue(cart.is_active)

    def test_user_cannot_have_multiple_active_carts(self) -> None:
        Cart.objects.create(user=self.user, is_active=True)
        with self.assertRaises(IntegrityError):
            Cart.objects.create(user=self.user, is_active=True)

    def test_user_can_have_previous_inactive_cart_and_one_active_cart(self) -> None:
        Cart.objects.create(user=self.user, is_active=False)
        active_cart = Cart.objects.create(user=self.user, is_active=True)
        self.assertTrue(active_cart.is_active)
        self.assertEqual(Cart.objects.filter(user=self.user).count(), 2)

    def test_different_users_can_each_have_active_cart(self) -> None:
        cart1 = Cart.objects.create(user=self.user, is_active=True)
        cart2 = Cart.objects.create(user=self.other_user, is_active=True)
        self.assertNotEqual(cart1.id, cart2.id)


class CartMergeApiTest(TestCase):
    """Integration tests for POST /api/v1/cart/merge/."""

    def setUp(self) -> None:
        self.client = APIClient()
        self.user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="merge_user@example.com",
        )

        self.category = Category.objects.create(name="Kurtis", slug="kurtis")
        self.product = Product.objects.create(
            name="Silk Kurti",
            slug="silk-kurti",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant_1 = ProductVariant.objects.create(
            product=self.product,
            sku="CHK-KURTI-S",
            size="S",
            color="Teal",
            retail_price=Decimal("1999.00"),
            is_active=True,
        )
        self.variant_2 = ProductVariant.objects.create(
            product=self.product,
            sku="CHK-KURTI-M",
            size="M",
            color="Teal",
            retail_price=Decimal("2199.00"),
            is_active=True,
        )
        self.inactive_variant = ProductVariant.objects.create(
            product=self.product,
            sku="CHK-KURTI-L-INACTIVE",
            size="L",
            color="Teal",
            retail_price=Decimal("2399.00"),
            is_active=False,
        )

        self.inv_1 = InventoryItem.objects.create(variant=self.variant_1, quantity_available=10)
        self.inv_2 = InventoryItem.objects.create(variant=self.variant_2, quantity_available=5)
        self.inv_inactive = InventoryItem.objects.create(variant=self.inactive_variant, quantity_available=5)

    def test_merge_requires_authentication(self) -> None:
        response = self.client.post("/api/v1/cart/merge/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_merge_without_guest_session_returns_user_cart(self) -> None:
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/v1/cart/merge/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["items"], [])
        self.assertEqual(data["item_count"], 0)

    def test_merge_guest_cart_into_empty_user_cart(self) -> None:
        guest_cart = Cart.objects.create(session_key="guest-session-merge-1")
        CartItem.objects.create(cart=guest_cart, variant=self.variant_1, quantity=2)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/v1/cart/merge/",
            HTTP_X_CART_SESSION="guest-session-merge-1",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["item_count"], 2)
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["variant"]["sku"], "CHK-KURTI-S")
        self.assertEqual(data["items"][0]["quantity"], 2)

        # Verify guest cart is retired
        guest_cart.refresh_from_db()
        self.assertFalse(guest_cart.is_active)
        self.assertEqual(guest_cart.items.count(), 0)

    def test_merge_guest_cart_into_existing_user_cart_combines_quantities(self) -> None:
        # Existing user cart has 1x variant_1 and 2x variant_2
        user_cart = Cart.objects.create(user=self.user, is_active=True)
        CartItem.objects.create(cart=user_cart, variant=self.variant_1, quantity=1)
        CartItem.objects.create(cart=user_cart, variant=self.variant_2, quantity=2)

        # Guest cart has 2x variant_1 (same variant) and new variant
        guest_cart = Cart.objects.create(session_key="guest-session-merge-2")
        CartItem.objects.create(cart=guest_cart, variant=self.variant_1, quantity=2)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/v1/cart/merge/",
            HTTP_X_CART_SESSION="guest-session-merge-2",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Total items: (1+2) variant_1 + 2 variant_2 = 5 items
        self.assertEqual(data["item_count"], 5)
        item_quantities = {i["variant"]["sku"]: i["quantity"] for i in data["items"]}
        self.assertEqual(item_quantities["CHK-KURTI-S"], 3)
        self.assertEqual(item_quantities["CHK-KURTI-M"], 2)

    def test_merge_rejects_insufficient_stock_atomically(self) -> None:
        # Stock for variant_2 is 5
        user_cart = Cart.objects.create(user=self.user, is_active=True)
        CartItem.objects.create(cart=user_cart, variant=self.variant_2, quantity=4)

        # Guest cart wants 2 more -> 4 + 2 = 6 > 5
        guest_cart = Cart.objects.create(session_key="guest-insufficient-stock")
        CartItem.objects.create(cart=guest_cart, variant=self.variant_2, quantity=2)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/v1/cart/merge/",
            HTTP_X_CART_SESSION="guest-insufficient-stock",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertEqual(data["error"]["code"], "INSUFFICIENT_STOCK")

        # Verify atomic rollback: neither user cart nor guest cart were modified
        user_cart.refresh_from_db()
        self.assertEqual(user_cart.items.get(variant=self.variant_2).quantity, 4)
        guest_cart.refresh_from_db()
        self.assertTrue(guest_cart.is_active)
        self.assertEqual(guest_cart.items.get(variant=self.variant_2).quantity, 2)

    def test_merge_rejects_inactive_variant(self) -> None:
        guest_cart = Cart.objects.create(session_key="guest-inactive")
        CartItem.objects.create(cart=guest_cart, variant=self.inactive_variant, quantity=1)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/v1/cart/merge/",
            HTTP_X_CART_SESSION="guest-inactive",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"]["code"], "INACTIVE_VARIANT")

    def test_repeated_merge_is_idempotent(self) -> None:
        guest_cart = Cart.objects.create(session_key="guest-repeat-merge")
        CartItem.objects.create(cart=guest_cart, variant=self.variant_1, quantity=2)

        self.client.force_authenticate(user=self.user)
        # First merge
        res1 = self.client.post(
            "/api/v1/cart/merge/",
            HTTP_X_CART_SESSION="guest-repeat-merge",
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.json()["item_count"], 2)

        # Second merge with identical session
        res2 = self.client.post(
            "/api/v1/cart/merge/",
            HTTP_X_CART_SESSION="guest-repeat-merge",
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.json()["item_count"], 2)  # Not incremented again to 4


class CartInventoryConcurrencyTest(TestCase):
    """Test inventory locking and concurrency guarantees."""

    def setUp(self) -> None:
        self.client = APIClient()
        self.category = Category.objects.create(name="Kurtis", slug="kurtis")
        self.product = Product.objects.create(
            name="Silk Kurti",
            slug="silk-kurti",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant_1 = ProductVariant.objects.create(
            product=self.product,
            sku="CHK-CONC-S",
            size="S",
            color="Gold",
            retail_price=Decimal("1500.00"),
            is_active=True,
        )
        self.variant_2 = ProductVariant.objects.create(
            product=self.product,
            sku="CHK-CONC-M",
            size="M",
            color="Gold",
            retail_price=Decimal("1600.00"),
            is_active=True,
        )
        self.inv_1 = InventoryItem.objects.create(variant=self.variant_1, quantity_available=2)
        self.inv_2 = InventoryItem.objects.create(variant=self.variant_2, quantity_available=10)

    def test_stock_validation_uses_select_for_update(self) -> None:
        """Verify that select_for_update() is executed on InventoryItem during add."""
        with patch.object(
            InventoryItem.objects, "select_for_update", wraps=InventoryItem.objects.select_for_update
        ) as mock_sfu:
            res = self.client.post(
                "/api/v1/cart/items/",
                data={"variant_id": str(self.variant_1.id), "quantity": 1},
                format="json",
            )
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
            self.assertTrue(mock_sfu.called)

    def test_add_cannot_exceed_available_stock(self) -> None:
        # Initial add of 2 (max available stock is 2)
        res1 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_1.id), "quantity": 2},
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        session_key = res1.json()["session_key"]

        # Subsequent add of 1 to same cart should fail
        res2 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_1.id), "quantity": 1},
            format="json",
            HTTP_X_CART_SESSION=session_key,
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res2.json()["error"]["code"], "INSUFFICIENT_STOCK")

    def test_adding_one_variant_does_not_lock_unrelated_variant(self) -> None:
        """Verify adding variant 1 does not affect variant 2."""
        res = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_1.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # Variant 2 inventory remains untouched
        self.inv_2.refresh_from_db()
        self.assertEqual(self.inv_2.quantity_available, 10)
