# Driver's License Renewal Agent

An AI agent system that answers citizen questions about driver's license renewal, documentation, fees, and scheduling using Vertex AI RAG (Retrieval-Augmented Generation) pipeline and Google ADK (Agent Development Kit).

## Architecture

The project follows a modular architecture with three main components:

```
agent/
├── backend/          # Agent backend with orchestrator and sub-agents
│   ├── agents/
│   │   ├── orchestrator/    # Root agent that routes questions
│   │   └── drivers_license/ # Specialized agent for driver's license questions
│   └── types/        # Type definitions
├── rag/              # RAG pipeline for document retrieval
│   ├── document_ingestion.py
│   └── rag_pipeline.py
└── front/            # Web UI frontend
    ├── app.py
    ├── templates/
    └── static/
```

### Agent Structure

- **Orchestrator Agent**: Root agent that routes questions to appropriate sub-agents
- **Drivers License Agent**: Specialized sub-agent that handles driver's license renewal questions using RAG
- Each agent has its own `prompt.py` and `agent.py` file

## Features

- Answers questions about driver's license renewal in Brazil (São Paulo state)
- Uses Vertex AI RAG pipeline for document retrieval and generation
- Ingests legal documents from official government sources
- Provides accurate, context-aware answers based on legal documentation
- Modern web UI for easy interaction
- Modular agent architecture using Google ADK

## Prerequisites

1. **Google Cloud Project** with Vertex AI enabled
2. **Vertex AI Search (Enterprise Search)** datastore or Vector Search index created
3. **Service Account** with appropriate permissions:
   - Vertex AI User
   - Vertex AI Search Admin
   - Cloud Storage (if using GCS for document storage)
4. **Python 3.8+**

## Setup

1. **Clone and navigate to the project:**
```bash
cd agent-workforce
```

2. **Create and activate a virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure Google Cloud credentials:**
   - Create a service account key in Google Cloud Console
   - Download the JSON key file
   - Set the path in your environment

5. **Create `.env` file from `.env.example`:**
```bash
cp .env.example .env
```

6. **Edit `.env` with your configuration:**
```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
VERTEX_AI_LOCATION=us-central1
RAG_DATASTORE_ID=your-datastore-id
EMBEDDING_MODEL=textembedding-gecko@003
```

7. **Verify your setup:**
```bash
python setup_verification.py
```

This will check:
- Environment variables are set correctly
- Google Cloud credentials are accessible
- All required Python packages are installed

## Vertex AI Setup

**📖 For detailed setup instructions, see [VERTEX_AI_SETUP.md](VERTEX_AI_SETUP.md)**

Quick overview:

1. **Create a Google Cloud Project** and enable billing
2. **Enable APIs**: Vertex AI API, Vertex AI Search API
3. **Create a Service Account** with Vertex AI User and Discovery Engine Admin roles
4. **Download Service Account Key** (JSON file)
5. **Create a Vector Search Index OR Enterprise Search Datastore**
6. **Configure `.env`** with your project ID, credentials path, and datastore/index ID

See the [complete setup guide](VERTEX_AI_SETUP.md) for step-by-step instructions.

## Usage

### 1. Ingest Documents

First, ingest the legal documents into the RAG pipeline. You can use the RAG pipeline directly:

```python
from agent.rag.document_ingestion import DocumentIngester
from agent.rag.rag_pipeline import VertexAIRAGPipeline
from config import DOCUMENT_URLS

# Fetch documents
ingester = DocumentIngester()
documents = ingester.fetch_all_documents(DOCUMENT_URLS)

# Ingest into RAG pipeline
rag = VertexAIRAGPipeline()
rag.ingest_documents(documents)
```

### 2. Run the Agent (CLI)

Use the main entry point to test the agent:

```bash
python main.py "Preciso fazer exame médico para renovar minha carteira?"
```

Or run interactively:
```bash
python main.py
```

### 3. Run the Web UI

Start the Flask frontend:

```bash
python run_frontend.py
```

Then open http://localhost:5000 in your browser.

### 4. Use the Agent Programmatically

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

## Project Structure

```
agent-workforce/
├── agent/
│   ├── backend/
│   │   ├── agents/
│   │   │   ├── orchestrator/
│   │   │   │   ├── agent.py      # Orchestrator agent
│   │   │   │   └── prompt.py     # Orchestrator prompt
│   │   │   └── drivers_license/
│   │   │       ├── agent.py      # Drivers license agent
│   │   │       └── prompt.py     # Agent prompt
│   │   └── types/
│   │       └── types.py          # Type definitions
│   ├── rag/
│   │   ├── document_ingestion.py # Document fetching
│   │   └── rag_pipeline.py        # RAG pipeline
│   └── front/
│       ├── app.py                 # Flask app
│       ├── templates/
│       │   └── index.html         # UI template
│       └── static/
│           ├── css/
│           │   └── style.css      # Styles
│           └── js/
│               └── app.js          # Frontend JS
├── config.py                      # Configuration
├── main.py                         # CLI entry point
├── run_frontend.py                 # Frontend entry point
├── requirements.txt                # Dependencies
└── README.md                       # This file
```

## Document Sources

The agent ingests documents from:
- Lei 15.266/2013 (São Paulo)
- Código de Trânsito Brasileiro (Lei 9.503)
- Resoluções do CONTRAN
- Lei 13.296/2008 (São Paulo)

## Testing

### Quick Test (No Vertex AI Setup Required)

Test document ingestion without needing Vertex AI credentials:

```bash
python test_agent.py ingestion
```

### Full Test Suite

Run all available tests:

```bash
python test_agent.py
```

### Individual Test Components

```bash
# Test document ingestion only
python test_agent.py ingestion

# Test configuration
python test_agent.py config

# Test RAG pipeline initialization
python test_agent.py rag

# Test full workflow (requires Vertex AI datastore)
python test_agent.py full

# Test query only (assumes documents already ingested)
python test_agent.py query
```

## Troubleshooting

### Authentication Errors
- Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to a valid service account key
- Verify the service account has necessary permissions

### Datastore Not Found
- Verify `RAG_DATASTORE_ID` matches your Vertex AI Search datastore ID
- Ensure the datastore exists in the specified location

### Import Errors
- Make sure you're running from the project root directory
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify Python path includes the project root

### Google ADK Not Found
- Install Google ADK: `pip install google-adk`
- Check that you're using the correct version compatible with your Python version

## License

This project is for educational/demonstration purposes.
