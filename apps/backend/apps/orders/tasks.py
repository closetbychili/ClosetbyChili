"""
Closet by Chilli — Celery Tasks for Asynchronous Notifications.
"""

from __future__ import annotations

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_order_notification_task(self, notification_id: str):
    """
    Celery task to deliver order email notifications asynchronously.
    Catches exceptions and retries with backoff up to max_retries.
    """
    from apps.orders.notifications import dispatch_notification

    try:
        return dispatch_notification(notification_id)
    except Exception as exc:
        logger.warning(
            "Task send_order_notification_task(%s) attempt %s failed: %s",
            notification_id,
            self.request.retries + 1,
            exc,
        )
        if self.request.retries < self.max_retries:
            from django.conf import settings
            delay = 0 if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False) else 60
            raise self.retry(exc=exc, countdown=delay)
        raise
