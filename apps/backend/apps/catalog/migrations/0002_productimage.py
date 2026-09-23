# Generated manually for Sprint 0.3 — Database-Driven Product Media

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductImage",
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
                # Relative path or absolute URL stored as plain text so the
                # value is environment-agnostic (no localhost / Vercel domain).
                ("image_url", models.CharField(max_length=2048)),
                ("alt_text", models.CharField(blank=True, default="", max_length=512)),
                ("ordering", models.IntegerField(default=0)),
                ("is_primary", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="images",
                        to="catalog.product",
                    ),
                ),
            ],
            options={
                "db_table": "catalog_product_images",
                "ordering": ["ordering", "created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="productimage",
            index=models.Index(fields=["product"], name="idx_product_image_product"),
        ),
        # Stable seed key: (product, ordering) is unique.
        migrations.AddConstraint(
            model_name="productimage",
            constraint=models.UniqueConstraint(
                fields=["product", "ordering"],
                name="uq_product_image_ordering",
            ),
        ),
        # Partial unique constraint: at most one is_primary image per product.
        migrations.AddConstraint(
            model_name="productimage",
            constraint=models.UniqueConstraint(
                fields=["product"],
                condition=models.Q(is_primary=True),
                name="uq_product_primary_image",
            ),
        ),
    ]
