"""
Tests for Google OAuth and Supabase User Synchronization.

Verifies:
- New Google user registration provisions User and CustomerProfile with Role.CUSTOMER.
- Existing Google user login retrieves the existing account without duplicate creation.
- Supabase user ID remains the stable identity anchor.
- Existing email/password users continue to work alongside OAuth users.
- Google OAuth cannot grant admin or staff privileges (untrusted JWT metadata cannot elevate role).
- Inactive accounts are strictly rejected with InvalidSupabaseToken.
- Display name and email updates from Supabase metadata are synced safely.
- /api/v1/me/ returns safe profile payload without leaking sensitive internal fields.
"""

import uuid
from unittest.mock import patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.authentication import _resolve_user
from apps.accounts.exceptions import InvalidSupabaseToken
from apps.accounts.models import CustomerProfile, User


class GoogleOAuthSynchronizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.google_sub = uuid.uuid4()
        self.google_email = "priya.sharma@gmail.com"
        self.google_name = "Priya Sharma"

    def test_new_google_user_registration_provisions_customer_account(self):
        """A new Google user authenticating via Supabase gets User and CustomerProfile provisioned."""
        claims = {
            "sub": str(self.google_sub),
            "email": self.google_email,
            "user_metadata": {
                "full_name": self.google_name,
                "avatar_url": "https://lh3.googleusercontent.com/a/mock-photo",
                "provider": "google",
                "email_verified": True,
            },
            "app_metadata": {
                "provider": "google",
                "providers": ["google"],
            },
        }

        user = _resolve_user(claims)

        self.assertIsNotNone(user)
        self.assertEqual(user.supabase_user_id, self.google_sub)
        self.assertEqual(user.email, self.google_email)
        self.assertEqual(user.role, User.Role.CUSTOMER)
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_admin)

        # Profile is created with display name from Google
        profile = CustomerProfile.objects.get(user=user)
        self.assertEqual(profile.display_name, self.google_name)
        self.assertEqual(User.objects.filter(supabase_user_id=self.google_sub).count(), 1)

    def test_existing_google_user_login_does_not_create_duplicates(self):
        """Returning Google user retrieves existing account without duplicate record creation."""
        # Provision initial user
        initial_user = User.objects.create(
            supabase_user_id=self.google_sub,
            email=self.google_email,
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=initial_user, display_name=self.google_name)

        claims = {
            "sub": str(self.google_sub),
            "email": self.google_email,
            "user_metadata": {
                "full_name": self.google_name,
            },
        }

        resolved_user = _resolve_user(claims)

        self.assertEqual(resolved_user.id, initial_user.id)
        self.assertEqual(User.objects.filter(supabase_user_id=self.google_sub).count(), 1)
        self.assertEqual(CustomerProfile.objects.filter(user=resolved_user).count(), 1)

    def test_google_login_cannot_grant_admin_privileges(self):
        """User metadata attempting to inject role: admin or is_staff is strictly ignored."""
        malicious_claims = {
            "sub": str(self.google_sub),
            "email": "attacker@gmail.com",
            "role": "admin",
            "is_staff": True,
            "is_admin": True,
            "user_metadata": {
                "full_name": "Attacker",
                "role": "admin",
                "is_staff": True,
                "is_admin": True,
            },
            "app_metadata": {
                "role": "admin",
            },
        }

        user = _resolve_user(malicious_claims)

        self.assertEqual(user.role, User.Role.CUSTOMER)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_admin)

        # Check DB record directly
        user.refresh_from_db()
        self.assertEqual(user.role, User.Role.CUSTOMER)

    def test_google_user_display_name_and_email_updates_sync_safely(self):
        """If user updates their Google name or email, profile & user records are updated."""
        user = User.objects.create(
            supabase_user_id=self.google_sub,
            email=self.google_email,
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        profile = CustomerProfile.objects.create(user=user, display_name=self.google_name)

        updated_claims = {
            "sub": str(self.google_sub),
            "email": "priya.new@gmail.com",
            "user_metadata": {
                "name": "Priya Sharma (Updated)",
            },
        }

        resolved_user = _resolve_user(updated_claims)

        self.assertEqual(resolved_user.id, user.id)
        resolved_user.refresh_from_db()
        profile.refresh_from_db()

        self.assertEqual(resolved_user.email, "priya.new@gmail.com")
        self.assertEqual(profile.display_name, "Priya Sharma (Updated)")
        self.assertEqual(resolved_user.role, User.Role.CUSTOMER)

    def test_inactive_google_account_is_rejected(self):
        """Inactive accounts cannot authenticate through Supabase JWT."""
        User.objects.create(
            supabase_user_id=self.google_sub,
            email=self.google_email,
            role=User.Role.CUSTOMER,
            is_active=False,
        )

        claims = {
            "sub": str(self.google_sub),
            "email": self.google_email,
        }

        with self.assertRaises(InvalidSupabaseToken) as ctx:
            _resolve_user(claims)
        self.assertIn("inactive", str(ctx.exception))

    def test_existing_email_password_user_works_alongside_oauth(self):
        """Traditional email/password user with distinct UUID co-exists with OAuth users."""
        email_password_sub = uuid.uuid4()
        ep_user = User.objects.create(
            supabase_user_id=email_password_sub,
            email="regular@closetbychilli.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=ep_user, display_name="Regular Customer")

        # Now authenticate Google user with distinct sub
        google_claims = {
            "sub": str(self.google_sub),
            "email": self.google_email,
            "user_metadata": {"full_name": self.google_name},
        }
        g_user = _resolve_user(google_claims)

        self.assertNotEqual(ep_user.id, g_user.id)
        self.assertNotEqual(ep_user.supabase_user_id, g_user.supabase_user_id)
        self.assertEqual(User.objects.count(), 2)


class GoogleOAuthApiEndpointIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.google_sub = uuid.uuid4()
        self.google_email = "ananya.singh@gmail.com"

    @patch("apps.accounts.authentication._decode_token")
    def test_me_endpoint_provisions_and_returns_google_user(self, mock_decode):
        """GET /api/v1/me/ with Google OAuth token provisions user and returns profile."""
        mock_decode.return_value = {
            "sub": str(self.google_sub),
            "email": self.google_email,
            "user_metadata": {
                "full_name": "Ananya Singh",
                "avatar_url": "https://lh3.googleusercontent.com/a/mock-pic",
            },
        }

        response = self.client.get(
            "/api/v1/me/",
            HTTP_AUTHORIZATION="Bearer valid-google-supabase-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["email"], self.google_email)
        self.assertEqual(data["role"], "customer")
        self.assertEqual(data["profile"]["display_name"], "Ananya Singh")
        self.assertEqual(data["avatar_url"], "https://lh3.googleusercontent.com/a/mock-pic")

        # Assert no sensitive or auth secret fields are exposed
        self.assertNotIn("password", data)
        self.assertNotIn("secret", data)

        # Confirm DB state
        user = User.objects.get(supabase_user_id=self.google_sub)
        self.assertEqual(user.email, self.google_email)
        self.assertEqual(user.role, User.Role.CUSTOMER)
        self.assertEqual(user.profile.display_name, "Ananya Singh")

    @patch("apps.accounts.authentication._decode_token")
    def test_inactive_user_via_api_returns_unauthorized(self, mock_decode):
        """Inactive user token returns 401 Unauthorized via DRF custom exception handler."""
        User.objects.create(
            supabase_user_id=self.google_sub,
            email=self.google_email,
            role=User.Role.CUSTOMER,
            is_active=False,
        )

        mock_decode.return_value = {
            "sub": str(self.google_sub),
            "email": self.google_email,
        }

        response = self.client.get(
            "/api/v1/me/",
            HTTP_AUTHORIZATION="Bearer valid-token-inactive-account",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "AUTHENTICATION_FAILED")
