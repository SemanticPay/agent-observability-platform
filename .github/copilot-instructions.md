# Agent Observability Platform - AI Coding Guide

## IMPORTANT

For your answers, make sure you're brief, concise, up to date, follow best practices 
and have a high bar of quality unless asked otherwise.

## Architecture Overview

This is a **multi-agent system** built with Google ADK (Agent Development Kit) for Brazilian driver's license renewal assistance. The system uses a **hierarchical agent architecture** with one orchestrator routing to specialized sub-agents.

### Agent Hierarchy
```
orchestrator_agent (routes queries)
├── drivers_license_agent (RAG-powered Q&A)
│   └── Tool: get_drivers_license_context
└── scheduler_agent (clinic search & booking)
    └── Tools: geocode_location, search_nearby_clinics, book_exam
```

**Key files**: `agent/backend/agents/{orchestrator,drivers_license,scheduler}/agent.py`

## Core Patterns

### 1. Agent Structure Convention
Each agent follows a strict pattern:
- `agent.py` - Agent definition with Google ADK `Agent()` class
- `prompt.py` - System instruction as `PROMPT` constant (Portuguese for user-facing agents)
- Tools defined in `agent/backend/tools/` and imported into agent

**Example** (`drivers_license/agent.py`):
```python
drivers_license_agent = Agent(
    model="gemini-2.5-flash",
    name="drivers_license_agent",
    description="...",
    instruction=PROMPT,  # from prompt.py
    tools=[get_drivers_license_context]
)
```

### 2. State Management with ToolContext
Agents share state across tool calls using `ToolContext.state` with keys from `agent/backend/state/keys.py`:
- `DRIVERS_LICENSE_CONTEXT` - RAG retrieved documents
- `QUERY_LOCATION` - Geocoded location for clinic search
- `NEARBY_CLINICS` - Filtered clinic results
- `EXAM_BOOKING` - Created booking details

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

### Running the System
```bash
# Backend API (FastAPI on port 8000)
uvicorn agent.backend.main:app --reload

# Frontend Web UI (Flask on port 5000)
python run_frontend.py

# Direct agent CLI test
python -m agent.backend.agents.orchestrator.agent
```

### Environment Setup
**Critical**: Must configure `.env` from `.env.example`:
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project
GCS_LOCATION=us-central1
VERTEX_RAG_CORPUS=your-corpus-name
GOOGLE_API_KEY=your-maps-api-key  # for geocoding
```

Authentication: Uses `gcloud auth application-default login` or service account JSON.

### Document Ingestion
Documents must be manually ingested into RAG corpus:
```python
from agent.backend.rag.rag_pipeline import _upload_to_corpus, RAG_CORPUS
from agent.backend.rag.document_fetcher import DocumentFetcher

fetcher = DocumentFetcher()
docs = fetcher.fetch_all_documents(DOCUMENT_URLS)  # from config.py
for doc in docs:
    _upload_to_corpus(RAG_CORPUS, doc)
```

**URLs**: Brazilian legal documents defined in `config.DOCUMENT_URLS` (CTB, CONTRAN resolutions).

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

### Brazilian Portuguese Context
- Agent prompts in `drivers_license_agent` use **Portuguese** instructions
- Legal documents are in Portuguese (São Paulo state laws)
- Location searches assume São Paulo geography

### Type Definitions
All types in `agent/backend/types/types.py`:
- Use **Pydantic models** for validation
- `ExamType` enum: `MEDICAL` | `DRIVING`
- Request/Response pattern: `AgentCallRequest` → `AgentCallResponse`

### Photo Classification
Uses Vision API OCR to detect document type:
- Searches for keywords: "passport", "driver", "licence"
- Returns `PhotoClassificationEnum`: `PASSPORT | DRIVING_LICENSE | UNKNOWN`
- Endpoint: `POST /upload-photo` in `main.py`

### Distance Calculation
Custom Haversine implementation in `scheduler.py` (`_calculate_distance`), not using external libraries. Returns kilometers.

## Anti-Patterns to Avoid

1. **Don't use real databases** - System designed with mock DBs, migration needs architectural changes
2. **Don't bypass ToolContext** - State sharing between tools requires `tool_context.state`
3. **Don't hardcode project IDs** - Always read from `config.py` environment variables
4. **Don't mix languages in prompts** - Orchestrator is English, user-facing agents are Portuguese
5. **Don't create agents without sub_agents list** - Orchestrator expects sub-agents array even if empty

## Key Integration Points

### Frontend ↔ Backend
- **Flask** (`agent/front/app.py`) calls **FastAPI** (`agent/backend/main.py`) backend
- Frontend uses asyncio event loop pattern: `loop.run_until_complete(call_agent(request))`
- API contract: `POST /api/chat` with `question` and `session_id`

### Agent ↔ RAG
- Only `drivers_license_agent` uses RAG via `get_drivers_license_context` tool
- Tool retrieves context then agent reasons over it (RAG-then-reason pattern)
- Context stored in state for conversation continuity

### Scheduler ↔ Google Maps
- `geocode_location` tool converts natural language → coordinates
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
└── main.py          # FastAPI server

agent/front/         # Flask web UI
config.py            # Environment-based configuration
```

**Import convention**: Absolute imports from project root (e.g., `from agent.backend.types.types import ...`)
