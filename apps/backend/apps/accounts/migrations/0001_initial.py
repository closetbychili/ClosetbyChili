# Generated manually to keep the migration explicit and reviewable.
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("supabase_user_id", models.UUIDField(db_index=True, unique=True)),
                ("email", models.EmailField(blank=True, max_length=254)),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("customer", "Customer"),
                            ("wholesale_customer", "Wholesale Customer"),
                            ("staff", "Staff"),
                            ("admin", "Admin"),
                        ],
                        default="customer",
                        max_length=32,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "accounts_users"},
        ),
        migrations.CreateModel(
            name="CustomerProfile",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("display_name", models.CharField(blank=True, max_length=150)),
                ("phone", models.CharField(blank=True, max_length=30)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to="accounts.user",
                    ),
                ),
            ],
            options={"db_table": "accounts_customer_profiles"},
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(
                fields=["supabase_user_id"], name="idx_account_supabase_id"
            ),
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["role"], name="idx_account_user_role"),
        ),
    ]
