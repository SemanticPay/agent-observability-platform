# Agent Observability Platform - AI Coding Guide

## IMPORTANT

ALWAYS, make sure you're VERY BRIEF AND CONCISE unless asked otherwise.

**Keep this document updated**: When working on other tasks, if you notice outdated information, new patterns, or missing documentation in this file, update it proactively.

**Track implementation progress**: When implementing features from `docs/TODO.md`:
1. Mark completed items with `[x]` in `docs/TODO.md`
2. Add a brief summary to `docs/IMPLEMENTATION.md` for reporting

## Architecture Overview

This is a **multi-agent system** built with Google ADK (Agent Development Kit) for Brazilian driver's license renewal assistance. The system uses a **hierarchical agent architecture** with one orchestrator routing to specialized sub-agents.

### Agent Hierarchy
```
orchestrator_agent (routes queries)
├── drivers_license_agent (RAG-powered Q&A)
│   └── Tool: get_drivers_license_context
├── scheduler_agent (clinic search & booking)
│   └── Tools: geocode_location, set_location_from_coordinates, search_nearby_clinics, book_exam
└── detran_agent (transactions & payments) [NEW v2]
    └── Tools: MCP tools (list_operations, get_ticket, etc.)
```

**Key files**: `agent/backend/agents/{orchestrator,drivers_license,scheduler,detran}/agent.py`

### DETRAN-SP v2 Architecture (NEW)

The v2 release adds transactional capabilities:

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ LoginForm   │  │ RenewalForm │  │ PaymentQR/Status    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │               │                    │               │
│         └───────────────┼────────────────────┘               │
│                         │ CopilotKit Action                  │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                   FastAPI Backend                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ /auth/*  │  │/operations│ │ /tickets │  │   /mcp   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
│  ┌────┴─────────────┴─────────────┴─────────────┘           │
│  │                   Repositories                            │
│  └────┬─────────────┬─────────────┬─────────────────────────┤
│       │             │             │                          │
│  ┌────┴────┐  ┌─────┴────┐  ┌─────┴────┐  ┌──────────────┐  │
│  │PostgreSQL│  │  Spark   │  │   MCP    │  │   Agents     │  │
│  │   DB     │  │(Lightning)│  │ Server   │  │(orchestrator)│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**v2 Components**:
- `agent/backend/auth/` - JWT authentication (python-jose, passlib)
- `agent/backend/spark/` - Lightning Network client (stubbed)
- `agent/backend/mcp/` - MCP server via fastapi-mcp
- `agent/backend/routes/` - REST API endpoints
- `agent/backend/repositories/` - Database access layer
- `db/` - PostgreSQL schema and seed data

## Core Patterns

### 1. Agent Structure Convention
Each agent follows a strict pattern:
- `agent.py` - Agent definition with Google ADK `Agent()` class
- `prompt.py` - System instruction as `PROMPT` constant
- Tools defined in `agent/backend/tools/` and imported into agent
- Optional `_x_phare_workflow` attribute for observability tagging

**Example** (`drivers_license/agent.py`):
```python
drivers_license_agent = Agent(
    model="gemini-2.5-flash",
    name="drivers_license_agent",
    description="...",
    instruction=PROMPT,  # from prompt.py
    tools=[get_drivers_license_context]
)
drivers_license_agent._x_phare_workflow = "drivers_license_qa"  # observability tag
```

### 2. State Management with ToolContext
Agents share state across tool calls using `ToolContext.state` with keys from `agent/backend/state/keys.py`:
- `DRIVERS_LICENSE_CONTEXT` - RAG retrieved documents
- `QUERY_LOCATION` - Geocoded location for clinic search
- `NEARBY_CLINICS` - Filtered clinic results
- `EXAM_BOOKING` - Created booking details
- `SHOW_LOCATION_PICKER` - UI signal for map picker
- `USER_SELECTED_LOCATION` - User-selected location from UI

**Pattern**: Tools accept `Optional[ToolContext]` and store results in state for subsequent agent reasoning.

### 3. RAG Pipeline (Vertex AI)
Uses **Vertex AI RAG** with corpus-based retrieval, not vector search directly:
- Corpus creation: `_get_or_create_corpus()` in `rag_pipeline.py`
- Document ingestion: URLs → `DocumentFetcher` → RAG corpus chunks
- Retrieval: `retrieve_context_for(query)` returns formatted context strings
- Config: `config.py` has `VERTEX_RAG_CORPUS`, `GOOGLE_CLOUD_PROJECT_ID`, `GCS_LOCATION`

**Chunking**: 1024 chars, 200 overlap (see `RAG_TRANSFORMATION_CONFIG`)

### 4. Mock Databases
**Mixed database approach** - PostgreSQL for transactional data, mocks for demos:
- `PostgreSQL` - Users, operations, tickets (via `agent/backend/database/postgres.py`)
- `MockClinicDatabase` - Pre-populated São Paulo clinics with lat/long
- `MockBookingDatabase` - Auto-incrementing booking storage
- `MockPhotoDatabase` - Photo upload metadata

**Pattern**: Mock DBs inherit from `BaseDatabase` abstract class. PostgreSQL uses async SQLAlchemy.

### 5. Authentication (v2)
JWT-based authentication in `agent/backend/auth/`:
- `models.py` - UserCreate, UserInDB, Token models
- `utils.py` - hash_password, create_access_token, decode_token
- `dependencies.py` - get_current_user FastAPI dependency
- Access tokens: 30 min expiry, Refresh tokens: 7 days

### 6. Lightning Network (v2)
Stubbed WDK Spark integration in `agent/backend/spark/`:
- `types.py` - Invoice, PaymentStatus Pydantic models
- `client.py` - Abstract SparkClient base class
- `stub.py` - StubSparkClient (fake BOLT11, simulates payment after 3 checks)
- `SPARK_MODE=stub` for development, `production` for real payments

### 7. MCP Server (v2)
Model Context Protocol server via fastapi-mcp:
- Auto-generates tools from FastAPI routes
- Exposes: list_operations, get_operation, list_tickets, get_ticket
- Available at `/mcp` endpoint
- Used by `detran_agent` to query tickets and operations

## Development Workflows

### Running the System (use Makefile)
```bash
# Install all dependencies
make install

# Backend API (FastAPI on port 8000)
make backend

# Agent Frontend (Vite on port 5173)
make frontend

# Dashboard UI (Vite)
make dashboard

# Prometheus metrics server
make prometheus

# Run backend + frontend together
make all
```

### Environment Setup
**Critical**: Must configure `.env` from `.env.example`:
```bash
# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project
GCS_LOCATION=us-central1
GCS_BUCKET_NAME=your-bucket-name
VERTEX_AI_INDEX_ID=your-index-id
VERTEX_AI_INDEX_ENDPOINT_ID=your-endpoint-id
VERTEX_RAG_CORPUS=vertex-rag-corpus-name
EMBEDDING_MODEL=text-embedding-005
GOOGLE_API_KEY=your-maps-api-key  # for geocoding

# Database (v2)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=detran
POSTGRES_USER=detran
POSTGRES_PASSWORD=detran

# Auth (v2)
JWT_SECRET_KEY=change-me-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Lightning (v2)
SPARK_MODE=stub  # stub | production
```

Authentication: Uses `gcloud auth application-default login` or service account JSON.

### Database Setup (v2)
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Schema and seed data auto-applied via init scripts
```

### Document Ingestion
Run the RAG pipeline module directly to ingest documents:
```bash
python -m agent.backend.rag.rag_pipeline
```

Or programmatically:
```python
from agent.backend.rag.rag_pipeline import _upload_to_corpus, RAG_CORPUS
from agent.backend.rag.document_fetcher import DocumentFetcher
from config import DOCUMENT_URLS

fetcher = DocumentFetcher()
for url in DOCUMENT_URLS:
    doc = fetcher.fetch_document(url)
    _upload_to_corpus(RAG_CORPUS, doc)
```

**URLs**: Brazilian legal documents defined in `config.DOCUMENT_URLS` (CTB, CONTRAN resolutions, São Paulo state laws).

## Google Cloud Dependencies

### Required APIs
1. Vertex AI API - for Gemini models and RAG
2. Cloud Vision API - for photo classification (`classify_photo`)
3. Google Maps API - for geocoding in `scheduler.py`

### Model Usage
- **Gemini 2.5 Flash**: All agents (`gemini-2.5-flash`)
- **Text Embedding 005**: RAG embeddings (`publishers/google/models/text-embedding-005`)
- **Vision API**: OCR for passport/license detection

## Project-Specific Conventions

### Language in Prompts
- **Orchestrator**: English (routing logic)
- **drivers_license_agent**: Answers in ENGLISH (translates Portuguese sources)
- **scheduler_agent**: English (scheduling workflow)

### Type Definitions
All types in `agent/backend/types/types.py`:
- Use **Pydantic models** for validation
- `ExamType`: `"medical"` | `"driving"` (string literals, not enum)
- Request/Response pattern: `AgentCallRequest` → `AgentCallResponse`
- Metrics types: `AgentMetrics`, `ToolMetrics`, `AgentDetailMetrics`

### Photo Classification
Uses Vision API OCR to detect document type:
- Searches for keywords: "passport", "driver", "licence"
- Returns `PhotoClassificationEnum`: `PASSPORT | DRIVING_LICENSE | UNKNOWN`
- Endpoint: `POST /upload-photo` in `main.py`

### Distance Calculation
Custom Haversine implementation in `scheduler.py` (`_calculate_distance`), not using external libraries. Returns kilometers.

## Observability & Metrics

### Prometheus Instrumentation
The system uses custom Prometheus instrumentation in `agent/backend/instrument.py`:
- `adk_agent_runs_total` - Agent invocation counts
- `adk_conversations_total` - Session/conversation counts
- Model pricing tracked for cost estimation (Gemini 2.5 Flash: $0.30/1M input, $2.50/1M output)

### Metrics Endpoint
- Prometheus metrics exposed at `/metrics` on the FastAPI server
- `PrometheusClient` in `agent/backend/prometheus/client.py` for querying metrics
- Dashboard fetches from `http://localhost:9093` (Prometheus server via docker-compose)

## CopilotKit Integration

### AG-UI Protocol
The system integrates with CopilotKit using the AG-UI (Agent-UI) protocol:
- `agent/backend/copilotkit_agent.py` wraps the orchestrator with `ADKAgent` from `ag-ui-adk`
- Mounted at `/copilot` endpoint in main FastAPI app
- Also exposes `/api/copilotkit` for GraphQL protocol compatibility

### Frontend Integration
- `agent/frontend/` - Vite + React app with CopilotKit chat interface
- Routes: `/` (home), `/chat`, `/simple`, `/copilot` (CopilotKit-powered)
- Uses `@copilotkit/react-ui` and `@copilotkit/react-core`

## Anti-Patterns to Avoid

1. **Don't bypass ToolContext** - State sharing between tools requires `tool_context.state`
2. **Don't hardcode project IDs** - Always read from `config.py` environment variables
3. **Don't create agents without sub_agents list** - Orchestrator expects sub-agents array even if empty
4. **Don't run terminal commands without Makefile** - Use `make backend`, `make frontend`, etc.
5. **Don't skip auth on protected routes** - Tickets API requires JWT via `get_current_user` dependency

## Key Integration Points

### Frontend ↔ Backend
- **Vite React** (`agent/frontend/`) calls **FastAPI** (`agent/backend/main.py`) backend
- CopilotKit uses AG-UI streaming protocol at `/copilot` endpoint
- API contract: `POST /api/copilotkit` (GraphQL) or `/copilot` (AG-UI streaming)

### Agent ↔ RAG
- Only `drivers_license_agent` uses RAG via `get_drivers_license_context` tool
- Tool retrieves context then agent reasons over it (RAG-then-reason pattern)
- Context stored in state for conversation continuity

### Scheduler ↔ Google Maps
- `geocode_location` tool converts natural language → coordinates
- `set_location_from_coordinates` for map-picker selected locations
- Requires `GOOGLE_API_KEY` environment variable
- Returns first match from `gmaps.geocode()` results

## File Organization

```
agent/backend/
├── agents/          # Agent definitions (orchestrator + sub-agents)
│   ├── orchestrator/
│   ├── drivers_license/
│   ├── scheduler/
│   └── detran/      # NEW v2
├── auth/            # NEW v2 - JWT authentication
├── spark/           # NEW v2 - Lightning Network client
├── mcp/             # NEW v2 - MCP server
├── routes/          # NEW v2 - REST API endpoints
├── repositories/    # NEW v2 - Database access
├── tools/           # Tool implementations (callable by agents)
├── database/        # Mock + PostgreSQL databases
├── rag/             # Vertex RAG pipeline
├── state/           # Shared state key constants
├── types/           # Pydantic models
├── photo/           # Vision API classification
├── prometheus/      # Prometheus client for metrics queries
├── errors.py        # NEW v2 - Custom exceptions
├── instrument.py    # Prometheus instrumentation for ADK
├── copilotkit_agent.py  # CopilotKit AG-UI integration
└── main.py          # FastAPI server

db/                  # NEW v2 - PostgreSQL schema
├── init.sql         # Table definitions
└── seed.sql         # Initial data

agent/frontend/      # Vite + React chat UI with CopilotKit
├── src/
│   ├── context/AuthContext.tsx  # NEW v2
│   ├── hooks/useRenewalFlow.ts  # NEW v2
│   └── components/
│       ├── LoginForm.tsx      # NEW v2
│       ├── RenewalForm.tsx    # NEW v2
│       ├── PaymentQR.tsx      # NEW v2
│       └── PaymentStatus.tsx  # NEW v2

dashboard-ui/        # Observability dashboard (metrics visualization)
dashboard-ui/new/    # Updated dashboard version
config.py            # Environment-based configuration
Makefile             # Development commands
docker-compose.yml   # PostgreSQL + Prometheus
```

**Import convention**: Absolute imports from project root (e.g., `from agent.backend.types.types import ...`)
