# DETRAN-SP v2 Implementation TODO

> Building Lightning Network payments and transactional ticket system on top of existing agent infrastructure.

---

## Phase 1: Configuration & Environment (FIRST)

### 1.1 New Environment Variables
- [x] Add to `config.py`:
  ```python
  # Database
  POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
  POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
  POSTGRES_DB = os.getenv("POSTGRES_DB", "detran")
  POSTGRES_USER = os.getenv("POSTGRES_USER", "detran")
  POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "detran")
  
  # Auth
  JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
  JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
  ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
  REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
  
  # Spark (Lightning)
  SPARK_MODE = os.getenv("SPARK_MODE", "stub")  # stub | production
  SPARK_API_URL = os.getenv("SPARK_API_URL", "")
  SPARK_API_KEY = os.getenv("SPARK_API_KEY", "")
  ```

### 1.2 Update .env.example
- [x] Add all new environment variables with example values

---

## Phase 2: Database Infrastructure

### 2.1 Docker Compose Updates
- [x] Add PostgreSQL service to `docker-compose.yml`
- [x] Add volume for database persistence
- [x] Configure health check for PostgreSQL

### 2.2 Database Connection
- [x] Add `asyncpg` and `sqlalchemy[asyncio]` to `requirements.txt`
- [x] Create `agent/backend/database/postgres.py`:
  - Async connection pool
  - `get_db()` dependency for FastAPI
  - Connection lifecycle management

### 2.3 Schema Creation (`db/init.sql`)
- [x] Create `operations` table:
  ```sql
  CREATE TABLE operations (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,  -- satoshis
    required_fields JSONB NOT NULL
  );
  ```
- [x] Create `users` table:
  ```sql
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [x] Create `tickets` table:
  ```sql
  CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id INTEGER REFERENCES operations(id),
    user_id UUID REFERENCES users(id),
    form_data JSONB NOT NULL,
    ln_invoice_id TEXT,
    ln_invoice TEXT,  -- BOLT11 string
    amount_sats INTEGER NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

### 2.4 Seed Data (`db/seed.sql`)
- [x] Seed `driver_license_renewal` operation:
  ```sql
  INSERT INTO operations (name, description, price, required_fields) VALUES (
    'driver_license_renewal',
    'Renovação da CNH - Carteira Nacional de Habilitação',
    50000,  -- 50,000 sats (~$50 USD)
    '{"cpf": "string", "cnh_number": "string", "cnh_mirror": "string"}'
  );
  ```

---

## Phase 3: Authentication System

### 3.1 Auth Dependencies
- [ ] Add `python-jose[cryptography]` and `passlib[bcrypt]` to `requirements.txt`

### 3.2 Auth Module
- [ ] Create `agent/backend/auth/__init__.py`
- [ ] Create `agent/backend/auth/models.py`:
  - `UserCreate` (email, password)
  - `UserInDB` (id, email, password_hash, created_at)
  - `Token` (access_token, refresh_token, token_type, expires_in)
- [ ] Create `agent/backend/auth/utils.py`:
  - `hash_password(password) -> str`
  - `verify_password(password, hash) -> bool`
  - `create_access_token(data, expires_delta) -> str`
  - `create_refresh_token(data) -> str`
  - `decode_token(token) -> dict`
- [ ] Create `agent/backend/auth/dependencies.py`:
  - `get_current_user(token) -> UserInDB` (FastAPI dependency)
  - OAuth2PasswordBearer scheme

### 3.3 User Repository
- [ ] Create `agent/backend/repositories/__init__.py`
- [ ] Create `agent/backend/repositories/users.py`:
  - `create_user(db, user: UserCreate) -> UserInDB`
  - `get_user_by_email(db, email) -> UserInDB | None`
  - `get_user_by_id(db, user_id) -> UserInDB | None`

### 3.4 Auth Endpoints
- [ ] Create `agent/backend/routes/__init__.py`
- [ ] Create `agent/backend/routes/auth.py`:
  - `POST /api/v1/auth/register` - Create new user
  - `POST /api/v1/auth/login` - Returns `{access_token, refresh_token, expires_in}`
  - `POST /api/v1/auth/refresh` - Refresh access token
- [ ] Mount auth router in `main.py`

### 3.5 Auth Types
- [ ] Add to `agent/backend/types/types.py`:
  - `RegisterRequest`
  - `LoginRequest`
  - `LoginResponse`
  - `TokenRefreshRequest`
  - `TokenRefreshResponse`

---

## Phase 4: WDK Spark Integration (Stubbed)

### 4.1 Spark Types
- [ ] Create `agent/backend/spark/__init__.py`
- [ ] Create `agent/backend/spark/types.py`:
  - `Invoice` (invoice_id, bolt11, amount_sats, memo, created_at)
  - `PaymentStatus` (invoice_id, paid, paid_at)

### 4.2 Spark Client Interface
- [ ] Create `agent/backend/spark/client.py`:
  - Abstract `SparkClient` class:
    - `async create_invoice(amount_sats: int, memo: str) -> Invoice`
    - `async check_payment(invoice_id: str) -> PaymentStatus`

### 4.3 Spark Stub Implementation
- [ ] Create `agent/backend/spark/stub.py`:
  - `StubSparkClient(SparkClient)`:
    - Generate fake BOLT11 strings (lnbc...)
    - Store invoices in memory
    - `check_payment()` returns paid=True after 3rd call (simulates payment)
- [ ] Create `get_spark_client()` factory that returns stub or real based on `SPARK_MODE`

---

## Phase 5: Operations & Tickets API

### 5.1 Operations Repository
- [ ] Create `agent/backend/repositories/operations.py`:
  - `get_all_operations(db) -> list[Operation]`
  - `get_operation_by_id(db, id) -> Operation | None`
  - `get_operation_by_name(db, name) -> Operation | None`

### 5.2 Operations Endpoints
- [ ] Create `agent/backend/routes/operations.py`:
  - `GET /api/v1/operations` - List all operations
  - `GET /api/v1/operations/{id}` - Get operation by ID
- [ ] Mount operations router in `main.py`

### 5.3 Tickets Repository
- [ ] Create `agent/backend/repositories/tickets.py`:
  - `create_ticket(db, ticket: CreateTicket) -> Ticket`
  - `get_ticket_by_id(db, ticket_id) -> Ticket | None`
  - `get_tickets_by_user(db, user_id, status?, limit?, offset?) -> list[Ticket]`
  - `update_ticket_payment_status(db, ticket_id, status) -> Ticket`

### 5.4 Tickets Endpoints
- [ ] Create `agent/backend/routes/tickets.py`:
  - `POST /api/v1/tickets` - Create ticket + LN invoice (protected)
    - Validate form_data against operation.required_fields
    - Call Spark client to create invoice
    - Return {ticket_id, ln_invoice, amount_sats}
  - `GET /api/v1/tickets` - List user's tickets (protected)
    - Query params: status, limit, offset
    - Return {tickets: [...], total: n}
  - `GET /api/v1/tickets/{id}` - Get ticket details (protected)
    - Verify ownership (user_id matches)
  - `POST /api/v1/tickets/{id}/confirm-payment` - Confirm payment (protected)
    - Call Spark client to check payment
    - Update ticket status if paid
    - Return {status: "paid" | "pending"}
- [ ] Mount tickets router in `main.py`

### 5.5 Tickets Types
- [ ] Add to `agent/backend/types/types.py`:
  - `CreateTicketRequest` (operation_id, form_data)
  - `CreateTicketResponse` (ticket_id, ln_invoice, amount_sats)
  - `TicketResponse` (full ticket with operation_name)
  - `TicketListResponse` (tickets, total)
  - `ConfirmPaymentResponse` (status)

### 5.6 Error Handling
- [ ] Create `agent/backend/errors.py` with custom exceptions:
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403) - "Not your ticket"
  - `TicketNotFoundError` (404)
  - `MissingRequiredFieldsError` (400) - includes `missing` list
  - `InvoiceCreationFailedError` (500)
- [ ] Add exception handlers in `main.py`

---

## Phase 6: MCP Server Integration

### 6.1 Install fastapi-mcp
- [ ] Add `fastapi-mcp` to `requirements.txt`

### 6.2 MCP Server Setup
- [ ] Create `agent/backend/mcp/__init__.py`
- [ ] Create `agent/backend/mcp/server.py`:
  ```python
  from fastapi_mcp import FastApiMCP
  
  def setup_mcp(app: FastAPI) -> FastApiMCP:
      # Create MCP server from FastAPI app
      # Only expose read endpoints: GET /operations, GET /tickets
      mcp = FastApiMCP(
          app,
          name="detran-mcp",
          include_operations=["list_operations", "get_operation", "list_tickets", "get_ticket"]
      )
      mcp.mount()
      return mcp
  ```

### 6.3 MCP Integration in main.py
- [ ] Import and call `setup_mcp(app)` after all routes are mounted
- [ ] MCP server will be available at `/mcp` endpoint

### 6.4 Tag Routes for MCP
- [ ] Add `operation_id` to route decorators for MCP tool naming:
  - `GET /api/v1/operations` → `list_operations`
  - `GET /api/v1/operations/{id}` → `get_operation`
  - `GET /api/v1/tickets` → `list_tickets`
  - `GET /api/v1/tickets/{id}` → `get_ticket`

---

## Phase 7: Agent Updates

### 7.1 New Agent: detran_agent
- [ ] Create `agent/backend/agents/detran/__init__.py`
- [ ] Create `agent/backend/agents/detran/prompt.py`:
  ```python
  PROMPT = """
  You are the DETRAN-SP assistant for Brazilian driver's license services.
  
  Your capabilities:
  1. Help users renew their driver's license (CNH)
  2. Check ticket status using MCP tools
  3. Guide users through the payment process
  
  When user wants to renew license:
  1. Call start_driver_license_renewal frontend tool to show form
  2. Wait for form submission
  3. Guide through payment
  
  When user asks about ticket status:
  - Use get_ticket MCP tool with ticket_id
  - Report payment_status and details
  
  Available MCP tools: list_operations, get_operation, list_tickets, get_ticket
  Available frontend tools: start_driver_license_renewal
  """
  ```
- [ ] Create `agent/backend/agents/detran/agent.py`:
  - Import ADK Agent
  - Configure with Gemini 2.5 Flash
  - Set tools (MCP tools will be available via MCP server)
  - Add `_x_phare_workflow = "detran_services"` for observability

### 7.2 Orchestrator Update
- [ ] Update `agent/backend/agents/orchestrator/agent.py`:
  - Import `detran_agent`
  - Add to `sub_agents` list
- [ ] Update `agent/backend/agents/orchestrator/prompt.py`:
  - Add routing for DETRAN intents:
    - "renew license", "renovar CNH", "ticket status" → detran_agent
    - Keep existing routing for drivers_license_agent (Q&A) and scheduler_agent

### 7.3 State Keys
- [ ] Add to `agent/backend/state/keys.py`:
  ```python
  CURRENT_USER_ID = "current_user_id"
  CURRENT_TICKET_ID = "current_ticket_id"
  PAYMENT_PENDING = "payment_pending"
  ```

---

## Phase 8: Frontend Tools (CopilotKit)

### 8.1 Install Dependencies
- [ ] Add `qrcode.react` to `agent/frontend/package.json` for QR code display

### 8.2 Renewal Form Component
- [ ] Create `agent/frontend/src/components/RenewalForm.tsx`:
  - Fields: CPF (masked input), CNH Number, CNH Mirror
  - Client-side validation
  - Submit handler calls API
  - Props: onSubmit, onCancel

### 8.3 Payment QR Component
- [ ] Create `agent/frontend/src/components/PaymentQR.tsx`:
  - Display BOLT11 invoice as QR code
  - Show amount in sats
  - Copy invoice button
  - Props: invoice, amount_sats

### 8.4 Payment Status Component
- [ ] Create `agent/frontend/src/components/PaymentStatus.tsx`:
  - Show pending/paid status
  - "Confirm Payment" button
  - Success animation on paid
  - Props: ticket_id, status, onConfirm

### 8.5 Frontend Tool: start_driver_license_renewal
- [ ] Create `agent/frontend/src/hooks/useRenewalFlow.ts`:
  - Manage form → payment → confirmation state machine
  - API calls for ticket creation and payment confirmation
- [ ] Register CopilotKit action in `App.tsx`:
  ```typescript
  useCopilotAction({
    name: "start_driver_license_renewal",
    description: "Opens the CNH renewal form",
    handler: () => {
      // Show RenewalForm modal/component
      setShowRenewalForm(true);
    }
  });
  ```

### 8.6 Form Submission Flow
- [ ] Form submit → `POST /api/v1/tickets` with JWT
- [ ] On success: show PaymentQR with returned invoice
- [ ] User clicks "Confirm Payment" → `POST /api/v1/tickets/{id}/confirm-payment`
- [ ] On paid: show success message
- [ ] On pending: show "Payment not detected yet, try again"

### 8.7 Auth UI (minimal)
- [ ] Create login form component (email/password)
- [ ] Store JWT in localStorage/context
- [ ] Add auth header to API calls

---

## Phase 9: Integration & Polish

### 9.1 End-to-End Flow Testing
- [ ] Test complete flow manually:
  1. Register user
  2. Login
  3. Chat: "I want to renew my driver's license"
  4. Agent triggers `start_driver_license_renewal`
  5. Fill form → Submit
  6. See QR code
  7. Click "Confirm Payment" (stub will mark paid after 3 attempts)
  8. See success
- [ ] Test ticket status query: "What's my ticket status?"

### 9.2 Error Handling Verification
- [ ] Verify all error responses match spec:
  - 401 `unauthorized` - Missing/invalid token
  - 403 `forbidden` - Not your ticket
  - 404 `ticket_not_found` - Ticket doesn't exist
  - 400 `missing_required_fields` - form_data validation failed
  - 500 `invoice_creation_failed` - Spark error
- [ ] Frontend displays user-friendly error messages

### 9.3 Documentation Updates
- [ ] Update `README.md`:
  - Add DETRAN v2 features section
  - Add new environment variables
  - Add PostgreSQL setup instructions
- [ ] Update `.github/copilot-instructions.md`:
  - Add new architecture section
  - Document new agents, routes, MCP server
  - Update file structure
- [ ] Update `DEVELOPMENT.md`:
  - Add PostgreSQL setup
  - Add new make commands if any
- [ ] Update `.env.example` with all new variables

---

## File Structure (New/Modified)

```
agent/backend/
├── auth/                    # NEW
│   ├── __init__.py
│   ├── models.py            # UserCreate, UserInDB, Token
│   ├── utils.py             # hash_password, create_token, decode_token
│   └── dependencies.py      # get_current_user
├── spark/                   # NEW
│   ├── __init__.py
│   ├── types.py             # Invoice, PaymentStatus
│   ├── client.py            # SparkClient abstract class
│   └── stub.py              # StubSparkClient implementation
├── mcp/                     # NEW
│   ├── __init__.py
│   └── server.py            # setup_mcp(app) using fastapi-mcp
├── routes/                  # NEW
│   ├── __init__.py
│   ├── auth.py              # /api/v1/auth/*
│   ├── operations.py        # /api/v1/operations/*
│   └── tickets.py           # /api/v1/tickets/*
├── repositories/            # NEW
│   ├── __init__.py
│   ├── users.py
│   ├── operations.py
│   └── tickets.py
├── errors.py                # NEW - Custom exceptions
├── agents/
│   ├── detran/              # NEW
│   │   ├── __init__.py
│   │   ├── agent.py
│   │   └── prompt.py
│   └── orchestrator/
│       ├── agent.py         # MODIFIED (add detran_agent)
│       └── prompt.py        # MODIFIED (add routing)
├── database/
│   ├── postgres.py          # NEW - async connection
│   └── (existing mock DBs kept)
├── state/
│   └── keys.py              # MODIFIED (add new keys)
└── main.py                  # MODIFIED (mount routes, MCP, error handlers)

db/                          # NEW
├── init.sql                 # Schema creation
└── seed.sql                 # Initial data

config.py                    # MODIFIED (add new env vars)

agent/frontend/
├── package.json             # MODIFIED (add qrcode.react)
└── src/
    ├── App.tsx              # MODIFIED (add useCopilotAction, auth context)
    ├── components/
    │   ├── RenewalForm.tsx  # NEW
    │   ├── PaymentQR.tsx    # NEW
    │   ├── PaymentStatus.tsx # NEW
    │   └── LoginForm.tsx    # NEW
    └── hooks/
        └── useRenewalFlow.ts # NEW

docker-compose.yml           # MODIFIED (add PostgreSQL)
requirements.txt             # MODIFIED (add new deps)
.env.example                 # MODIFIED (add new vars)
```

---

## Implementation Order (Dependency-Based)

```
Phase 1: Config/Environment
    ↓
Phase 2: Database (needs config)
    ↓
Phase 3: Auth (needs database)
    ↓
Phase 4: Spark Stub (independent, can parallel with Phase 3)
    ↓
Phase 5: Operations & Tickets API (needs auth + spark + database)
    ↓
Phase 6: MCP Server (needs API routes)
    ↓
Phase 7: Agent Updates (needs MCP)
    ↓
Phase 8: Frontend Tools (needs API + agent)
    ↓
Phase 9: Integration & Polish
```

---

## Notes

- **Keep all existing features**: RAG pipeline, clinic scheduling, photo classification, observability
- **Additive changes only**: New features build on top, don't replace
- **WDK Spark stubbed**: Real integration when production credentials available
- **MCP auto-generated**: `fastapi-mcp` creates tools from FastAPI routes automatically
- **Price**: 50,000 sats (~$50 USD at current rates) for driver_license_renewal
- **CNH Mirror**: String field (mirror number printed on CNH card)

---

## Quick Reference: API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/auth/register | No | Create user |
| POST | /api/v1/auth/login | No | Get tokens |
| POST | /api/v1/auth/refresh | No | Refresh token |
| GET | /api/v1/operations | No | List operations |
| GET | /api/v1/operations/{id} | No | Get operation |
| POST | /api/v1/tickets | Yes | Create ticket |
| GET | /api/v1/tickets | Yes | List user tickets |
| GET | /api/v1/tickets/{id} | Yes | Get ticket |
| POST | /api/v1/tickets/{id}/confirm-payment | Yes | Confirm payment |
