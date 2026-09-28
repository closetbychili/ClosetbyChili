import uuid
from decimal import Decimal

from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.addresses.models import Address


class AddressModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="buyer@example.com",
        )

    def test_address_creation_sets_first_default(self):
        address = Address.objects.create(
            user=self.user,
            full_name="Test User",
            phone="9876543210",
            address_line1="10 Main Road",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560001",
            country="India",
        )

        self.assertTrue(address.is_default)
        self.assertEqual(Address.objects.filter(user=self.user, is_default=True).count(), 1)

    def test_only_one_default_per_user(self):
        first = Address.objects.create(
            user=self.user,
            full_name="Test User",
            phone="9876543210",
            address_line1="10 Main Road",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560001",
            country="India",
        )
        second = Address.objects.create(
            user=self.user,
            full_name="Another User",
            phone="9876543211",
            address_line1="20 Market Road",
            city="Hyderabad",
            state="Telangana",
            postal_code="500001",
            country="India",
        )

        self.assertTrue(first.is_default)
        self.assertFalse(second.is_default)

        second.is_default = True
        second.save()

        first.refresh_from_db()
        second.refresh_from_db()
        self.assertFalse(first.is_default)
        self.assertTrue(second.is_default)

    def test_default_constraint_is_enforced(self):
        first = Address.objects.create(
            user=self.user,
            full_name="Test User",
            phone="9876543210",
            address_line1="10 Main Road",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560001",
            country="India",
            is_default=True,
        )

        with self.assertRaises(IntegrityError):
            Address.objects.create(
                user=self.user,
                full_name="Another User",
                phone="9876543211",
                address_line1="20 Market Road",
                city="Hyderabad",
                state="Telangana",
                postal_code="500001",
                country="India",
                is_default=True,
            )

    def test_validation_rejects_invalid_postal_code_and_phone(self):
        invalid = Address(
            user=self.user,
            full_name="Test User",
            phone="123",
            address_line1="10 Main Road",
            city="Bengaluru",
            state="Karnataka",
            postal_code="12",
            country="India",
        )

        with self.assertRaises(Exception):
            invalid.full_clean()


class AddressApiTests(TestCase):
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
        self.address_a = Address.objects.create(
            user=self.user_a,
            full_name="Buyer A",
            phone="9876543210",
            address_line1="10 Main Road",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560001",
            country="India",
            is_default=True,
        )
        self.address_b = Address.objects.create(
            user=self.user_b,
            full_name="Buyer B",
            phone="8765432109",
            address_line1="20 Market Road",
            city="Hyderabad",
            state="Telangana",
            postal_code="500001",
            country="India",
            is_default=True,
        )

    def test_unauthenticated_access_rejected(self):
        response = self.client.get("/api/v1/addresses/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_sees_only_their_addresses(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/v1/addresses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.address_a.id))

    def test_user_cannot_access_another_users_address(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(f"/api/v1/addresses/{self.address_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_id_is_ignored_on_create(self):
        self.client.force_authenticate(user=self.user_a)
        payload = {
            "user_id": str(self.user_b.id),
            "full_name": "New Name",
            "phone": "9988776655",
            "address_line1": "30 Cross Street",
            "city": "Pune",
            "state": "Maharashtra",
            "postal_code": "411001",
            "country": "India",
        }
        response = self.client.post("/api/v1/addresses/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"], str(self.user_a.id))

    def test_create_first_address_sets_default(self):
        self.client.force_authenticate(user=self.user_a)
        self.address_a.delete()
        response = self.client.post(
            "/api/v1/addresses/",
            {
                "full_name": "Fresh A",
                "phone": "9988776655",
                "address_line1": "30 Cross Street",
                "city": "Pune",
                "state": "Maharashtra",
                "postal_code": "411001",
                "country": "India",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_default"])

    def test_switching_default_is_atomic(self):
        second = Address.objects.create(
            user=self.user_a,
            full_name="Another A",
            phone="9988776655",
            address_line1="30 Cross Street",
            city="Pune",
            state="Maharashtra",
            postal_code="411001",
            country="India",
        )
        self.client.force_authenticate(user=self.user_a)
        response = self.client.patch(
            f"/api/v1/addresses/{second.id}/",
            {"is_default": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.address_a.refresh_from_db()
        second.refresh_from_db()
        self.assertFalse(self.address_a.is_default)
        self.assertTrue(second.is_default)

    def test_delete_default_leaves_no_default(self):
        self.client.force_authenticate(user=self.user_b)
        response = self.client.delete(f"/api/v1/addresses/{self.address_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Address.objects.filter(user=self.user_b, is_default=True).exists())

    def test_list_order_is_default_then_newest(self):
        self.client.force_authenticate(user=self.user_a)
        older = Address.objects.create(
            user=self.user_a,
            full_name="Older",
            phone="9090909090",
            address_line1="Old Street",
            city="Delhi",
            state="Delhi",
            postal_code="110001",
            country="India",
        )
        newer = Address.objects.create(
            user=self.user_a,
            full_name="Newer",
            phone="8080808080",
            address_line1="New Street",
            city="Jaipur",
            state="Rajasthan",
            postal_code="302001",
            country="India",
        )
        self.address_a.is_default = False
        self.address_a.save(update_fields=["is_default"])
        response = self.client.get("/api/v1/addresses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in response.data["results"]]
        self.assertEqual(ids[0], str(newer.id))
        self.assertEqual(ids[1], str(older.id))
        self.assertEqual(ids[-1], str(self.address_a.id))
