from rest_framework import serializers

FORBIDDEN_FIELDS = {"amount", "currency", "user_id", "status", "payment_status"}


class RazorpayCreateOrderRequestSerializer(serializers.Serializer):
    order_number = serializers.CharField(max_length=32, required=True)

    def validate(self, attrs):
        unknown_fields = set(self.initial_data.keys()) & FORBIDDEN_FIELDS
        if unknown_fields:
            raise serializers.ValidationError(
                f"Field(s) {', '.join(sorted(unknown_fields))} cannot be provided by the client."
            )
        return attrs


class RazorpayCreateOrderResponseSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField()
    key_id = serializers.CharField()
    amount = serializers.IntegerField()
    currency = serializers.CharField()
    order_number = serializers.CharField()


class RazorpayVerifyPaymentRequestSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField(max_length=255, required=True)
    razorpay_payment_id = serializers.CharField(max_length=255, required=True)
    razorpay_signature = serializers.CharField(max_length=255, required=True)

    def validate(self, attrs):
        unknown_fields = set(self.initial_data.keys()) & FORBIDDEN_FIELDS
        if unknown_fields:
            raise serializers.ValidationError(
                f"Field(s) {', '.join(sorted(unknown_fields))} cannot be provided by the client."
            )
        return attrs
