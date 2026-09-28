from __future__ import annotations

import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalog.models import Category, Product, ProductVariant
from apps.orders.models import Order, OrderItem


class OrderModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="buyer@example.com",
        )
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

    def test_order_creation_generates_order_number_and_saves_totals(self):
        order = Order.objects.create(
            user=self.user,
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            currency="INR",
            subtotal=Decimal("4500.00"),
            discount=Decimal("0.00"),
            shipping_amount=Decimal("100.00"),
            tax_amount=Decimal("450.00"),
            total=Decimal("5050.00"),
        )

        self.assertTrue(order.order_number.startswith("CBC-"))
        self.assertRegex(order.order_number, r"^CBC-\d{4}-\d{6}$")
        self.assertEqual(Order.objects.count(), 1)

    def test_order_number_is_unique(self):
        order_one = Order.objects.create(
            user=self.user,
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            currency="INR",
            subtotal=Decimal("100.00"),
            discount=Decimal("0.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("100.00"),
        )
        order_two = Order.objects.create(
            user=self.user,
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            currency="INR",
            subtotal=Decimal("200.00"),
            discount=Decimal("0.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("200.00"),
        )

        self.assertNotEqual(order_one.order_number, order_two.order_number)
        self.assertEqual(len({order_one.order_number, order_two.order_number}), 2)

    def test_negative_money_values_are_invalid(self):
        order = Order(
            user=self.user,
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            currency="INR",
            subtotal=Decimal("-50.00"),
            discount=Decimal("0.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("-50.00"),
        )

        with self.assertRaises(ValidationError):
            order.full_clean()

    def test_quantity_must_be_positive(self):
        order = Order.objects.create(
            user=self.user,
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            currency="INR",
            subtotal=Decimal("120.00"),
            discount=Decimal("0.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("120.00"),
        )
        item = OrderItem(
            order=order,
            product=self.product,
            variant=self.variant,
            product_name=self.product.name,
            variant_name="S / Emerald",
            sku=self.variant.sku,
            unit_price=Decimal("120.00"),
            quantity=0,
            line_total=Decimal("0.00"),
        )

        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_order_item_snapshot_survives_product_variant_deletion(self):
        order = Order.objects.create(
            user=self.user,
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            currency="INR",
            subtotal=Decimal("4500.00"),
            discount=Decimal("0.00"),
            shipping_amount=Decimal("100.00"),
            tax_amount=Decimal("450.00"),
            total=Decimal("5050.00"),
        )
        item = OrderItem.objects.create(
            order=order,
            product=self.product,
            variant=self.variant,
            product_name=self.product.name,
            variant_name="S / Emerald",
            sku=self.variant.sku,
            unit_price=Decimal("4500.00"),
            quantity=1,
            line_total=Decimal("4500.00"),
        )

        self.variant.delete()
        item.refresh_from_db()

        self.assertEqual(item.product_name, self.product.name)
        self.assertEqual(item.variant_name, "S / Emerald")
        self.assertEqual(item.sku, "CHK-MAXI-S")
        self.assertIsNone(item.variant)

    def test_order_number_generation_is_unique_across_multiple_creates(self):
        numbers = []
        for _ in range(4):
            order = Order.objects.create(
                user=self.user,
                status=Order.Status.PENDING,
                payment_status=Order.PaymentStatus.PENDING,
                currency="INR",
                subtotal=Decimal("100.00"),
                discount=Decimal("0.00"),
                shipping_amount=Decimal("0.00"),
                tax_amount=Decimal("0.00"),
                total=Decimal("100.00"),
            )
            numbers.append(order.order_number)

        self.assertEqual(len(numbers), len(set(numbers)))


class OrderApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="buyer-a@example.com",
        )
        self.user_b = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="buyer-b@example.com",
        )
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

        self.order_one = Order.objects.create(
            user=self.user_a,
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            currency="INR",
            subtotal=Decimal("4500.00"),
            discount=Decimal("0.00"),
            shipping_amount=Decimal("100.00"),
            tax_amount=Decimal("450.00"),
            total=Decimal("5050.00"),
        )
        OrderItem.objects.create(
            order=self.order_one,
            product=self.product,
            variant=self.variant,
            product_name=self.product.name,
            variant_name="S / Emerald",
            sku=self.variant.sku,
            unit_price=Decimal("4500.00"),
            quantity=1,
            line_total=Decimal("4500.00"),
        )

        self.order_two = Order.objects.create(
            user=self.user_b,
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            currency="INR",
            subtotal=Decimal("9000.00"),
            discount=Decimal("0.00"),
            shipping_amount=Decimal("150.00"),
            tax_amount=Decimal("900.00"),
            total=Decimal("10050.00"),
        )
        OrderItem.objects.create(
            order=self.order_two,
            product=self.product,
            variant=self.variant,
            product_name=self.product.name,
            variant_name="S / Emerald",
            sku=self.variant.sku,
            unit_price=Decimal("9000.00"),
            quantity=1,
            line_total=Decimal("9000.00"),
        )

    def test_unauthenticated_access_rejected(self):
        response = self.client.get("/api/v1/orders/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_sees_only_their_orders(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/v1/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["order_number"], self.order_one.order_number)

    def test_user_cannot_access_another_users_order(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(f"/api/v1/orders/{self.order_two.order_number}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_fields_are_returned(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/v1/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["results"][0]
        self.assertIn("order_number", data)
        self.assertIn("status", data)
        self.assertIn("payment_status", data)
        self.assertIn("total", data)
        self.assertIn("currency", data)
        self.assertIn("created_at", data)
        self.assertIn("item_count", data)

    def test_detail_fields_are_returned(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(f"/api/v1/orders/{self.order_one.order_number}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data["order_number"], self.order_one.order_number)
        self.assertEqual(data["status"], self.order_one.status)
        self.assertEqual(data["payment_status"], self.order_one.payment_status)
        self.assertEqual(data["currency"], self.order_one.currency)
        self.assertEqual(data["subtotal"], "4500.00")
        self.assertEqual(data["shipping_amount"], "100.00")
        self.assertEqual(data["item_count"], 1)
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["product_name"], self.product.name)

    def test_orders_are_ordered_deterministically(self):
        other = Order.objects.create(
            user=self.user_a,
            status=Order.Status.PROCESSING,
            payment_status=Order.PaymentStatus.PENDING,
            currency="INR",
            subtotal=Decimal("300.00"),
            discount=Decimal("0.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("300.00"),
        )
        OrderItem.objects.create(
            order=other,
            product=self.product,
            variant=self.variant,
            product_name=self.product.name,
            variant_name="S / Emerald",
            sku=self.variant.sku,
            unit_price=Decimal("300.00"),
            quantity=1,
            line_total=Decimal("300.00"),
        )

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/v1/orders/")
        numbers = [row["order_number"] for row in response.data["results"]]
        self.assertEqual(numbers, sorted(numbers, reverse=True))

    def test_order_detail_query_count_is_reasonable(self):
        self.client.force_authenticate(user=self.user_a)
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(f"/api/v1/orders/{self.order_one.order_number}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(len(ctx.captured_queries), 12)
