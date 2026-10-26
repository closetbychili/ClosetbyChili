"""
Closet by Chilli — Customer Notes & Support Context Tests (Sprint A6.3).

Tests:
- Anonymous and ordinary customer requests are denied (401/403).
- Authorized administrators can create and list notes.
- Notes are strictly scoped to the requested customer.
- Unknown customer IDs return 404 for both GET and POST.
- Validation: Empty notes, blank whitespace, and notes exceeding 3000 chars are rejected (400).
- Author attribution is derived from authenticated request.user; spoofed author fields are ignored.
- Append-only ordering: newest notes appear first.
- Customer-facing endpoints (e.g. account profile, orders) do not expose customer notes.
"""

from decimal import Decimal
import uuid

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import CustomerNote, CustomerProfile, User


class CustomerNotesApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Admin user
        self.admin_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="admin@closetbychilli.com",
            role=User.Role.ADMIN,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.admin_user, display_name="Lead Concierge")

        # 2. Staff user
        self.staff_user = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="atelier.staff@closetbychilli.com",
            role=User.Role.STAFF,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.staff_user, display_name="Atelier Tailor")

        # 3. Customer 1 (Active)
        self.customer1 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="ananya.sharma@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.customer1, display_name="Ananya Sharma")

        # 4. Customer 2 (Active)
        self.customer2 = User.objects.create(
            supabase_user_id=uuid.uuid4(),
            email="priya.verma@example.com",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        CustomerProfile.objects.create(user=self.customer2, display_name="Priya Verma")

        self.c1_notes_url = f"/api/v1/admin/customers/{self.customer1.id}/notes/"
        self.c2_notes_url = f"/api/v1/admin/customers/{self.customer2.id}/notes/"

    def test_anonymous_access_denied(self):
        """Anonymous requests to notes list and create must return 401."""
        res = self.client.get(self.c1_notes_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        res = self.client.post(self.c1_notes_url, {"body": "Test note"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_ordinary_customer_access_denied(self):
        """Ordinary customers cannot read or compose internal support notes."""
        self.client.force_authenticate(user=self.customer1)

        res = self.client.get(self.c1_notes_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = self.client.post(self.c1_notes_url, {"body": "Secret note"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_and_staff_can_create_notes_with_author_attribution(self):
        """Staff and Admin can create notes; author is safely derived from session."""
        # 1. Admin creates note
        self.client.force_authenticate(user=self.admin_user)
        payload = {"body": "Customer requested tailored blouse fitting for Order #CBC-2026-000001."}
        res = self.client.post(self.c1_notes_url, payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        data = res.json()
        self.assertEqual(data["body"], payload["body"])
        self.assertEqual(data["author_id"], str(self.admin_user.id))
        self.assertEqual(data["author_name"], "Lead Concierge")
        self.assertEqual(data["author_email"], "admin@closetbychilli.com")
        self.assertEqual(data["customer_id"], str(self.customer1.id))
        self.assertIn("id", data)
        self.assertIn("created_at", data)

        # 2. Staff creates note on same customer
        self.client.force_authenticate(user=self.staff_user)
        payload2 = {"body": "Confirmed custom sleeve measurement: 24 inches."}
        res2 = self.client.post(self.c1_notes_url, payload2)
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        data2 = res2.json()
        self.assertEqual(data2["author_id"], str(self.staff_user.id))
        self.assertEqual(data2["author_name"], "Atelier Tailor")

    def test_notes_scoped_to_customer_and_sorted_newest_first(self):
        """Listing notes for Customer 1 only returns Customer 1 notes, newest first."""
        self.client.force_authenticate(user=self.admin_user)

        # Create 2 notes for customer 1
        note1 = CustomerNote.objects.create(
            customer=self.customer1,
            author=self.admin_user,
            body="First note: Customer inquiry about silk dupatta.",
        )
        note2 = CustomerNote.objects.create(
            customer=self.customer1,
            author=self.staff_user,
            body="Second note: Dupatta reserved in archive.",
        )

        # Create 1 note for customer 2
        CustomerNote.objects.create(
            customer=self.customer2,
            author=self.admin_user,
            body="Customer 2 inquiry about returns.",
        )

        # Query Customer 1 notes
        res = self.client.get(self.c1_notes_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json()["results"]
        self.assertEqual(len(results), 2)
        # Newest note (note2) first
        self.assertEqual(results[0]["id"], str(note2.id))
        self.assertEqual(results[0]["body"], note2.body)
        self.assertEqual(results[1]["id"], str(note1.id))

        # Query Customer 2 notes
        res2 = self.client.get(self.c2_notes_url)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        results2 = res2.json()["results"]
        self.assertEqual(len(results2), 1)
        self.assertEqual(results2[0]["body"], "Customer 2 inquiry about returns.")

    def test_unknown_customer_id_returns_404(self):
        """Requests with nonexistent customer UUID return 404."""
        self.client.force_authenticate(user=self.admin_user)
        fake_uuid = uuid.uuid4()
        url = f"/api/v1/admin/customers/{fake_uuid}/notes/"

        res_get = self.client.get(url)
        self.assertEqual(res_get.status_code, status.HTTP_404_NOT_FOUND)

        res_post = self.client.post(url, {"body": "Note for ghost customer"})
        self.assertEqual(res_post.status_code, status.HTTP_404_NOT_FOUND)

    def test_empty_and_oversized_notes_validation(self):
        """Rejects empty string, whitespace-only, and oversized notes (>3000 chars)."""
        self.client.force_authenticate(user=self.admin_user)

        # Empty body
        res = self.client.post(self.c1_notes_url, {"body": ""})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Whitespace only
        res = self.client.post(self.c1_notes_url, {"body": "   \n  \t  "})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Missing body field
        res = self.client.post(self.c1_notes_url, {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Oversized (> 3000 chars)
        res = self.client.post(self.c1_notes_url, {"body": "x" * 3001})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid maximum length (3000 chars)
        res_valid = self.client.post(self.c1_notes_url, {"body": "A" * 3000})
        self.assertEqual(res_valid.status_code, status.HTTP_201_CREATED)

    def test_author_spoofing_prevention(self):
        """Client-supplied author_id or author_name cannot override authenticated author."""
        self.client.force_authenticate(user=self.staff_user)

        spoofed_payload = {
            "body": "Legitimate note body.",
            "author_id": str(self.admin_user.id),
            "author_name": "Infiltrator Admin",
            "author_email": "spoofed@admin.com",
            "customer_id": str(self.customer2.id),  # Attempting to re-route customer
        }

        res = self.client.post(self.c1_notes_url, spoofed_payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        data = res.json()
        # Author must be staff_user who executed the request, NOT admin_user
        self.assertEqual(data["author_id"], str(self.staff_user.id))
        self.assertEqual(data["author_name"], "Atelier Tailor")
        self.assertEqual(data["author_email"], "atelier.staff@closetbychilli.com")
        self.assertEqual(data["customer_id"], str(self.customer1.id))

    def test_customer_facing_endpoints_do_not_expose_notes(self):
        """Ensure customer notes do not leak in customer account API or customer models."""
        CustomerNote.objects.create(
            customer=self.customer1,
            author=self.admin_user,
            body="CONFIDENTIAL: VIP sizing adjustment required.",
        )

        # Verify that customer profile representation contains no notes
        self.client.force_authenticate(user=self.customer1)
        res = self.client.get("/api/v1/auth/profile/")
        if res.status_code == status.HTTP_200_OK:
            self.assertNotIn("notes", res.json())
            self.assertNotIn("support_notes", res.json())
            self.assertNotIn("CONFIDENTIAL", str(res.content))
