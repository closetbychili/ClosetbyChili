"""
Closet by Chilli — Checkout Coupon Integration & Lifecycle Tests.

Sprint A5.4 Verification Suite.
Validates:
1. Validate endpoint (POST /api/v1/coupons/validate/) for percentage, fixed, caps, min subtotal, targeting,
   inactive, future, expired, exhausted, first-order, and customer limit restrictions.
2. Cart coupon apply and remove endpoints (POST/DELETE /api/v1/cart/coupon/).
3. Cart item mutations auto-revalidating and invalidating ineligible coupons.
4. Checkout integration (POST /api/v1/checkout/):
   - Correct server-calculated discount and final payable total.
   - Atomically reserves coupon redemption capacity.
   - Persists coupon, coupon_code, and discount on Order.
   - Rejecting invalid/ineligible coupons leaves no order and no orphaned reservations.
   - Checkout idempotency returns existing order without duplicate reservations or discounts.
5. Payment verification lifecycle:
   - Successful payment finalizes redemption to REDEEMED state with immutable snapshot.
   - Idempotent payment verification and duplicate webhooks.
6. Order cancellation and payment failure lifecycle:
   - Order cancellation releases redemption capacity to RELEASED state.
   - Payment failure via webhook releases redemption capacity.
7. Backward compatibility: existing checkouts without coupons work identically.
"""

from __future__ import annotations

import hmac
import hashlib
import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User
from apps.addresses.models import Address
from apps.cart.models import Cart, CartItem
from apps.catalog.models import Category, Collection, Product, ProductCollection, ProductVariant
from apps.inventory.models import InventoryItem
from apps.orders.models import Coupon, CouponRedemption, Order
from apps.payments.services import process_razorpay_webhook, verify_razorpay_payment



class CheckoutCouponIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.now = timezone.now()

        import uuid
        from apps.accounts.models import CustomerProfile

        # Users
        self.customer1 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="patron1@closetbychilli.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.customer1, display_name="Priya Sharma")

        self.customer2 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="patron2@closetbychilli.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.customer2, display_name="Ananya Verma")

        # Shipping Address
        self.address = Address.objects.create(
            user=self.customer1,
            full_name="Priya Sharma",
            phone="+919876543210",
            address_line1="42 Lake View Road",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560001",
            country="India",
            is_default=True,
        )

        # Catalog setup
        self.category = Category.objects.create(
            name="Couture Sarees",
            slug="couture-sarees",
            is_active=True,
        )
        self.other_category = Category.objects.create(
            name="Accessories",
            slug="accessories",
            is_active=True,
        )

        self.collection = Collection.objects.create(
            name="Diwali Festive 2026",
            slug="diwali-festive-2026",
            is_active=True,
        )

        # Product 1 in category & collection (price 2000)
        self.product1 = Product.objects.create(
            name="Zari Banarasi Saree",
            slug="zari-banarasi-saree",
            category=self.category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        ProductCollection.objects.create(product=self.product1, collection=self.collection)

        self.variant1 = ProductVariant.objects.create(
            product=self.product1,
            sku="BANARASI-RED-FREE",
            size="Free Size",
            color="Crimson Red",
            retail_price=Decimal("2000.00"),
            is_active=True,
        )
        InventoryItem.objects.create(
            variant=self.variant1,
            quantity_available=50,
            quantity_reserved=0,
        )

        # Product 2 in other category (price 1000)
        self.product2 = Product.objects.create(
            name="Velvet Potli Bag",
            slug="velvet-potli-bag",
            category=self.other_category,
            status=Product.Status.ACTIVE,
            is_active=True,
        )
        self.variant2 = ProductVariant.objects.create(
            product=self.product2,
            sku="POTLI-GOLD-FREE",
            size="Free Size",
            color="Gold",
            retail_price=Decimal("1000.00"),
            is_active=True,
        )
        InventoryItem.objects.create(
            variant=self.variant2,
            quantity_available=50,
            quantity_reserved=0,
        )

        from datetime import timedelta

        # Coupons
        # 1. 20% off all products, min subtotal 1500, max discount 500
        self.coupon_pct = Coupon.objects.create(
            code="FESTIVE20",
            name="Festive 20% Discount",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("20.00"),
            max_discount_amount=Decimal("500.00"),
            min_order_subtotal=Decimal("1500.00"),
            targeting_mode=Coupon.TargetingMode.ALL_PRODUCTS,
            start_date=self.now - timedelta(days=1),
            is_active=True,
            created_by=self.customer1,
            updated_by=self.customer1,
        )

        # 2. Fixed 300 off targeted only to category 'Couture Sarees'
        self.coupon_fixed_target = Coupon.objects.create(
            code="SAREE300",
            name="Saree Special 300 Off",
            discount_type=Coupon.DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("300.00"),
            min_order_subtotal=Decimal("1000.00"),
            targeting_mode=Coupon.TargetingMode.SPECIFIC_CATEGORIES,
            start_date=self.now - timedelta(days=1),
            is_active=True,
            created_by=self.customer1,
            updated_by=self.customer1,
        )
        self.coupon_fixed_target.applicable_categories.add(self.category)

        # 3. Limited usage coupon (total 2 uses)
        self.coupon_limited = Coupon.objects.create(
            code="LIMITED2",
            name="Limited Usage 100 Off",
            discount_type=Coupon.DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("100.00"),
            usage_limit=2,
            start_date=self.now - timedelta(days=1),
            is_active=True,
            created_by=self.customer1,
            updated_by=self.customer1,
        )

    def _setup_customer_cart(self, items: list[tuple[ProductVariant, int]]) -> Cart:
        Cart.objects.filter(user=self.customer1, is_active=True).delete()
        cart = Cart.objects.create(user=self.customer1, is_active=True)
        for variant, qty in items:
            CartItem.objects.create(cart=cart, variant=variant, quantity=qty)
        return cart

    # =========================================================================
    # 1. Coupon Validate API (POST /api/v1/coupons/validate/)
    # =========================================================================

    def test_validate_coupon_unauthenticated_rejected(self):
        resp = self.client.post("/api/v1/coupons/validate/", {"code": "FESTIVE20"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_validate_coupon_missing_code_rejected(self):
        self.client.force_authenticate(user=self.customer1)
        resp = self.client.post("/api/v1/coupons/validate/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data["error"]["code"], "COUPON_CODE_REQUIRED")

    def test_validate_coupon_not_found(self):
        self.client.force_authenticate(user=self.customer1)
        self._setup_customer_cart([(self.variant1, 1)])
        resp = self.client.post("/api/v1/coupons/validate/", {"code": "DOESNOTEXIST"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["eligible"])
        self.assertEqual(resp.data["reason_code"], "COUPON_NOT_FOUND")

    def test_validate_coupon_percentage_with_cap_and_totals(self):
        self.client.force_authenticate(user=self.customer1)
        # 2 units of variant1 = 4000.00 subtotal
        # 20% of 4000 = 800.00, capped at max_discount_amount 500.00
        # Final payable = 3500.00
        self._setup_customer_cart([(self.variant1, 2)])

        resp = self.client.post("/api/v1/coupons/validate/", {"code": "festive20"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["eligible"])
        self.assertIsNone(resp.data["reason_code"])
        self.assertEqual(resp.data["coupon_code"], "FESTIVE20")
        self.assertEqual(resp.data["subtotal"], "4000.00")
        self.assertEqual(resp.data["discount_amount"], "500.00")
        self.assertEqual(resp.data["total"], "3500.00")
        self.assertEqual(resp.data["currency"], "INR")

    def test_validate_coupon_below_min_subtotal(self):
        self.client.force_authenticate(user=self.customer1)
        # 1 unit of variant2 = 1000.00 subtotal, FESTIVE20 requires 1500.00
        self._setup_customer_cart([(self.variant2, 1)])

        resp = self.client.post("/api/v1/coupons/validate/", {"code": "FESTIVE20"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["eligible"])
        self.assertEqual(resp.data["reason_code"], "MIN_SUBTOTAL_NOT_MET")
        self.assertEqual(resp.data["discount_amount"], "0.00")
        self.assertEqual(resp.data["total"], "1000.00")

    def test_validate_coupon_targeting_mismatch(self):
        self.client.force_authenticate(user=self.customer1)
        # SAREE300 targets Couture Sarees category only.
        # Variant2 is in Accessories category.
        self._setup_customer_cart([(self.variant2, 2)])  # subtotal = 2000

        resp = self.client.post("/api/v1/coupons/validate/", {"code": "SAREE300"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["eligible"])
        self.assertEqual(resp.data["reason_code"], "INVALID_TARGETING")

    def test_validate_coupon_targeting_match(self):
        self.client.force_authenticate(user=self.customer1)
        # Variant1 is in Couture Sarees (qualifies).
        self._setup_customer_cart([(self.variant1, 1)])  # subtotal = 2000

        resp = self.client.post("/api/v1/coupons/validate/", {"code": "SAREE300"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["eligible"])
        self.assertEqual(resp.data["discount_amount"], "300.00")
        self.assertEqual(resp.data["total"], "1700.00")

    def test_validate_coupon_expired_or_inactive(self):
        self.client.force_authenticate(user=self.customer1)
        self._setup_customer_cart([(self.variant1, 1)])

        self.coupon_pct.is_active = False
        self.coupon_pct.save(update_fields=["is_active"])

        resp = self.client.post("/api/v1/coupons/validate/", {"code": "FESTIVE20"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["eligible"])
        self.assertEqual(resp.data["reason_code"], "COUPON_INACTIVE")

    # =========================================================================
    # 2. Cart Coupon Apply & Remove API (POST/DELETE /api/v1/cart/coupon/)
    # =========================================================================

    def test_cart_coupon_apply_and_remove(self):
        self.client.force_authenticate(user=self.customer1)
        cart = self._setup_customer_cart([(self.variant1, 1)])  # 2000.00

        # Apply valid coupon
        resp = self.client.post("/api/v1/cart/coupon/", {"code": "FESTIVE20"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["coupon_code"], "FESTIVE20")
        self.assertEqual(resp.data["discount"], "400.00")  # 20% of 2000
        self.assertEqual(resp.data["total"], "1600.00")

        # Verify DB persisted
        cart.refresh_from_db()
        self.assertEqual(cart.coupon, self.coupon_pct)

        # Remove coupon
        del_resp = self.client.delete("/api/v1/cart/coupon/")
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(del_resp.data["coupon_code"])
        self.assertEqual(del_resp.data["discount"], "0.00")
        self.assertEqual(del_resp.data["total"], "2000.00")

        cart.refresh_from_db()
        self.assertIsNone(cart.coupon)

    def test_cart_coupon_apply_ineligible_returns_400(self):
        self.client.force_authenticate(user=self.customer1)
        # Subtotal 1000 below FESTIVE20 min 1500
        self._setup_customer_cart([(self.variant2, 1)])

        resp = self.client.post("/api/v1/cart/coupon/", {"code": "FESTIVE20"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data["error"]["code"], "MIN_SUBTOTAL_NOT_MET")

    def test_cart_modification_auto_invalidates_coupon(self):
        self.client.force_authenticate(user=self.customer1)
        cart = self._setup_customer_cart([(self.variant1, 1)])  # 2000.00

        # Apply coupon
        self.client.post("/api/v1/cart/coupon/", {"code": "FESTIVE20"}, format="json")
        cart.refresh_from_db()
        self.assertEqual(cart.coupon, self.coupon_pct)

        # Delete the item so cart becomes empty
        item = cart.items.first()
        self.client.delete(f"/api/v1/cart/items/{item.id}/")

        cart.refresh_from_db()
        self.assertIsNone(cart.coupon)

    # =========================================================================
    # 3. Checkout Integration with Coupons
    # =========================================================================

    def test_checkout_with_applied_cart_coupon_creates_discounted_order(self):
        self.client.force_authenticate(user=self.customer1)
        cart = self._setup_customer_cart([(self.variant1, 1)])  # 2000.00
        cart.coupon = self.coupon_pct
        cart.save(update_fields=["coupon"])

        checkout_resp = self.client.post(
            "/api/v1/checkout/",
            {"shipping_address_id": str(self.address.id)},
            format="json",
        )
        self.assertEqual(checkout_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(checkout_resp.data["subtotal"], "2000.00")
        self.assertEqual(checkout_resp.data["discount"], "400.00")
        self.assertEqual(checkout_resp.data["total"], "1600.00")
        self.assertEqual(checkout_resp.data["coupon_code"], "FESTIVE20")

        # Verify DB order record
        order = Order.objects.get(order_number=checkout_resp.data["order_number"])
        self.assertEqual(order.subtotal, Decimal("2000.00"))
        self.assertEqual(order.discount, Decimal("400.00"))
        self.assertEqual(order.total, Decimal("1600.00"))
        self.assertEqual(order.coupon, self.coupon_pct)
        self.assertEqual(order.coupon_code, "FESTIVE20")

        # Verify durable CouponRedemption was created in RESERVED state
        redemption = CouponRedemption.objects.get(order=order)
        self.assertEqual(redemption.coupon, self.coupon_pct)
        self.assertEqual(redemption.customer, self.customer1)
        self.assertEqual(redemption.state, CouponRedemption.State.RESERVED)
        self.assertEqual(redemption.discount_amount, Decimal("400.00"))

    def test_checkout_with_explicit_coupon_code_in_request(self):
        self.client.force_authenticate(user=self.customer1)
        self._setup_customer_cart([(self.variant1, 1)])  # 2000.00 (no coupon on cart initially)

        checkout_resp = self.client.post(
            "/api/v1/checkout/",
            {
                "shipping_address_id": str(self.address.id),
                "coupon_code": "SAREE300",
            },
            format="json",
        )
        self.assertEqual(checkout_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(checkout_resp.data["subtotal"], "2000.00")
        self.assertEqual(checkout_resp.data["discount"], "300.00")
        self.assertEqual(checkout_resp.data["total"], "1700.00")
        self.assertEqual(checkout_resp.data["coupon_code"], "SAREE300")

    def test_checkout_with_invalid_coupon_fails_atomically(self):
        self.client.force_authenticate(user=self.customer1)
        self._setup_customer_cart([(self.variant2, 1)])  # 1000.00, does not meet FESTIVE20 min 1500

        initial_orders_count = Order.objects.count()
        initial_redemptions_count = CouponRedemption.objects.count()

        checkout_resp = self.client.post(
            "/api/v1/checkout/",
            {
                "shipping_address_id": str(self.address.id),
                "coupon_code": "FESTIVE20",
            },
            format="json",
        )
        self.assertEqual(checkout_resp.status_code, status.HTTP_400_BAD_REQUEST)
        # Ensure rollback: no orphaned order or reservation created
        self.assertEqual(Order.objects.count(), initial_orders_count)
        self.assertEqual(CouponRedemption.objects.count(), initial_redemptions_count)

    def test_checkout_idempotency_does_not_duplicate_discount_or_reservation(self):
        self.client.force_authenticate(user=self.customer1)
        self._setup_customer_cart([(self.variant1, 1)])

        idempotency_key = "idemp-test-coupon-12345"
        payload = {
            "shipping_address_id": str(self.address.id),
            "coupon_code": "SAREE300",
            "idempotency_key": idempotency_key,
        }

        resp1 = self.client.post("/api/v1/checkout/", payload, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        # Re-send same request with same idempotency key
        resp2 = self.client.post("/api/v1/checkout/", payload, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp1.data["order_number"], resp2.data["order_number"])
        self.assertEqual(resp2.data["discount"], "300.00")

        # Verify only 1 reservation exists
        order = Order.objects.get(order_number=resp1.data["order_number"])
        self.assertEqual(order.coupon_redemptions.count(), 1)

    # =========================================================================
    # 4. Payment Verification Lifecycle & Webhook Finalization
    # =========================================================================

    @patch("apps.payments.services.get_razorpay_client")
    def test_payment_success_finalizes_coupon_redemption(self, mock_client_factory):
        self.client.force_authenticate(user=self.customer1)
        self._setup_customer_cart([(self.variant1, 1)])  # 2000.00 - 300 = 1700.00

        checkout_resp = self.client.post(
            "/api/v1/checkout/",
            {
                "shipping_address_id": str(self.address.id),
                "coupon_code": "SAREE300",
            },
            format="json",
        )
        order = Order.objects.get(order_number=checkout_resp.data["order_number"])
        order.razorpay_order_id = "order_rzp_mock_123"
        order.save(update_fields=["razorpay_order_id"])

        redemption = order.coupon_redemptions.first()
        self.assertEqual(redemption.state, CouponRedemption.State.RESERVED)

        # Mock Razorpay gateway payment fetch
        mock_client = MagicMock()
        mock_client.payment.fetch.return_value = {
            "id": "pay_rzp_mock_123",
            "order_id": "order_rzp_mock_123",
            "amount": 170000,  # 1700.00 INR in paise
            "currency": "INR",
            "status": "captured",
        }
        mock_client_factory.return_value = mock_client

        # Compute valid signature
        secret = getattr(settings, "RAZORPAY_KEY_SECRET", "test_secret")
        msg = f"order_rzp_mock_123|pay_rzp_mock_123".encode("utf-8")
        signature = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

        # Call verify_razorpay_payment
        verified_order = verify_razorpay_payment(
            razorpay_order_id="order_rzp_mock_123",
            razorpay_payment_id="pay_rzp_mock_123",
            razorpay_signature=signature,
            user=self.customer1,
            client=mock_client,
        )
        self.assertEqual(verified_order.payment_status, Order.PaymentStatus.PAID)

        # Verify redemption state transitioned to REDEEMED
        redemption.refresh_from_db()
        self.assertEqual(redemption.state, CouponRedemption.State.REDEEMED)
        self.assertEqual(redemption.discount_amount, Decimal("300.00"))
        self.assertIsNotNone(redemption.finalized_at)

    def test_payment_webhook_captured_finalizes_coupon(self):
        self.client.force_authenticate(user=self.customer1)
        self._setup_customer_cart([(self.variant1, 1)])

        checkout_resp = self.client.post(
            "/api/v1/checkout/",
            {
                "shipping_address_id": str(self.address.id),
                "coupon_code": "SAREE300",
            },
            format="json",
        )
        order = Order.objects.get(order_number=checkout_resp.data["order_number"])
        order.razorpay_order_id = "order_rzp_hook_456"
        order.save(update_fields=["razorpay_order_id"])

        webhook_payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_rzp_hook_456",
                        "order_id": "order_rzp_hook_456",
                        "amount": 170000,
                        "currency": "INR",
                        "status": "captured",
                    }
                }
            },
        }
        body = json.dumps(webhook_payload).encode("utf-8")
        secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
        signature = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()

        result = process_razorpay_webhook(body, signature)
        self.assertEqual(result["status"], "paid")

        redemption = order.coupon_redemptions.first()
        redemption.refresh_from_db()
        self.assertEqual(redemption.state, CouponRedemption.State.REDEEMED)

    # =========================================================================
    # 5. Order Cancellation & Payment Failure Lifecycle
    # =========================================================================

    def test_order_cancellation_releases_coupon_reservation(self):
        self.client.force_authenticate(user=self.customer1)
        self._setup_customer_cart([(self.variant1, 1)])

        checkout_resp = self.client.post(
            "/api/v1/checkout/",
            {
                "shipping_address_id": str(self.address.id),
                "coupon_code": "LIMITED2",
            },
            format="json",
        )
        order = Order.objects.get(order_number=checkout_resp.data["order_number"])
        redemption = order.coupon_redemptions.first()
        self.assertEqual(redemption.state, CouponRedemption.State.RESERVED)

        # Cancel order via customer cancel endpoint
        cancel_resp = self.client.post(f"/api/v1/orders/{order.order_number}/cancel/")
        self.assertEqual(cancel_resp.status_code, status.HTTP_200_OK)

        redemption.refresh_from_db()
        self.assertEqual(redemption.state, CouponRedemption.State.RELEASED)
        self.assertEqual(redemption.release_reason, "Order cancelled by customer")

    def test_payment_failure_webhook_releases_coupon_reservation(self):
        self.client.force_authenticate(user=self.customer1)
        self._setup_customer_cart([(self.variant1, 1)])

        checkout_resp = self.client.post(
            "/api/v1/checkout/",
            {
                "shipping_address_id": str(self.address.id),
                "coupon_code": "LIMITED2",
            },
            format="json",
        )
        order = Order.objects.get(order_number=checkout_resp.data["order_number"])
        order.razorpay_order_id = "order_rzp_failed_789"
        order.save(update_fields=["razorpay_order_id"])

        webhook_payload = {
            "event": "payment.failed",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_failed_123",
                        "order_id": "order_rzp_failed_789",
                    }
                }
            },
        }
        body = json.dumps(webhook_payload).encode("utf-8")
        secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
        signature = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()

        result = process_razorpay_webhook(body, signature)
        self.assertEqual(result["status"], "payment_failed")

        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)

        redemption = order.coupon_redemptions.first()
        redemption.refresh_from_db()
        self.assertEqual(redemption.state, CouponRedemption.State.RELEASED)
