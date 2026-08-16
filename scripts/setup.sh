#!/usr/bin/env bash
# ================================================
# Closet by Chilli — Local Development Setup
# ================================================

set -e

echo "Setting up Closet by Chilli local development environment..."

# 1. Environment files
echo "1. Checking environment files..."
if [ ! -f .env ]; then
  echo "   Creating .env from .env.example..."
  cp .env.example .env
else
  echo "   .env already exists."
fi

# 2. Python environment
echo "2. Setting up Python virtual environment..."
cd apps/backend
if [ ! -d .venv ]; then
  python -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements/development.txt
cd ../..

# 3. Node environment
echo "3. Setting up Node dependencies..."
cd apps/frontend
npm install
cd ../..

# 4. Pre-commit hooks
echo "4. Installing pre-commit hooks..."
pre-commit install

echo "Setup complete! You can now start the services:"
echo "- Docker: docker-compose up -d"
echo "- Backend: cd apps/backend && source .venv/bin/activate && python manage.py runserver"
echo "- Frontend: cd apps/frontend && npm run dev"
