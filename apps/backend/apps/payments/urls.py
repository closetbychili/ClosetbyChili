from django.urls import path

from apps.payments.views import (
    RazorpayCreateOrderView,
    RazorpayVerifyPaymentView,
    RazorpayWebhookView,
)

urlpatterns = [
    path("razorpay/create-order/", RazorpayCreateOrderView.as_view(), name="razorpay-create-order"),
    path("razorpay/verify/", RazorpayVerifyPaymentView.as_view(), name="razorpay-verify"),
    path("razorpay/webhook/", RazorpayWebhookView.as_view(), name="razorpay-webhook"),
]
