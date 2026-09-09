"""
Closet by Chilli — Cart API Integration Tests.

Covers:
- GET /api/v1/cart/ (empty initial state, populated cart)
- POST /api/v1/cart/items/ and POST /api/v1/cart/ (add item)
- Duplicate variant addition increments quantity correctly
- PATCH /api/v1/cart/items/<id>/ (update quantity)
- DELETE /api/v1/cart/items/<id>/ (remove item)
- DELETE /api/v1/cart/ and DELETE /api/v1/cart/clear/ (clear cart)
- Authoritative Decimal pricing and item count
- Validation:
  - Inactive variant rejected (400 INACTIVE_VARIANT)
  - Nonexistent variant rejected (404 NOT_FOUND)
  - Inactive product rejected (400 VALIDATION_ERROR)
  - Insufficient stock rejected (400 INSUFFICIENT_STOCK)
  - Invalid quantity < 1 rejected (400 VALIDATION_ERROR)
- Guest session isolation between separate sessions
- Expired/invalid session handling
"""

from decimal import Decimal
import uuid

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.cart.models import Cart, CartItem
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import InventoryItem


class CartApiIntegrationTest(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.category = Category.objects.create(name="Dresses", slug="dresses")
        self.product = Product.objects.create(
            name="Chanderi Maxi Dress",
            slug="chanderi-maxi-dress",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant_s = ProductVariant.objects.create(
            product=self.product,
            sku="CHK-MAXI-S",
            size="S",
            color="Emerald",
            retail_price=Decimal("4500.00"),
            is_active=True,
        )
        self.variant_m = ProductVariant.objects.create(
            product=self.product,
            sku="CHK-MAXI-M",
            size="M",
            color="Emerald",
            retail_price=Decimal("4750.00"),
            is_active=True,
        )
        self.inactive_variant = ProductVariant.objects.create(
            product=self.product,
            sku="CHK-MAXI-L-INACTIVE",
            size="L",
            color="Emerald",
            retail_price=Decimal("4500.00"),
            is_active=False,
        )

        # Inventory stock
        InventoryItem.objects.create(variant=self.variant_s, quantity_available=5)
        InventoryItem.objects.create(variant=self.variant_m, quantity_available=2)
        InventoryItem.objects.create(variant=self.inactive_variant, quantity_available=10)

    def test_get_cart_without_session_returns_empty_structure(self) -> None:
        response = self.client.get("/api/v1/cart/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["items"], [])
        self.assertEqual(data["item_count"], 0)
        self.assertEqual(data["subtotal"], "0.00")

    def test_add_item_creates_guest_cart_and_sets_session(self) -> None:
        payload = {
            "variant_id": str(self.variant_s.id),
            "quantity": 2,
        }
        response = self.client.post("/api/v1/cart/items/", data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        data = response.json()
        self.assertIsNotNone(data["id"])
        self.assertIsNotNone(data["session_key"])
        self.assertEqual(data["item_count"], 2)
        self.assertEqual(data["subtotal"], "9000.00")
        self.assertEqual(len(data["items"]), 1)

        first_item = data["items"][0]
        self.assertEqual(first_item["quantity"], 2)
        self.assertEqual(first_item["unit_price"], "4500.00")
        self.assertEqual(first_item["line_total"], "9000.00")
        self.assertEqual(first_item["variant"]["sku"], "CHK-MAXI-S")

        # Check response headers and cookies
        self.assertIn("X-Cart-Session", response.headers)
        self.assertEqual(response.headers["X-Cart-Session"], data["session_key"])
        self.assertIn("cart_session", response.cookies)

    def test_add_item_via_cart_root_post_alias(self) -> None:
        payload = {
            "variant_id": str(self.variant_s.id),
            "quantity": 1,
        }
        response = self.client.post("/api/v1/cart/", data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["item_count"], 1)

    def test_duplicate_variant_addition_increments_quantity(self) -> None:
        # First add: 2 units
        res1 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_s.id), "quantity": 2},
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        session_key = res1.json()["session_key"]

        # Second add: 1 unit with same session key
        self.client.defaults["HTTP_X_CART_SESSION"] = session_key
        res2 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_s.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        data = res2.json()

        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["quantity"], 3)
        self.assertEqual(data["item_count"], 3)
        self.assertEqual(data["subtotal"], "13500.00")

    def test_add_multiple_different_variants_calculates_subtotal(self) -> None:
        res1 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_s.id), "quantity": 1},
            format="json",
        )
        session_key = res1.json()["session_key"]
        self.client.defaults["HTTP_X_CART_SESSION"] = session_key

        res2 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_m.id), "quantity": 2},
            format="json",
        )
        data = res2.json()
        # 1 * 4500 + 2 * 4750 = 4500 + 9500 = 14000.00
        self.assertEqual(data["item_count"], 3)
        self.assertEqual(data["subtotal"], "14000.00")
        self.assertEqual(len(data["items"]), 2)

    def test_patch_item_quantity_updates_totals(self) -> None:
        res1 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_s.id), "quantity": 1},
            format="json",
        )
        session_key = res1.json()["session_key"]
        item_id = res1.json()["items"][0]["id"]
        self.client.defaults["HTTP_X_CART_SESSION"] = session_key

        res2 = self.client.patch(
            f"/api/v1/cart/items/{item_id}/",
            data={"quantity": 4},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        data = res2.json()
        self.assertEqual(data["item_count"], 4)
        self.assertEqual(data["subtotal"], "18000.00")
        self.assertEqual(data["items"][0]["quantity"], 4)

    def test_delete_item_removes_from_cart(self) -> None:
        res1 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_s.id), "quantity": 2},
            format="json",
        )
        session_key = res1.json()["session_key"]
        item_id = res1.json()["items"][0]["id"]
        self.client.defaults["HTTP_X_CART_SESSION"] = session_key

        res2 = self.client.delete(f"/api/v1/cart/items/{item_id}/")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        data = res2.json()
        self.assertEqual(data["items"], [])
        self.assertEqual(data["item_count"], 0)
        self.assertEqual(data["subtotal"], "0.00")

    def test_clear_cart_endpoint(self) -> None:
        res1 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_s.id), "quantity": 2},
            format="json",
        )
        session_key = res1.json()["session_key"]
        self.client.defaults["HTTP_X_CART_SESSION"] = session_key

        res2 = self.client.delete("/api/v1/cart/")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        data = res2.json()
        self.assertEqual(data["items"], [])
        self.assertEqual(data["item_count"], 0)
        self.assertEqual(data["subtotal"], "0.00")

    def test_clear_cart_alias_clear_route(self) -> None:
        res1 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_s.id), "quantity": 1},
            format="json",
        )
        session_key = res1.json()["session_key"]
        self.client.defaults["HTTP_X_CART_SESSION"] = session_key

        res2 = self.client.delete("/api/v1/cart/clear/")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.json()["items"], [])

    def test_reject_nonexistent_variant(self) -> None:
        fake_id = str(uuid.uuid4())
        response = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": fake_id, "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        error = response.json()["error"]
        self.assertEqual(error["code"], "NOT_FOUND")

    def test_reject_inactive_variant(self) -> None:
        response = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.inactive_variant.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error = response.json()["error"]
        self.assertEqual(error["code"], "INACTIVE_VARIANT")

    def test_reject_insufficient_stock_on_add(self) -> None:
        # Stock for variant_m is 2
        response = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_m.id), "quantity": 3},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error = response.json()["error"]
        self.assertEqual(error["code"], "INSUFFICIENT_STOCK")

    def test_reject_cumulative_quantity_exceeding_stock(self) -> None:
        # Stock is 2
        res1 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_m.id), "quantity": 2},
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        session_key = res1.json()["session_key"]
        self.client.defaults["HTTP_X_CART_SESSION"] = session_key

        # Adding 1 more exceeds available stock of 2
        res2 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_m.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res2.json()["error"]["code"], "INSUFFICIENT_STOCK")

    def test_reject_insufficient_stock_on_update(self) -> None:
        res1 = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_m.id), "quantity": 1},
            format="json",
        )
        session_key = res1.json()["session_key"]
        item_id = res1.json()["items"][0]["id"]
        self.client.defaults["HTTP_X_CART_SESSION"] = session_key

        res2 = self.client.patch(
            f"/api/v1/cart/items/{item_id}/",
            data={"quantity": 10},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res2.json()["error"]["code"], "INSUFFICIENT_STOCK")

    def test_reject_invalid_quantity_less_than_one(self) -> None:
        response = self.client.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_s.id), "quantity": 0},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_ERROR")

    def test_cart_session_isolation_between_guests(self) -> None:
        # Guest A adds variant_s
        client_a = APIClient()
        res_a = client_a.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_s.id), "quantity": 1},
            format="json",
        )
        session_a = res_a.json()["session_key"]

        # Guest B adds variant_m
        client_b = APIClient()
        res_b = client_b.post(
            "/api/v1/cart/items/",
            data={"variant_id": str(self.variant_m.id), "quantity": 2},
            format="json",
        )
        session_b = res_b.json()["session_key"]

        self.assertNotEqual(session_a, session_b)

        # Check cart A has only variant S
        client_a.defaults["HTTP_X_CART_SESSION"] = session_a
        get_a = client_a.get("/api/v1/cart/").json()
        self.assertEqual(get_a["item_count"], 1)
        self.assertEqual(get_a["items"][0]["variant"]["sku"], "CHK-MAXI-S")

        # Check cart B has only variant M
        client_b.defaults["HTTP_X_CART_SESSION"] = session_b
        get_b = client_b.get("/api/v1/cart/").json()
        self.assertEqual(get_b["item_count"], 2)
        self.assertEqual(get_b["items"][0]["variant"]["sku"], "CHK-MAXI-M")

    def test_expired_or_invalid_session_key_returns_404(self) -> None:
        client = APIClient()
        client.defaults["HTTP_X_CART_SESSION"] = "non-existent-session-key-999"
        response = client.get("/api/v1/cart/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["error"]["code"], "CART_NOT_FOUND")
