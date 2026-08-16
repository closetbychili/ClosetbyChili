# Closet by Chilli

Closet by Chilli is a production-grade fashion ecommerce platform serving both retail and wholesale customers.

## Architecture Overview

- **Frontend**: Next.js + React + TypeScript + Tailwind CSS (App Router)
- **Backend**: Django + Django REST Framework + Celery
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Cache/Broker**: Redis

The Django backend is the authoritative business layer. The frontend consumes the backend's REST APIs.

## Repository Structure

This is a monorepo containing the following components:

- `apps/backend/` — The Django backend application.
- `apps/frontend/` — The Next.js frontend application.
- `docs/` — Authoritative architectural and project documentation.
- `infra/` — Docker configurations and infrastructure definitions.
- `scripts/` — Development and automation scripts.
- `tests/` — Cross-application / End-to-End tests.
- `.github/` — CI/CD workflows and GitHub templates.

## Prerequisites

- Node.js 20+
- Python 3.12+
- Docker and Docker Compose

## Local Development

You can run the full stack via Docker, or run services locally.

### Setup

```bash
# Copy environment configuration
cp .env.example .env
# Edit .env with your local or development credentials
```

### Option A: Docker Compose

```bash
# Start backend, frontend, postgres, redis, and celery
docker-compose up -d
```

### Option B: Local Services

**Backend:**
```bash
cd apps/backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements/development.txt
python manage.py runserver
```

**Frontend:**
```bash
cd apps/frontend
npm install
npm run dev
```

## Development Sprints

This project is developed using AI-agent driven implementation sprints.
Please refer to `docs/11-development-workflow.md` for sprint guidelines and definition of done.

## Documentation

The `docs/` directory is the single source of truth for all architectural decisions. Do not change architecture without updating the relevant document first.
