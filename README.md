# Agent Observability Platform

A multi-agent AI system for Brazilian driver's license renewal assistance, built with Google ADK (Agent Development Kit). The system uses a hierarchical agent architecture with an orchestrator routing queries to specialized sub-agents, powered by Vertex AI RAG for document retrieval.

## DETRAN-SP v2 Features (NEW)

The v2 release adds transactional capabilities with Lightning Network payments:

- **User Authentication**: JWT-based auth with register/login/refresh
- **Ticket System**: Create service tickets with form validation
- **Lightning Payments**: Pay with Bitcoin via BOLT11 invoices (stubbed for dev)
- **MCP Server**: AI agents can query operations/tickets via MCP protocol
- **New Agent**: `detran_agent` handles renewals and payment guidance

### Quick Start (v2)

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run backend
make backend

# Run frontend
make frontend
```

### v2 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/auth/register | No | Create user |
| POST | /api/v1/auth/login | No | Get JWT tokens |
| POST | /api/v1/auth/refresh | No | Refresh token |
| GET | /api/v1/operations | No | List DETRAN operations |
| GET | /api/v1/operations/{id} | No | Get operation details |
| POST | /api/v1/tickets | Yes | Create ticket + LN invoice |
| GET | /api/v1/tickets | Yes | List user tickets |
| GET | /api/v1/tickets/{id} | Yes | Get ticket details |
| POST | /api/v1/tickets/{id}/confirm-payment | Yes | Confirm payment |

---

## Architecture

The system follows a hierarchical multi-agent architecture:

```
orchestrator_agent (routes queries)
├── drivers_license_agent (RAG-powered Q&A)
│   └── Tool: get_drivers_license_context
├── scheduler_agent (clinic search & booking)
│   └── Tools: geocode_location, search_nearby_clinics, book_exam
└── detran_agent (NEW - transactions & payments)
    └── Tools: MCP tools (list_operations, get_ticket, etc.)
```

### Core Components

```
agent/
├── backend/
│   ├── agents/           # Agent definitions (orchestrator + sub-agents)
│   │   ├── orchestrator/ # Root agent that routes questions
│   │   ├── drivers_license/ # RAG-powered license renewal Q&A
│   │   ├── scheduler/    # Clinic search and exam booking
│   │   └── detran/       # NEW: Transactions & payments
│   ├── auth/            # NEW: JWT authentication
│   ├── spark/           # NEW: Lightning Network client (stubbed)
│   ├── mcp/             # NEW: MCP server for agent tools
│   ├── routes/          # NEW: REST API endpoints
│   ├── repositories/    # NEW: Database access layer
│   ├── tools/           # Tool implementations (callable by agents)
│   ├── database/        # Mock + PostgreSQL databases
│   ├── rag/             # Vertex RAG pipeline
│   ├── state/           # Shared state key constants
│   ├── types/           # Pydantic models
│   ├── photo/           # Vision API classification
│   └── main.py          # FastAPI server
├── frontend/            # Vite + React chat UI
db/                      # NEW: PostgreSQL schema & seeds
```

**Key Features:**
- Multi-agent orchestration using Google ADK
- Vertex AI RAG with corpus-based document retrieval
- **NEW**: PostgreSQL database for users, tickets, operations
- **NEW**: JWT authentication with access/refresh tokens
- **NEW**: Lightning Network payments (BOLT11 invoices)
- **NEW**: MCP server for agent tool access
- Mock databases for demonstration (clinics, bookings, photos)
- Photo classification using Google Vision API
- Google Maps integration for clinic geocoding

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **Docker** (for PostgreSQL)
3. **Required APIs enabled**:
   - Vertex AI API (for Gemini models and RAG)
   - Cloud Vision API (for photo classification)
   - Google Maps API (for geocoding)
3. **Service Account** with permissions:
   - Vertex AI User
   - Cloud Vision User
   - Storage Admin (for RAG corpus)
4. **Python 3.8+**

## Setup

1. **Create and activate virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment variables:**
```bash
cp .env.example .env
```

4. **Edit `.env` with your Google Cloud configuration:**
```env
# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GCS_LOCATION=us-central1
VERTEX_RAG_CORPUS=your-corpus-name
GOOGLE_API_KEY=your-maps-api-key
GCS_BUCKET_NAME=your-bucket-name
VERTEX_AI_INDEX_ID=your-index-id
VERTEX_AI_INDEX_ENDPOINT_ID=your-endpoint-id
EMBEDDING_MODEL=text-embedding-005

# Database (v2)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=detran
POSTGRES_USER=detran
POSTGRES_PASSWORD=detran

# Authentication (v2)
JWT_SECRET_KEY=change-me-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Lightning Network (v2)
SPARK_MODE=stub  # stub | production
SPARK_API_URL=
SPARK_API_KEY=
```

5. **Authenticate with Google Cloud:**
```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project <project-id>
```

## Running the System

### Backend API (FastAPI)
```bash
# From project root
uvicorn agent.backend.main:app --reload
# Server runs on http://localhost:8000
```

### Frontend Web UI (React + Vite)
```bash
# Install dependencies (first time only)
cd frontend
npm install

# Start development server
npm run dev
# Web UI available at http://localhost:3000
```

### Legacy Frontend (Flask)
```bash
python run_frontend.py
# Web UI available at http://localhost:5000
```

### Direct Agent Testing
```bash
python -m agent.backend.agents.orchestrator.agent
```

## Document Management

### Ingest Legal Documents
Documents must be manually ingested into the RAG corpus before first use:

```python
from agent.backend.rag.document_fetcher import DocumentFetcher
from agent.backend.rag.rag_pipeline import _upload_to_corpus, RAG_CORPUS
from config import DOCUMENT_URLS

fetcher = DocumentFetcher()
docs = fetcher.fetch_all_documents(DOCUMENT_URLS)
for doc in docs:
    _upload_to_corpus(RAG_CORPUS, doc)
```

**Document Sources:**
- Lei 15.266/2013 (São Paulo)
- Código de Trânsito Brasileiro (Lei 9.503)
- Resoluções do CONTRAN
- Lei 13.296/2008 (São Paulo)

## API Usage

### Programmatic Access
```python
import asyncio
from agent.backend.agents.orchestrator.agent import call_agent
from agent.backend.types.types import AgentCallRequest

async def test_agent():
    request = AgentCallRequest(
        question="Preciso fazer exame médico para renovar minha carteira?",
        session_id="test-session-1"
    )
    response = await call_agent(request)
    print(response.answer)

asyncio.run(test_agent())
```

### REST API Endpoints
- `POST /query` - Process user questions
- `POST /upload-photo` - Upload and classify documents

## Key Technologies

- **Google ADK (Agent Development Kit)** - Multi-agent orchestration
- **Vertex AI RAG** - Document retrieval with corpus-based chunking
- **Gemini 2.5 Flash** - LLM for all agents
- **FastAPI** - Backend REST API
- **Flask** - Frontend web interface
- **Google Cloud Vision API** - Document photo classification
- **Google Maps API** - Location geocoding for clinic search

## Testing

The system uses a custom testing script (no formal test framework):

```bash
# Run all tests
python test_agent.py

# Individual test components
python test_agent.py ingestion    # Test document ingestion
python test_agent.py config       # Test configuration
python test_agent.py rag          # Test RAG pipeline
python test_agent.py full         # Full workflow (requires Vertex AI)
python test_agent.py query        # Query only (assumes docs ingested)
```

## Important Notes

- **Mock Databases**: System uses in-memory mock databases for demonstration
- **Portuguese Context**: Legal documents and user-facing prompts in Portuguese
- **São Paulo Focus**: Geographic searches assume São Paulo state/city
- **Manual Setup**: Documents must be ingested into RAG corpus before first use
- **Google Cloud Dependency**: Requires active GCP project with proper APIs enabled

## Authentication

Use Google Cloud Application Default Credentials:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project <project-id>
```

## License

This project is for educational/demonstration purposes.
