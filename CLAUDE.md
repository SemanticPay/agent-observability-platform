# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT

ALWAYS, make sure you're VERY BRIEF AND CONCISE unless asked otherwise.

## Project Overview

This is a multi-agent AI system for Brazilian driver's license renewal assistance, built with Google ADK (Agent Development Kit). The system uses a hierarchical agent architecture with an orchestrator routing queries to specialized sub-agents, powered by Vertex AI RAG for document retrieval.

## Development Commands

### Environment Setup
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your Google Cloud credentials and project settings
```

### Running the System
```bash
# Backend API (FastAPI on port 8001)
uvicorn agent.backend.main:app --reload
# Or: python agent/backend/main.py

# Frontend Web UI (Flask on port 5000)  
python run_frontend.py

# Direct agent CLI testing
python -m agent.backend.agents.orchestrator.agent
```

### Testing
```bash
# No formal test framework - uses custom test_agent.py script
python test_agent.py                    # Run all tests
python test_agent.py ingestion         # Test document ingestion only
python test_agent.py config            # Test configuration
python test_agent.py rag               # Test RAG pipeline initialization
python test_agent.py full              # Test full workflow (requires Vertex AI)
python test_agent.py query             # Test query only (assumes documents ingested)
```

### Document Management
```python
# Ingest legal documents into RAG corpus
from agent.backend.rag.document_fetcher import DocumentFetcher
from agent.backend.rag.rag_pipeline import _upload_to_corpus, RAG_CORPUS
from config import DOCUMENT_URLS

fetcher = DocumentFetcher()
docs = fetcher.fetch_all_documents(DOCUMENT_URLS)
for doc in docs:
    _upload_to_corpus(RAG_CORPUS, doc)
```

## Architecture Overview

### Agent Hierarchy
```
orchestrator_agent (routes queries)
├── drivers_license_agent (RAG-powered Q&A for license renewal)
│   └── Tool: get_drivers_license_context
└── scheduler_agent (clinic search & appointment booking)
    └── Tools: geocode_location, search_nearby_clinics, book_exam
```

### Core Components

**Agent Structure** (`agent/backend/agents/`):
- `orchestrator/` - Root agent that routes questions to appropriate sub-agents
- `drivers_license/` - Specialized agent for license renewal questions using RAG
- `scheduler/` - Handles clinic searches and exam bookings

Each agent has:
- `agent.py` - Agent definition using Google ADK `Agent()` class
- `prompt.py` - System instruction as `PROMPT` constant

**RAG Pipeline** (`agent/backend/rag/`):
- Uses Vertex AI RAG with corpus-based retrieval 
- Documents: Brazilian legal texts (CTB, CONTRAN resolutions, São Paulo laws)
- Chunking: 1024 chars with 200 char overlap
- Retrieval: `retrieve_context_for(query)` returns formatted context strings

**Tools** (`agent/backend/tools/`):
- `drivers_license.py` - RAG retrieval tool
- `scheduler.py` - Location geocoding and clinic search tools

**State Management** (`agent/backend/state/`):
- Agents share state via `ToolContext.state` with predefined keys
- State persists across tool calls within a session

**Mock Databases** (`agent/backend/database/`):
- `MockClinicDatabase` - Pre-populated São Paulo clinics
- `MockBookingDatabase` - In-memory booking storage  
- `MockPhotoDatabase` - Photo upload metadata
- All inherit from `BaseDatabase` abstract class

### Configuration Requirements

**Environment Variables** (`.env`):
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GCS_LOCATION=us-central1
VERTEX_RAG_CORPUS=your-corpus-name
GOOGLE_API_KEY=your-maps-api-key  # for geocoding
GCS_BUCKET_NAME=your-bucket-name
VERTEX_AI_INDEX_ID=your-index-id
VERTEX_AI_INDEX_ENDPOINT_ID=your-endpoint-id
EMBEDDING_MODEL=text-embedding-005
```

**Google Cloud APIs**:
1. Vertex AI API - for Gemini models and RAG
2. Cloud Vision API - for photo classification
3. Google Maps API - for location geocoding

**Authentication**: Uses `gcloud auth application-default login` or service account JSON

## Development Patterns

### Agent Development
- All agents use Gemini 2.5 Flash model (`gemini-2.5-flash`)
- Orchestrator prompts in English, user-facing agents in Portuguese
- Agent must define `sub_agents` array even if empty
- Tools accept `Optional[ToolContext]` and store results in state

### State Management
```python
# Store state for cross-tool communication
tool_context.state[DRIVERS_LICENSE_CONTEXT] = retrieved_docs
tool_context.state[QUERY_LOCATION] = geocoded_location
tool_context.state[NEARBY_CLINICS] = filtered_clinics
tool_context.state[EXAM_BOOKING] = booking_details
```

### RAG Integration
- Only `drivers_license_agent` uses RAG via `get_drivers_license_context`
- Uses RAG-then-reason pattern: retrieve context, then agent reasons over it
- Context chunked and retrieved from Vertex AI corpus
- Legal documents from `config.DOCUMENT_URLS` must be manually ingested

### Import Conventions
- Use absolute imports from project root: `from agent.backend.types.types import ...`
- Config centralized in `config.py` with environment variable loading
- Type definitions in `agent/backend/types/types.py` using Pydantic models

## Key Technical Details

### Frontend-Backend Communication
- Flask frontend (`agent/front/app.py`) calls FastAPI backend (`agent/backend/main.py`)
- API contract: `POST /query` with `question` and `session_id`
- Frontend uses asyncio: `loop.run_until_complete(call_agent(request))`

### Photo Classification
- Uses Vision API OCR to detect document type (passport vs license)
- Endpoint: `POST /upload-photo`
- Returns `PhotoClassificationEnum`: `PASSPORT | DRIVING_LICENSE | UNKNOWN`

### Distance Calculation  
- Custom Haversine implementation in `scheduler.py` (`_calculate_distance`)
- Returns distance in kilometers, not using external libraries

### Logging
- Extensive logging throughout with structured format
- FastAPI main.py has detailed request/response logging

### Data Models
- All types use Pydantic for validation
- `ExamType` enum: `MEDICAL | DRIVING`
- Request/Response pattern: `AgentCallRequest` → `AgentCallResponse`

### Mock Data
- System uses in-memory mock databases, not real persistence
- Clinic data pre-populated for São Paulo geography
- Photo uploads saved to `/tmp/uploads` directory

## Important Notes

- **No real databases**: System designed with mock DBs for demonstration
- **Portuguese context**: Legal documents and user-facing prompts in Portuguese
- **São Paulo focus**: Geographic searches assume São Paulo state/city
- **Manual RAG setup**: Documents must be ingested before first use
- **Google Cloud dependency**: Requires active GCP project with proper APIs enabled
- **No test framework**: Uses custom `test_agent.py` script for validation
