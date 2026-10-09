from rest_framework import status
from rest_framework.exceptions import APIException


class PaymentError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Payment processing failed."
    default_code = "payment_error"

    def __init__(self, detail=None, code=None, status_code=None):
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.default_code = code
        super().__init__(detail=detail, code=code)
