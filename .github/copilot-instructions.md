# Copilot Instructions for Driver's License Renewal Agent

## Project Overview
This is a RAG-based AI agent that answers citizen questions about driver's license renewal in Brazil (São Paulo state) using Google Vertex AI. The architecture uses Vertex AI Search/Vector Search for document retrieval and Gemini for answer generation.

## Key Architecture Components

### Three-Layer Architecture
1. **Document Ingestion** (`document_ingestion.py`): Fetches legal documents from Brazilian government URLs, converts HTML to clean text using BeautifulSoup and html2text
2. **RAG Pipeline** (`rag_pipeline.py`): Manages Vertex AI integration with dual-mode support (Vector Search OR Discovery Engine/Enterprise Search)
3. **Agent** (`agent.py`): CLI interface with interactive mode, single-query mode, and document ingestion mode

### Critical Dual-Mode Pattern
The RAG pipeline implements a **fallback strategy** between two Google Cloud services:
- Primary: Vertex AI Vector Search (if `VertexAIVectorSearch` available)
- Fallback: Discovery Engine API (Enterprise Search)

This pattern appears in both `ingest_documents()` and `retrieve_relevant_context()` methods. Always maintain this try/except fallback when modifying retrieval logic.

## Development Workflows

### Environment Setup
```bash
# Always use the venv (not env) per README
python3 -m venv venv
source venv/bin/activate  # or env/bin/activate if using existing env/
pip install -r requirements.txt

# Configuration via .env (never commit credentials)
cp .env.example .env
# Edit .env with: GOOGLE_CLOUD_PROJECT, RAG_DATASTORE_ID, GOOGLE_APPLICATION_CREDENTIALS
```

### Testing Strategy (Tiered Approach)
```bash
# Level 1: No credentials needed - test document fetching
python test_agent.py ingestion

# Level 2: Test config and RAG init - requires credentials
python test_agent.py config
python test_agent.py rag

# Level 3: Full workflow - requires Vertex AI datastore
python test_agent.py full

# Verify setup before development
python setup_verification.py
```

### Agent CLI Modes
```bash
python agent.py ingest                        # Ingest documents into RAG
python agent.py query "your question"         # Single query mode
python agent.py                               # Interactive mode (loop until quit/exit)
```

## Project-Specific Conventions

### Configuration Pattern
All settings live in `config.py` and are loaded from `.env` via `python-dotenv`. **Never hardcode** Google Cloud project IDs or credentials. The config validates required vars on import (raises `ValueError` if missing).

### Document Structure
Documents are dictionaries with exactly three keys:
```python
{'url': str, 'title': str, 'content': str}
```
This format is used from ingestion through to RAG pipeline. Don't add extra fields without updating all layers.

### LangChain Document Chunking
RAG pipeline splits documents using `RecursiveCharacterTextSplitter` with:
- `chunk_size=1000`
- `chunk_overlap=200`

Each chunk becomes a LangChain `Document` with metadata: `source` (URL), `title`, `chunk_index`, `total_chunks`. Maintain these metadata fields for traceability.

### Portuguese Prompts
The agent targets Brazilian Portuguese users. The LLM prompt in `generate_answer()` is in Portuguese and instructs the model to:
- Use ONLY the provided context
- Answer in Portuguese
- Cite sources when possible

When modifying prompts, preserve the Portuguese language and legal domain context.

### Logging Strategy
Uses Python's `logging` module at INFO level throughout. All modules initialize with:
```python
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
```
Log important state transitions (fetching docs, ingesting, querying) but avoid debug-level verbosity in production.

## Integration Points

### Google Cloud Dependencies
- **Vertex AI**: Embeddings (`textembedding-gecko@003`), LLM (`gemini-1.5-pro`)
- **Discovery Engine**: Document storage and search (fallback to Vector Search)
- **Authentication**: Via service account JSON key set in `GOOGLE_APPLICATION_CREDENTIALS`

The datastore path format is critical:
```
projects/{project}/locations/{location}/dataStores/{datastore_id}
```

### External Data Sources
Documents are fetched from `config.DOCUMENT_URLS` which contains Brazilian government legal pages. The `DocumentIngester` handles:
- HTTP timeouts (30s)
- Custom User-Agent headers (to avoid blocks)
- HTML parsing with lxml parser
- Text cleaning (removing excessive whitespace/newlines)

## Common Pitfalls

1. **Virtual Environment**: README mentions `venv/` but the actual directory is `env/` - handle both cases
2. **Import Fallback**: `VertexAIVectorSearch` may be in `langchain_google_vertexai` OR `langchain_community.vectorstores` - the code tries both
3. **Discovery Engine Timeouts**: `operation.result(timeout=300)` waits up to 5 minutes - this is necessary for large document imports
4. **Empty Context Handling**: If no documents retrieved, return Portuguese error message directing users to DETRAN (see `agent.answer_question()`)

## Testing Patterns

When adding features:
1. Add tier-1 test in `test_agent.py` that works WITHOUT credentials (mock or document-only)
2. Add tier-2/3 tests for integration with Vertex AI
3. Update `setup_verification.py` if new env vars or dependencies added

Never assume credentials exist - always provide graceful degradation path for development/testing.
