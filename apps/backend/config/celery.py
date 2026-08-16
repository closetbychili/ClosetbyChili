"""
Closet by Chilli — Celery Configuration

Celery app is configured here and imported via config/__init__.py
so that shared_task decorators use this app instance.
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("closet_by_chilli")

# Load Celery settings from Django settings, using the CELERY_ namespace.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed Django apps.
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    # Debug task to verify Celery is working.
    pass
