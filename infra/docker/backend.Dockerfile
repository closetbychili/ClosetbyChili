# ================================================
# Closet by Chilli — Backend Development Dockerfile
# ================================================

FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY apps/backend/requirements/base.txt /tmp/requirements/base.txt
COPY apps/backend/requirements/development.txt /tmp/requirements/development.txt
RUN pip install --no-cache-dir -r /tmp/requirements/development.txt

# Copy backend source
COPY apps/backend/ /app/

# Expose port
EXPOSE 8000

# Default command
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
