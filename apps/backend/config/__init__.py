# Import Celery app so that shared_task uses this app.
from config.celery import app as celery_app

__all__ = ["celery_app"]
