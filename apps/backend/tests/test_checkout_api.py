from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
import uuid

from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.addresses.models import Address
from apps.cart.models import Cart, CartItem
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import InventoryItem
from apps.orders.models import Order, OrderItem


class CheckoutApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="checkout@example.com",
        )
        self.client.force_authenticate(user=self.user)

        self.category = Category.objects.create(name="Dresses", slug="dresses")
        self.product = Product.objects.create(
            name="Chanderi Maxi Dress",
            slug="chanderi-maxi-dress",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="CHK-MAXI-S",
            size="S",
            color="Emerald",
            retail_price=Decimal("4500.00"),
            is_active=True,
        )
        self.inventory = InventoryItem.objects.create(
            variant=self.variant,
            quantity_available=5,
            quantity_reserved=0,
        )

        self.address = Address.objects.create(
            user=self.user,
            full_name="Test Buyer",
            phone="9876543210",
            address_line1="12 Market Road",
            city="Mumbai",
            state="Maharashtra",
            postal_code="400001",
            country="India",
            is_default=True,
        )

        self.cart = Cart.objects.create(user=self.user, is_active=True)
        CartItem.objects.create(cart=self.cart, variant=self.variant, quantity=2)

    def test_checkout_creates_order_and_keeps_inventory_unchanged(self):
        starting_inventory = self.inventory.quantity_available

        response = self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["currency"], "INR")
        self.assertEqual(data["status"], "PENDING")
        self.assertEqual(data["payment_status"], "PENDING")
        self.assertEqual(data["total"], "9000.00")
        self.assertEqual(data["items"][0]["quantity"], 2)
        self.assertEqual(data["shipping_address_snapshot"]["full_name"], "Test Buyer")

        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderItem.objects.count(), 1)
        self.assertEqual(self.cart.items.count(), 0)

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_available, starting_inventory)
        self.assertEqual(self.inventory.quantity_reserved, 0)

    def test_checkout_requires_valid_shipping_address_for_authenticated_user(self):
        other_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="other@example.com",
        )
        other_address = Address.objects.create(
            user=other_user,
            full_name="Other User",
            phone="9876543211",
            address_line1="99 Other Street",
            city="Pune",
            state="Maharashtra",
            postal_code="411001",
            country="India",
            is_default=True,
        )

        response = self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(other_address.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_ERROR")

    def test_checkout_is_idempotent_for_same_key(self):
        response = self.client.post(
            "/api/v1/checkout/",
            data={
                "shipping_address_id": str(self.address.id),
                "idempotency_key": "checkout-repeat-1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        first_order_number = response.json()["order_number"]

        retry = self.client.post(
            "/api/v1/checkout/",
            data={
                "shipping_address_id": str(self.address.id),
                "idempotency_key": "checkout-repeat-1",
            },
            format="json",
        )

        self.assertEqual(retry.status_code, status.HTTP_200_OK)
        self.assertEqual(retry.json()["order_number"], first_order_number)
        self.assertEqual(Order.objects.count(), 1)

    def test_checkout_idempotency_key_survives_cache_clear(self):
        response = self.client.post(
            "/api/v1/checkout/",
            data={
                "shipping_address_id": str(self.address.id),
                "idempotency_key": "checkout-persistent-1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        first_order_number = response.json()["order_number"]

        cache.clear()

        retry = self.client.post(
            "/api/v1/checkout/",
            data={
                "shipping_address_id": str(self.address.id),
                "idempotency_key": "checkout-persistent-1",
            },
            format="json",
        )

        self.assertEqual(retry.status_code, status.HTTP_200_OK)
        self.assertEqual(retry.json()["order_number"], first_order_number)
        self.assertEqual(Order.objects.count(), 1)

    def test_checkout_rejects_second_idempotency_key_for_same_cart(self):
        first = self.client.post(
            "/api/v1/checkout/",
            data={
                "shipping_address_id": str(self.address.id),
                "idempotency_key": "checkout-key-a",
            },
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        first_order_number = first.json()["order_number"]

        second = self.client.post(
            "/api/v1/checkout/",
            data={
                "shipping_address_id": str(self.address.id),
                "idempotency_key": "checkout-key-b",
            },
            format="json",
        )

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.json()["order_number"], first_order_number)
        self.assertEqual(Order.objects.count(), 1)

    def test_duplicate_checkout_from_same_cart_cannot_create_two_orders(self):
        first = self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.json()["order_number"], first.json()["order_number"])
        self.assertEqual(Order.objects.count(), 1)

    def test_concurrent_checkout_requests_for_same_cart_cannot_create_duplicate_orders(self):
        def submit_checkout(key_suffix: str):
            client = APIClient()
            client.force_authenticate(user=self.user)
            response = client.post(
                "/api/v1/checkout/",
                data={
                    "shipping_address_id": str(self.address.id),
                    "idempotency_key": f"concurrent-key-{key_suffix}",
                },
                format="json",
            )
            return response

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(submit_checkout, ["a", "b"]))

        statuses = {response.status_code for response in results}
        self.assertTrue(statuses.issubset({status.HTTP_200_OK, status.HTTP_201_CREATED}))
        order_numbers = {
            response.json()["order_number"]
            for response in results
            if response.status_code in {status.HTTP_200_OK, status.HTTP_201_CREATED}
        }
        self.assertEqual(len(order_numbers), 1)
        self.assertEqual(Order.objects.count(), 1)

    def test_checkout_rejects_insufficient_stock_and_leaves_cart_and_inventory_intact(self):
        self.inventory.quantity_available = 1
        self.inventory.save(update_fields=["quantity_available", "updated_at"])
        starting_inventory = self.inventory.quantity_available

        response = self.client.post(
            "/api/v1/checkout/",
            data={"shipping_address_id": str(self.address.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"]["code"], "INSUFFICIENT_STOCK")
        self.assertEqual(Order.objects.count(), 0)
        self.cart.refresh_from_db()
        self.assertEqual(self.cart.items.count(), 1)

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_available, starting_inventory)
        self.assertEqual(self.inventory.quantity_reserved, 0)
