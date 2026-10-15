import io
import uuid
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerProfile, User


class AdminAuthorizationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create standard customer
        self.customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="customer@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.customer, display_name="Regular Customer")

        # Create wholesale customer
        self.wholesale_customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="wholesale@example.com",
            role=User.Role.WHOLESALE_CUSTOMER,
            is_active=True,
        )

        # Create staff user
        self.staff_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="staff@closetbychilli.com",
            role=User.Role.STAFF,
            is_active=True,
        )

        # Create administrator
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.admin_user, display_name="Super Admin")

        # Create inactive admin
        self.inactive_admin = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="inactive_admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=False,
        )

    def test_anonymous_request_to_admin_verify_is_denied(self):
        response = self.client.get("/api/v1/admin/auth/verify/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        data = response.json()
        self.assertEqual(data["error"]["code"], "AUTHENTICATION_REQUIRED")

    def test_authenticated_customer_is_denied_admin_access(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get("/api/v1/admin/auth/verify/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        data = response.json()
        self.assertEqual(data["error"]["code"], "FORBIDDEN")

    def test_authenticated_wholesale_customer_is_denied_admin_access(self):
        self.client.force_authenticate(user=self.wholesale_customer)
        response = self.client.get("/api/v1/admin/auth/verify/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        data = response.json()
        self.assertEqual(data["error"]["code"], "FORBIDDEN")

    def test_authenticated_staff_user_is_denied_admin_only_access(self):
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get("/api/v1/admin/auth/verify/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        data = response.json()
        self.assertEqual(data["error"]["code"], "FORBIDDEN")

    def test_inactive_admin_is_denied_admin_access(self):
        self.client.force_authenticate(user=self.inactive_admin)
        response = self.client.get("/api/v1/admin/auth/verify/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authorized_admin_is_allowed_and_returns_safe_details(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/admin/auth/verify/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["email"], "admin@closetbychilli.com")
        self.assertEqual(data["role"], "admin")
        self.assertTrue(data["is_admin"])
        self.assertTrue(data["is_staff"])
        self.assertTrue(data["is_active"])
        # Ensure sensitive internals are never exposed
        self.assertNotIn("supabase_user_id", data)
        self.assertNotIn("password", data)
        self.assertNotIn("secret", data)

    def test_customer_me_endpoint_continues_working(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get("/api/v1/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["email"], "customer@example.com")
        self.assertEqual(data["role"], "customer")
        self.assertEqual(data["profile"]["display_name"], "Regular Customer")

    def test_client_supplied_role_elevation_is_strictly_rejected(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.patch(
            "/api/v1/me/",
            data={"role": "admin", "display_name": "Hacker"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertEqual(data["error"]["code"], "VALIDATION_ERROR")
        self.assertIn("role", str(data["error"]["details"]))

        # Verify DB role was not elevated
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.role, User.Role.CUSTOMER)

    def test_client_cannot_elevate_via_is_staff_or_is_admin(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.patch(
            "/api/v1/me/",
            data={"is_admin": True, "is_staff": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.role, User.Role.CUSTOMER)


class SetAdminRoleManagementCommandTests(TestCase):
    def test_set_admin_role_promotes_customer(self):
        customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="staff_candidate@closetbychilli.com",
            role=User.Role.CUSTOMER,
        )
        out = io.StringIO()
        call_command("set_admin_role", email="staff_candidate@closetbychilli.com", stdout=out)
        self.assertIn("Successfully updated user", out.getvalue())

        customer.refresh_from_db()
        self.assertEqual(customer.role, User.Role.ADMIN)
        self.assertTrue(customer.is_admin)
        self.assertTrue(customer.is_staff)

    def test_set_admin_role_revoke_demotes_to_customer(self):
        admin = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="former_admin@closetbychilli.com",
            role=User.Role.ADMIN,
        )
        out = io.StringIO()
        call_command("set_admin_role", email="former_admin@closetbychilli.com", revoke=True, stdout=out)
        self.assertIn("Successfully updated user", out.getvalue())

        admin.refresh_from_db()
        self.assertEqual(admin.role, User.Role.CUSTOMER)
        self.assertFalse(admin.is_admin)
        self.assertFalse(admin.is_staff)

    def test_set_admin_role_dry_run_leaves_db_unchanged(self):
        customer = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="dry_run_user@closetbychilli.com",
            role=User.Role.CUSTOMER,
        )
        out = io.StringIO()
        call_command("set_admin_role", email="dry_run_user@closetbychilli.com", dry_run=True, stdout=out)
        self.assertIn("[DRY-RUN]", out.getvalue())

        customer.refresh_from_db()
        self.assertEqual(customer.role, User.Role.CUSTOMER)

    def test_missing_user_without_create_if_missing_raises_error(self):
        with self.assertRaises(CommandError) as ctx:
            call_command("set_admin_role", email="nonexistent@closetbychilli.com")
        self.assertIn("No application user found", str(ctx.exception))

    def test_create_if_missing_requires_supabase_uuid(self):
        with self.assertRaises(CommandError) as ctx:
            call_command(
                "set_admin_role",
                email="brand_new@closetbychilli.com",
                create_if_missing=True,
            )
        self.assertIn("--create-if-missing requires a valid --supabase-user-id", str(ctx.exception))

    def test_create_if_missing_pre_provisions_admin(self):
        sb_id = uuid.uuid4()
        out = io.StringIO()
        call_command(
            "set_admin_role",
            email="initial_superadmin@closetbychilli.com",
            supabase_user_id=str(sb_id),
            create_if_missing=True,
            stdout=out,
        )
        self.assertIn("Successfully pre-provisioned User", out.getvalue())

        user = User.objects.get(supabase_user_id=sb_id)
        self.assertEqual(user.email, "initial_superadmin@closetbychilli.com")
        self.assertEqual(user.role, User.Role.ADMIN)
        self.assertTrue(user.is_admin)
        self.assertTrue(hasattr(user, "profile"))
