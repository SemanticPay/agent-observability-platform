# Development Guide

## Prerequisites

- Python 3.12+
- Node.js 18+
- Docker & Docker Compose (for PostgreSQL and Prometheus)
- Google Cloud account with:
  - Vertex AI API enabled
  - Cloud Vision API enabled
  - `gcloud auth application-default login` configured

## Quick Start

```bash
# 1. Clone and install dependencies
make install

# Or manually:
pip install -r requirements.txt
cd agent/frontend && npm install --legacy-peer-deps
cd dashboard-ui/new && npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Google Cloud project ID and other settings

# 3. Start database
docker-compose up -d postgres

# 4. Start backend (in one terminal)
make backend

# 5. Start frontend (in another terminal)
make frontend
```

Then open http://localhost:5173 to use the chat interface.

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

### Required Google Cloud Settings

```bash
# Core GCP
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GCS_LOCATION=us-central1
GCS_BUCKET_NAME=your-bucket
GOOGLE_API_KEY=your-maps-api-key  # for geocoding

# Optional (for RAG)
VERTEX_RAG_CORPUS=your-corpus-name
```

### DETRAN v2 Environment Variables

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

## PostgreSQL Setup

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

# Reset database (delete all data)
docker-compose down -v
docker-compose up -d postgres
```

Schema and seed data are auto-applied from `db/init.sql` and `db/seed.sql`.

## DETRAN v2 End-to-End Flow

1. **Start the system:**
   ```bash
   docker-compose up -d postgres
   make backend   # Terminal 1
   make frontend  # Terminal 2
   ```

2. **Register a user:**
   - Go to http://localhost:5173
   - Click "Register" or use the API:
     ```bash
     curl -X POST http://localhost:8000/api/v1/auth/register \
       -H "Content-Type: application/json" \
       -d '{"email": "test@example.com", "password": "password123"}'
     ```

3. **Login:**
   - Enter credentials in the login form
   - Or via API:
     ```bash
     curl -X POST http://localhost:8000/api/v1/auth/login \
       -H "Content-Type: application/x-www-form-urlencoded" \
       -d "username=test@example.com&password=password123"
     ```

4. **Start a renewal:**
   - Type: "I want to renew my driver's license"
   - Agent triggers `start_driver_license_renewal` action
   - Fill in the form (CPF, CNH Number, CNH Mirror)

5. **Pay the invoice:**
   - QR code displays BOLT11 Lightning invoice
   - Click "Confirm Payment"
   - In stub mode, payment confirms after 3 attempts

6. **Check status:**
   - Ask: "What's my ticket status?"
   - Agent uses MCP tools to query tickets

## API Documentation

FastAPI auto-generates OpenAPI docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

Key endpoints:
- `POST /api/v1/auth/register` - Create user
- `POST /api/v1/auth/login` - Get JWT tokens
- `GET /api/v1/operations` - List available operations
- `POST /api/v1/tickets` - Create ticket (requires auth)
- `POST /api/v1/tickets/{id}/confirm-payment` - Check payment status

## Troubleshooting

### Database connection errors
```bash
# Check PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres
```

### Import errors (jose, passlib, asyncpg)
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend npm errors
```bash
cd agent/frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Google Cloud authentication
```bash
gcloud auth application-default login
```
