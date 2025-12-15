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
└── scheduler_agent (clinic search & booking)
    └── Tools: geocode_location, set_location_from_coordinates, search_nearby_clinics, book_exam
```

**Key files**: `agent/backend/agents/{orchestrator,drivers_license,scheduler}/agent.py`

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
**Not using real databases** - all persistence is in-memory mock classes:
- `MockClinicDatabase` - Pre-populated São Paulo clinics with lat/long
- `MockBookingDatabase` - Auto-incrementing booking storage
- `MockPhotoDatabase` - Photo upload metadata

**Pattern**: All inherit from `BaseDatabase` abstract class with `connect()`/`disconnect()` stubs.

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
GOOGLE_CLOUD_PROJECT_ID=your-project
GCS_LOCATION=us-central1
GCS_BUCKET_NAME=your-bucket-name
VERTEX_AI_INDEX_ID=your-index-id
VERTEX_AI_INDEX_ENDPOINT_ID=your-endpoint-id
VERTEX_RAG_CORPUS=vertex-rag-corpus-name
EMBEDDING_MODEL=text-embedding-005
GOOGLE_API_KEY=your-maps-api-key  # for geocoding
```

Authentication: Uses `gcloud auth application-default login` or service account JSON.

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

1. **Don't use real databases** - System designed with mock DBs, migration needs architectural changes
2. **Don't bypass ToolContext** - State sharing between tools requires `tool_context.state`
3. **Don't hardcode project IDs** - Always read from `config.py` environment variables
4. **Don't create agents without sub_agents list** - Orchestrator expects sub-agents array even if empty
5. **Don't run terminal commands without Makefile** - Use `make backend`, `make frontend`, etc.

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
├── tools/           # Tool implementations (callable by agents)
├── database/        # Mock database classes
├── rag/             # Vertex RAG pipeline
├── state/           # Shared state key constants
├── types/           # Pydantic models
├── photo/           # Vision API classification
├── prometheus/      # Prometheus client for metrics queries
├── instrument.py    # Prometheus instrumentation for ADK
├── copilotkit_agent.py  # CopilotKit AG-UI integration
└── main.py          # FastAPI server

agent/frontend/      # Vite + React chat UI with CopilotKit
dashboard-ui/        # Observability dashboard (metrics visualization)
dashboard-ui/new/    # Updated dashboard version
config.py            # Environment-based configuration
Makefile             # Development commands
docker-compose.yml   # Prometheus server
```

**Import convention**: Absolute imports from project root (e.g., `from agent.backend.types.types import ...`)
