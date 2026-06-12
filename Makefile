.PHONY: dev build up down logs migrate test lint clean

# ============================================
# Docker Compose shortcuts
# ============================================
up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

build:
	docker-compose build

restart:
	docker-compose restart

# ============================================
# Backend
# ============================================
backend-shell:
	docker-compose exec backend bash

migrate:
	docker-compose exec backend alembic upgrade head

migrate-create:
	docker-compose exec backend alembic revision --autogenerate -m "$(msg)"

test:
	docker-compose exec backend pytest tests/ -v

lint:
	docker-compose exec backend ruff check app/

format:
	docker-compose exec backend ruff format app/

# ============================================
# Frontend
# ============================================
frontend-shell:
	docker-compose exec frontend sh

frontend-install:
	docker-compose exec frontend npm install

frontend-build:
	docker-compose exec frontend npm run build

# ============================================
# Cleanup
# ============================================
clean:
	docker-compose down -v
	rm -rf backend/__pycache__ backend/app/**/__pycache__
	rm -rf frontend/dist frontend/node_modules
