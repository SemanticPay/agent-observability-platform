# Development Guide

## Prerequisites

- Python 3.12+
- Node.js 18+
- Docker (for Prometheus)
- Credentials and API keys configured in `.env` files

## Quick Start

```bash
# Install all dependencies
make install

# Or manually:
pip install -r requirements.txt
cd agent/frontend && npm install --legacy-peer-deps
cd dashboard-ui/new && npm install
```

## Running Services

| Service | Command | URL |
|---------|---------|-----|
| PostgreSQL | `docker-compose up -d postgres` | localhost:5432 |
| Backend (FastAPI) | `make backend` | http://localhost:8000 |
| Agent Frontend | `make frontend` | http://localhost:5173 |
| Dashboard UI | `make dashboard` | http://localhost:5174 |
| Dashboard Chat Server | `make dashboard-chat` | http://localhost:4000 |
| Prometheus | `make prometheus` | http://localhost:9093 |

## Full Stack (Multiple Terminals)

```bash
# Terminal 0 - Database (run first)
docker-compose up -d postgres

# Terminal 1 - Backend
make backend

# Terminal 2 - Prometheus
make prometheus

# Terminal 3 - Agent Frontend
make frontend

# Terminal 4 - Dashboard
make dashboard

# Terminal 5 - Dashboard Chat (optional)
make dashboard-chat
```

## Environment

Copy `.env.example` to `.env` and configure the missing values.
Note that there are multiple `.env` files for different components.

### DETRAN v2 Environment Variables (NEW)

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=detran
POSTGRES_USER=detran
POSTGRES_PASSWORD=detran

# Auth
JWT_SECRET_KEY=change-me-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Lightning Network
SPARK_MODE=stub  # stub | production
```

## PostgreSQL Setup (NEW)

The database is managed via Docker:

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Check status
docker-compose ps

# View logs
docker-compose logs postgres

# Stop
docker-compose down
```

Schema and seed data are auto-applied from `db/init.sql` and `db/seed.sql`.
