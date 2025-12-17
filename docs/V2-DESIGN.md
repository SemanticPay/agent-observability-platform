# DETRAN-SP v2 - Complete Design Document

> Comprehensive technical design for Brazilian driver's license renewal with Lightning Network payments.

**Version**: 2.0  
**Date**: December 2025  
**Status**: Implementation Complete

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [API Specification](#4-api-specification)
5. [Lightning Network Integration](#5-lightning-network-integration)
6. [Agent System](#6-agent-system)
7. [Frontend Implementation](#7-frontend-implementation)
8. [Security](#8-security)
9. [Configuration](#9-configuration)
10. [Deployment](#10-deployment)
11. [Testing](#11-testing)

---

## 1. Overview

### 1.1 Purpose

DETRAN-SP v2 is an agentic chat system for Brazilian driver's license (CNH) renewal with Lightning Network payments. It enables citizens to:

- Renew their driver's license through conversational AI
- Pay fees instantly via Bitcoin Lightning Network
- Track ticket status through natural language queries

### 1.2 Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent Orchestration** | Google ADK agents route queries to specialized sub-agents |
| **Lightning Payments** | BOLT11 invoices via WDK Spark integration |
| **JWT Authentication** | Secure user registration and session management |
| **MCP Server** | AI agents query data via Model Context Protocol |
| **Real-time UI** | CopilotKit-powered chat with embedded payment flows |

### 1.3 User Flow Summary

```
1. Login     → User authenticates with email/password
2. Intent    → User: "I want to renew my driver's license"
3. Form      → Agent triggers form → User enters CPF, CNH Number, CNH Mirror
4. Confirm   → User reviews details and price before proceeding  
5. Ticket    → System creates ticket + Lightning invoice
6. Payment   → User scans QR code and pays via Lightning wallet
7. Confirm   → User confirms payment → System verifies via Spark
8. Success   → Ticket marked as paid
```

---

## 2. Architecture

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React + CopilotKit)               │
│  ┌─────────────┐  ┌─────────────────┐  ┌────────────────────┐   │
│  │ LoginForm   │  │ RenewalForm     │  │ PaymentQR/Status   │   │
│  └─────────────┘  │ Confirmation    │  └────────────────────┘   │
│                   └─────────────────┘                            │
│         │                  │                    │                │
│         └──────────────────┼────────────────────┘                │
│                            │ CopilotKit Actions                  │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                     FastAPI Backend                              │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ /auth/*  │  │/operations│  │ /tickets │  │    /mcp      │   │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │             │               │            │
│  ┌────┴──────────────┴─────────────┴───────────────┘            │
│  │                    Repositories                               │
│  └────┬──────────────┬─────────────┬────────────────────────────┤
│       │              │             │                             │
│  ┌────┴────┐  ┌──────┴─────┐  ┌────┴─────┐  ┌────────────────┐  │
│  │PostgreSQL│  │WDK Spark   │  │  MCP     │  │    Agents      │  │
│  │   DB     │  │(Lightning) │  │ Server   │  │ (orchestrator) │  │
│  └──────────┘  └────────────┘  └──────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **UI (React)** | Chat interface, forms, QR display, CopilotKit actions |
| **Agent (ADK)** | Intent detection, orchestration, query routing |
| **API (FastAPI)** | Write operations: auth, create_ticket, confirm_payment |
| **MCP Server** | Read-only tools for agents: list_tickets, get_ticket |
| **WDK Spark** | Lightning invoice creation and payment verification |
| **PostgreSQL** | Operations, tickets, users persistence |

### 2.3 Data Flow

**Writes** (User Actions):
```
UI → FastAPI API → Repository → PostgreSQL + WDK Spark
```

**Reads** (Agent Queries):
```
Agent → MCP Server → Repository → PostgreSQL
```

**Frontend Tools**:
```
Agent signals intent → CopilotKit action renders component → UI handles interaction
```

---

## 3. Data Models

### 3.1 Database Schema

#### operations

Defines available DETRAN services.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| name | TEXT | Unique identifier (e.g., `driver_license_renewal`) |
| description | TEXT | Human-friendly description |
| price | INTEGER | Fee in satoshis |
| required_fields | JSONB | Schema: `{field_name: type}` for validation |
| created_at | TIMESTAMP | Creation timestamp |

**Seed Data**:
```sql
INSERT INTO operations (name, description, price, required_fields) VALUES (
  'driver_license_renewal',
  'Renovação da CNH - Carteira Nacional de Habilitação',
  50000,  -- 50,000 sats (~$50 USD)
  '{"cpf": "string", "cnh_number": "string", "cnh_mirror": "string"}'
);
```

#### users

Registered users with hashed passwords.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| email | TEXT | Unique email address |
| password_hash | TEXT | bcrypt-hashed password |
| created_at | TIMESTAMP | Registration timestamp |

#### tickets

Service tickets with Lightning invoice data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| operation_id | INTEGER | FK → operations.id |
| user_id | UUID | FK → users.id |
| form_data | JSONB | User-submitted data (cpf, cnh_number, etc.) |
| ln_invoice_id | TEXT | Lightning invoice ID from WDK Spark |
| ln_invoice | TEXT | BOLT11 invoice string for QR |
| amount_sats | INTEGER | Payment amount in satoshis |
| payment_status | TEXT | `pending` \| `paid` |
| created_at | TIMESTAMP | Creation timestamp |

### 3.2 Pydantic Models

#### Authentication

```python
class UserCreate(BaseModel):
    email: str
    password: str

class UserInDB(BaseModel):
    id: UUID
    email: str
    password_hash: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
```

#### Lightning Network

```python
class Invoice(BaseModel):
    invoice_id: str
    bolt11: str
    amount_sats: int
    memo: str = ""
    created_at: datetime
    expires_at: datetime  # 15 minutes from creation

class PaymentStatus(BaseModel):
    invoice_id: str
    paid: bool
    paid_at: Optional[datetime]
    expired: bool
```

---

## 4. API Specification

**Base URL**: `/api/v1`

### 4.1 Authentication Endpoints

#### POST /auth/register

Create a new user account.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2025-12-17T10:30:00Z"
}
```

**Errors**:
- `400` - Email already registered

#### POST /auth/login

Authenticate and get JWT tokens.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response 200**:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Errors**:
- `401` - Invalid credentials

#### POST /auth/refresh

Refresh access token using refresh token.

**Request**:
```json
{
  "refresh_token": "eyJ..."
}
```

**Response 200**:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### 4.2 Operations Endpoints

#### GET /operations

List all available operations.

**Response 200**:
```json
[
  {
    "id": 1,
    "name": "driver_license_renewal",
    "description": "Renovação da CNH",
    "price": 50000,
    "required_fields": {"cpf": "string", "cnh_number": "string", "cnh_mirror": "string"}
  }
]
```

#### GET /operations/{id}

Get operation by ID.

**Response 200**:
```json
{
  "id": 1,
  "name": "driver_license_renewal",
  "description": "Renovação da CNH",
  "price": 50000,
  "required_fields": {"cpf": "string", "cnh_number": "string", "cnh_mirror": "string"}
}
```

### 4.3 Tickets Endpoints

All tickets endpoints require JWT authentication via `Authorization: Bearer <token>` header.

#### POST /tickets

Create a new ticket with Lightning invoice.

**Request**:
```json
{
  "operation_id": 1,
  "form_data": {
    "cpf": "12345678901",
    "cnh_number": "ABC123456",
    "cnh_mirror": "XYZ789"
  }
}
```

**Response 201**:
```json
{
  "ticket_id": "uuid",
  "ln_invoice": "lnbc50000n1p...",
  "amount_sats": 50000,
  "expires_at": "2025-12-17T10:45:00Z"
}
```

**Errors**:
- `400 missing_required_fields` - `{"error": "missing_required_fields", "missing": ["cpf"]}`
- `404 operation_not_found` - Operation doesn't exist
- `500 invoice_creation_failed` - WDK Spark error

#### GET /tickets

List user's tickets.

**Query Parameters**:
- `status` (optional): `pending` | `paid`
- `limit` (optional): default 20
- `offset` (optional): default 0

**Response 200**:
```json
{
  "tickets": [
    {
      "id": "uuid",
      "operation_name": "driver_license_renewal",
      "payment_status": "pending",
      "amount_sats": 50000,
      "created_at": "2025-12-17T10:30:00Z"
    }
  ],
  "total": 1
}
```

#### GET /tickets/{id}

Get ticket details. Only owner can access.

**Response 200**:
```json
{
  "id": "uuid",
  "operation_id": 1,
  "operation_name": "driver_license_renewal",
  "form_data": {"cpf": "12345678901", "cnh_number": "ABC123456", "cnh_mirror": "XYZ789"},
  "ln_invoice": "lnbc50000n1p...",
  "amount_sats": 50000,
  "payment_status": "pending",
  "created_at": "2025-12-17T10:30:00Z"
}
```

**Errors**:
- `403 forbidden` - Not your ticket
- `404 ticket_not_found` - Ticket doesn't exist

#### POST /tickets/{id}/confirm-payment

Check and confirm payment status.

**Response 200**:
```json
{
  "status": "paid"
}
```

Or if payment not yet received:
```json
{
  "status": "pending"
}
```

Or if invoice expired:
```json
{
  "status": "expired"
}
```

### 4.4 Error Response Format

All errors follow this format:

```json
{
  "detail": {
    "error": "error_code",
    "message": "Human-readable message",
    "missing": ["field1", "field2"]  // only for missing_required_fields
  }
}
```

| Code | HTTP | Description |
|------|------|-------------|
| `unauthorized` | 401 | Missing/invalid token |
| `forbidden` | 403 | Not your ticket |
| `ticket_not_found` | 404 | Ticket doesn't exist |
| `operation_not_found` | 404 | Operation doesn't exist |
| `missing_required_fields` | 400 | form_data validation failed |
| `invoice_creation_failed` | 500 | WDK Spark error |

---

## 5. Lightning Network Integration

### 5.1 WDK Spark Client

The system integrates with WDK Spark (Tether wallet SDK) for Lightning Network payments.

#### Client Interface

```python
class SparkClient(ABC):
    @abstractmethod
    async def create_invoice(
        self, 
        amount_sats: int, 
        memo: str = "",
        expiry_minutes: int = 15
    ) -> Invoice:
        """Create a Lightning invoice."""
        pass
    
    @abstractmethod
    async def check_payment(self, invoice_id: str) -> PaymentStatus:
        """Check payment status for an invoice."""
        pass
```

#### Implementation Modes

| Mode | Class | Use Case |
|------|-------|----------|
| `stub` | `StubSparkClient` | Development/testing - fake invoices, simulates payment after 3 checks |
| `production` | `WdkSparkClient` | Real Lightning payments via WDK Spark API |

### 5.2 Invoice Lifecycle

```
1. Create Invoice (POST /tickets)
   └── WDK Spark creates BOLT11 invoice
   └── Invoice expires after 15 minutes

2. Display QR Code
   └── Frontend shows QR with BOLT11 string
   └── User pays with Lightning wallet (out-of-band)

3. Confirm Payment (POST /tickets/{id}/confirm-payment)
   └── WDK Spark checks invoice status
   └── If paid: update ticket status to "paid"
   └── If expired: return expired status
   └── If pending: return pending status
```

### 5.3 Stub Behavior (Development)

The `StubSparkClient` simulates the payment flow:

- Generates fake but realistic-looking BOLT11 invoices
- Tracks check attempts per invoice
- After 3 `check_payment()` calls, marks invoice as paid
- Respects 15-minute expiry (returns `expired: true` after)

---

## 6. Agent System

### 6.1 Agent Hierarchy

```
orchestrator_agent (routes queries)
├── drivers_license_agent (RAG-powered Q&A)
│   └── Tool: get_drivers_license_context
├── scheduler_agent (clinic search & booking)
│   └── Tools: geocode_location, search_nearby_clinics, book_exam
└── detran_agent (transactions & payments)
    └── Tools: MCP tools + frontend tool
```

### 6.2 Routing Rules

| Intent | Routes To | Examples |
|--------|-----------|----------|
| Information about renewal requirements | drivers_license_agent | "What documents do I need?" |
| Booking exams/finding clinics | scheduler_agent | "Find a clinic near me" |
| Start renewal / pay / check status | detran_agent | "I want to renew my license" |

### 6.3 DETRAN Agent

**Model**: Gemini 2.5 Flash

**Capabilities**:
- Guide users through CNH renewal process
- Trigger `start_driver_license_renewal` frontend tool
- Query tickets via MCP tools
- Explain Lightning Network payments
- Check payment status

**MCP Tools Available**:
- `list_operations` - List DETRAN services
- `get_operation` - Get operation details by ID
- `list_tickets` - List user's tickets
- `get_ticket` - Get ticket by ID

**Frontend Tools Available**:
- `start_driver_license_renewal` - Opens renewal form in UI

### 6.4 MCP Server

The MCP server exposes read-only API endpoints as tools for AI agents.

**Configuration** (via `fastapi-mcp`):
```python
mcp = FastApiMCP(
    app,
    name="detran-mcp",
    include_operations=["list_operations", "get_operation", "list_tickets", "get_ticket"]
)
```

**Endpoint**: `/mcp`

---

## 7. Frontend Implementation

### 7.1 Components

| Component | File | Purpose |
|-----------|------|---------|
| `LoginForm` | `LoginForm.tsx` | Email/password authentication |
| `RenewalForm` | `RenewalForm.tsx` | CPF, CNH Number, CNH Mirror inputs |
| `RenewalConfirmation` | `RenewalConfirmation.tsx` | Review details before payment |
| `PaymentQR` | `PaymentQR.tsx` | QR code display with BOLT11 invoice |
| `PaymentStatus` | `PaymentStatus.tsx` | Success/pending state display |
| `AuthContext` | `AuthContext.tsx` | JWT token management |

### 7.2 Renewal Flow State Machine

```typescript
type RenewalFlowStep = 
  | 'idle'        // Initial state
  | 'form'        // Collecting user data
  | 'confirm'     // User reviews before submitting
  | 'confirming'  // Creating ticket (loading)
  | 'payment'     // Displaying QR code
  | 'success'     // Payment confirmed
  | 'error';      // Error occurred
```

**Transitions**:
```
idle ──startRenewal()──▶ form
form ──submitFormForConfirmation()──▶ confirm
confirm ──editForm()──▶ form
confirm ──confirmAndCreateTicket()──▶ confirming ──▶ payment
payment ──confirmPayment()──▶ success | payment (retry)
any ──cancelRenewal()──▶ idle
```

### 7.3 CopilotKit Integration

The `start_driver_license_renewal` action is registered via CopilotKit:

```typescript
useCopilotAction({
  name: "start_driver_license_renewal",
  description: "Starts the CNH renewal process with Lightning payment",
  parameters: [
    {
      name: "renewal_type",
      type: "string",
      description: "Type: 'standard' or 'change_category'",
      required: false,
    }
  ],
  handler: async ({ renewal_type }) => {
    renewalFlow.startRenewal();
    return `Starting ${renewal_type || 'standard'} CNH renewal...`;
  },
  render: ({ status }) => {
    // Renders appropriate component based on renewalFlow.step
  }
});
```

---

## 8. Security

### 8.1 Authentication

- **Password Storage**: bcrypt with automatic salt
- **Access Tokens**: JWT, 30-minute expiry
- **Refresh Tokens**: JWT, 7-day expiry
- **Token Validation**: FastAPI dependency `get_current_user`

### 8.2 Authorization

- Tickets are scoped to the authenticated user
- Users can only view/confirm their own tickets
- MCP read operations respect user context

### 8.3 API Security

- CORS configured for frontend origin
- Rate limiting recommended for production
- HTTPS required for production deployment

---

## 9. Configuration

### 9.1 Environment Variables

```bash
# Google Cloud (existing)
GOOGLE_CLOUD_PROJECT_ID=your-project
GCS_LOCATION=us-central1
VERTEX_RAG_CORPUS=your-corpus-name
GOOGLE_API_KEY=your-maps-api-key

# PostgreSQL (v2)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=detran
POSTGRES_USER=detran
POSTGRES_PASSWORD=detran

# Authentication (v2)
JWT_SECRET_KEY=change-me-in-production  # ⚠️ Must change for production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Lightning Network (v2)
SPARK_MODE=stub  # stub | production
SPARK_API_URL=https://api.wdk.io/spark  # For production
SPARK_API_KEY=your-api-key              # For production
```

### 9.2 Docker Services

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: detran
      POSTGRES_USER: detran
      POSTGRES_PASSWORD: detran
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/01-init.sql
      - ./db/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U detran"]
      interval: 5s
      timeout: 5s
      retries: 5
```

---

## 10. Deployment

### 10.1 Development Setup

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Install dependencies
make install

# 3. Start backend
make backend

# 4. Start frontend (separate terminal)
make frontend
```

### 10.2 Production Considerations

| Concern | Recommendation |
|---------|----------------|
| JWT Secret | Generate secure random key |
| SPARK_MODE | Set to `production` with real API credentials |
| Database | Use managed PostgreSQL (Cloud SQL, RDS) |
| HTTPS | Required for security |
| Rate Limiting | Add to prevent abuse |
| Logging | Configure structured logging |
| Monitoring | Integrate with observability platform |

---

## 11. Testing

### 11.1 Manual End-to-End Test

1. Start PostgreSQL: `docker-compose up -d postgres`
2. Start backend: `make backend`
3. Start frontend: `make frontend`
4. Open http://localhost:5173
5. Register a new user
6. Login with credentials
7. Type: "I want to renew my driver's license"
8. Fill form (CPF, CNH Number, CNH Mirror)
9. Review confirmation screen → Proceed
10. See QR code displayed
11. Click "Confirm Payment" 3 times (stub simulates payment)
12. See success message

### 11.2 API Testing

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Create ticket (use token from login)
curl -X POST http://localhost:8000/api/v1/tickets \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"operation_id": 1, "form_data": {"cpf": "12345678901", "cnh_number": "ABC123", "cnh_mirror": "XYZ789"}}'

# Confirm payment (3x for stub)
curl -X POST http://localhost:8000/api/v1/tickets/<ticket_id>/confirm-payment \
  -H "Authorization: Bearer <access_token>"
```

---

## Appendix A: File Structure

```
agent/backend/
├── auth/                    # JWT authentication
│   ├── __init__.py
│   ├── models.py            # UserCreate, UserInDB, Token
│   ├── utils.py             # hash_password, create_token, decode_token
│   └── dependencies.py      # get_current_user
├── spark/                   # Lightning Network
│   ├── __init__.py
│   ├── types.py             # Invoice, PaymentStatus
│   ├── client.py            # SparkClient abstract class
│   ├── stub.py              # StubSparkClient implementation
│   └── wdk.py               # WdkSparkClient (production)
├── mcp/                     # MCP Server
│   ├── __init__.py
│   └── server.py            # setup_mcp(app)
├── routes/                  # API endpoints
│   ├── __init__.py
│   ├── auth.py              # /api/v1/auth/*
│   ├── operations.py        # /api/v1/operations/*
│   └── tickets.py           # /api/v1/tickets/*
├── repositories/            # Database access
│   ├── __init__.py
│   ├── users.py
│   ├── operations.py
│   └── tickets.py
├── agents/
│   ├── detran/              # DETRAN agent
│   │   ├── __init__.py
│   │   ├── agent.py
│   │   └── prompt.py
│   └── orchestrator/        # Updated routing
├── database/
│   └── postgres.py          # Async SQLAlchemy
├── errors.py                # Custom exceptions
└── main.py                  # FastAPI app

db/
├── init.sql                 # Schema
└── seed.sql                 # Seed data

agent/frontend/src/
├── context/
│   └── AuthContext.tsx      # JWT management
├── hooks/
│   └── useRenewalFlow.ts    # State machine
├── components/
│   ├── LoginForm.tsx
│   ├── RenewalForm.tsx
│   ├── RenewalConfirmation.tsx
│   ├── PaymentQR.tsx
│   ├── PaymentStatus.tsx
│   └── CopilotKitPage.tsx   # Main chat + actions
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **CNH** | Carteira Nacional de Habilitação (Brazilian driver's license) |
| **CPF** | Cadastro de Pessoas Físicas (Brazilian tax ID) |
| **DETRAN-SP** | Department of Transit of São Paulo |
| **BOLT11** | Lightning Network invoice format |
| **satoshi (sat)** | Smallest unit of Bitcoin (0.00000001 BTC) |
| **WDK Spark** | Tether wallet SDK for Lightning payments |
| **MCP** | Model Context Protocol - AI agent tool protocol |
| **ADK** | Google Agent Development Kit |
| **CopilotKit** | React library for AI-powered UIs |

---

*Document generated: December 17, 2025*
