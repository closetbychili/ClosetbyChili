import uuid
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User


class AccountsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.supabase_id = uuid.uuid4()

    def test_me_requires_authentication(self):
        response = self.client.get("/api/v1/me/")
        self.assertEqual(response.status_code, 401)

    @patch("apps.accounts.authentication._decode_token")
    def test_me_provisions_application_user(self, decode):
        decode.return_value = {
            "sub": str(self.supabase_id),
            "email": "customer@example.com",
            "user_metadata": {"full_name": "Test Customer"},
        }
        response = self.client.get(
            "/api/v1/me/",
            HTTP_AUTHORIZATION="Bearer test-token",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "customer@example.com")
        self.assertEqual(response.data["profile"]["display_name"], "Test Customer")
        user = User.objects.get(supabase_user_id=self.supabase_id)
        self.assertTrue(CustomerProfile.objects.filter(user=user).exists())

    @patch("apps.accounts.authentication._decode_token")
    def test_profile_patch_is_allowlisted(self, decode):
        decode.return_value = {"sub": str(self.supabase_id), "email": "a@example.com"}
        self.client.get("/api/v1/me/", HTTP_AUTHORIZATION="Bearer test-token")
        response = self.client.patch(
            "/api/v1/me/",
            {"display_name": "Updated", "role": "admin"},
            format="json",
            HTTP_AUTHORIZATION="Bearer test-token",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["code"],
            "VALIDATION_ERROR",
        )

        response = self.client.patch(
            "/api/v1/me/",
            {"display_name": "Updated"},
            format="json",
            HTTP_AUTHORIZATION="Bearer test-token",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["display_name"], "Updated")
        self.assertEqual(response.data["role"], "customer")
