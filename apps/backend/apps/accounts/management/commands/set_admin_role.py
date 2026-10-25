"""
Management command to safely grant or revoke administrative roles.

Usage:
    python manage.py set_admin_role --email admin@closetbychilli.com
    python manage.py set_admin_role --supabase-user-id <uuid> --role admin
    python manage.py set_admin_role --email user@example.com --revoke
    python manage.py set_admin_role --email newadmin@closetbychilli.com --supabase-user-id <uuid> --create-if-missing
"""

import uuid
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import CustomerProfile, User


class Command(BaseCommand):
    help = "Safely grant or revoke administrative and staff roles for Closet by Chilli accounts."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--email",
            type=str,
            help="Email address of the target application account.",
        )
        parser.add_argument(
            "--supabase-user-id",
            type=str,
            help="Supabase Auth UUID of the target account.",
        )
        parser.add_argument(
            "--role",
            type=str,
            choices=[choice.value for choice in User.Role],
            default=User.Role.ADMIN.value,
            help="Target role to assign (default: admin).",
        )
        parser.add_argument(
            "--revoke",
            action="store_true",
            help="Shortcut to demote the account back to 'customer'.",
        )
        parser.add_argument(
            "--create-if-missing",
            action="store_true",
            help="Create application User record if absent (requires --supabase-user-id).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate the role change without committing to the database.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        email = (options.get("email") or "").strip().lower()
        raw_supabase_id = options.get("supabase_user_id")
        target_role = User.Role.CUSTOMER.value if options.get("revoke") else options["role"]
        create_if_missing = options.get("create_if_missing", False)
        dry_run = options.get("dry_run", False)

        if not email and not raw_supabase_id:
            raise CommandError("You must specify either --email or --supabase-user-id.")

        supabase_uuid: uuid.UUID | None = None
        if raw_supabase_id:
            try:
                supabase_uuid = uuid.UUID(str(raw_supabase_id).strip())
            except (ValueError, AttributeError) as exc:
                raise CommandError(f"Invalid UUID supplied for --supabase-user-id: {raw_supabase_id}") from exc

        with transaction.atomic():
            user: User | None = None

            if supabase_uuid:
                user = User.objects.filter(supabase_user_id=supabase_uuid).first()

            if user is None and email:
                user = User.objects.filter(email__iexact=email).first()

            if user is None:
                if not create_if_missing:
                    raise CommandError(
                        f"No application user found matching email='{email}' or "
                        f"supabase_user_id='{raw_supabase_id}'. Use --create-if-missing "
                        "with --supabase-user-id if you wish to pre-provision an account."
                    )

                if not supabase_uuid:
                    raise CommandError(
                        "--create-if-missing requires a valid --supabase-user-id."
                    )

                if dry_run:
                    self.stdout.write(
                        self.style.WARNING(
                            f"[DRY-RUN] Would create new user with email='{email or ''}', "
                            f"supabase_user_id='{supabase_uuid}', and role='{target_role}'."
                        )
                    )
                    return

                user = User.objects.create(
                    supabase_user_id=supabase_uuid,
                    email=email or "",
                    role=target_role,
                    is_active=True,
                )
                CustomerProfile.objects.get_or_create(user=user)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Successfully pre-provisioned User {user.id} ({user.email or user.supabase_user_id}) "
                        f"with role '{target_role}'."
                    )
                )
                return

            # Existing user found
            current_role = user.role
            if current_role == target_role and user.is_active:
                self.stdout.write(
                    self.style.NOTICE(
                        f"User {user.email or user.supabase_user_id} already has role '{target_role}' "
                        "and is active. No changes needed."
                    )
                )
                return

            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f"[DRY-RUN] Would update user {user.email or user.supabase_user_id} "
                        f"role from '{current_role}' to '{target_role}' (is_active=True)."
                    )
                )
                return

            user.role = target_role
            user.is_active = True
            user.save(update_fields=["role", "is_active", "updated_at"])

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully updated user {user.email or user.supabase_user_id} "
                    f"role from '{current_role}' to '{target_role}'."
                )
            )
