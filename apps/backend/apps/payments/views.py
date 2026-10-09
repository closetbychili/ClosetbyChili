import logging
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order
from apps.orders.serializers import OrderDetailSerializer
from apps.payments.serializers import (
    RazorpayCreateOrderRequestSerializer,
    RazorpayCreateOrderResponseSerializer,
    RazorpayVerifyPaymentRequestSerializer,
)
from apps.payments.services import (
    create_razorpay_order,
    process_razorpay_webhook,
    verify_razorpay_payment,
)

logger = logging.getLogger(__name__)


class RazorpayCreateOrderView(APIView):
    """
    POST /api/v1/payments/razorpay/create-order/

    Create or retrieve a Razorpay order for an authenticated user's pending Order.
    Requires:
    - { "order_number": "CBC-2026-000001" }
    Rejects client-supplied amounts or currencies.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = RazorpayCreateOrderRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_number = serializer.validated_data["order_number"]

        order = Order.objects.filter(
            order_number=order_number,
            user=request.user,
        ).first()

        if not order:
            raise NotFound({"order_number": "Order not found."})

        payment_data = create_razorpay_order(order)
        response_serializer = RazorpayCreateOrderResponseSerializer(payment_data)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class RazorpayVerifyPaymentView(APIView):
    """
    POST /api/v1/payments/razorpay/verify/

    Verify a completed Razorpay payment callback for an order and transition to PAID.
    Requires:
    - { "razorpay_order_id": "...", "razorpay_payment_id": "...", "razorpay_signature": "..." }
    Never accepts client-supplied amounts or statuses.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = RazorpayVerifyPaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        order = verify_razorpay_payment(
            razorpay_order_id=data["razorpay_order_id"],
            razorpay_payment_id=data["razorpay_payment_id"],
            razorpay_signature=data["razorpay_signature"],
            user=request.user,
        )

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_200_OK)


class RazorpayWebhookView(APIView):
    """
    POST /api/v1/payments/razorpay/webhook/

    Public webhook endpoint receiving Razorpay events.
    Verifies HMAC signature from Razorpay.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        signature = request.headers.get("X-Razorpay-Signature") or request.META.get(
            "HTTP_X_RAZORPAY_SIGNATURE", ""
        )
        if not signature:
            return Response(
                {"error": "Missing X-Razorpay-Signature header."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = process_razorpay_webhook(body=request.body, signature=signature)
        return Response(result, status=status.HTTP_200_OK)
