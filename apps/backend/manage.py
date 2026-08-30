#!/usr/bin/env python
"""Django management script for Closet by Chilli."""

import os
from pathlib import Path
import sys


def load_env_file() -> None:
    """Load key-value pairs from .env files into os.environ if not already set."""
    base_dir = Path(__file__).resolve().parent
    env_paths = [
        base_dir / ".env",
        base_dir.parent.parent / ".env",
    ]
    for env_path in env_paths:
        if env_path.is_file():
            try:
                with open(env_path, encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, val = line.split("=", 1)
                            key = key.strip()
                            val = val.strip().strip("'\"")
                            os.environ.setdefault(key, val)
            except Exception:
                pass


def main():
    """Run administrative tasks."""
    load_env_file()
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()

