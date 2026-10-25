"""
Management command to expire stale inventory reservations.

Can be run via cron, worker container, or scheduled tasks:
    python manage.py expire_reservations
"""

from typing import Any
from django.core.management.base import BaseCommand
from apps.inventory.services import expire_stale_reservations


class Command(BaseCommand):
    help = "Expire active inventory reservations that have passed their expiration window."

    def handle(self, *args: Any, **options: Any) -> None:
        self.stdout.write("Checking for stale inventory reservations...")
        count = expire_stale_reservations()
        self.stdout.write(
            self.style.SUCCESS(f"Successfully processed and released {count} expired reservation(s).")
        )
