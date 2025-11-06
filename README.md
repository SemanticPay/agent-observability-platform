# Driver's License Renewal Agent

An AI agent that answers citizen questions about driver's license renewal, documentation, fees, and scheduling using Vertex AI RAG (Retrieval-Augmented Generation) pipeline.

## Features

- Answers questions about driver's license renewal in Brazil (São Paulo state)
- Uses Vertex AI RAG pipeline for document retrieval and generation
- Ingests legal documents from official government sources
- Provides accurate, context-aware answers based on legal documentation

## Prerequisites

1. **Google Cloud Project** with Vertex AI enabled
2. **Vertex AI Search (Enterprise Search)** datastore created
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

First, ingest the legal documents into the RAG pipeline:

```bash
python agent.py ingest
```

This will:
- Fetch documents from the configured URLs
- Process and chunk the documents
- Store them in the Vertex AI RAG pipeline

### 2. Ask Questions

#### Interactive Mode:
```bash
python agent.py
```

Then type your questions, or use commands:
- `ingest` - Re-ingest documents
- `quit` or `exit` - Exit the agent

#### Command Line Mode:
```bash
python agent.py query "I'm 58 years old and got my driver's license eight years ago. Can I renew it online or do I need a medical test?"
```

### Example Use Cases

- "Preciso fazer exame médico para renovar minha carteira?"
- "Quais documentos são necessários para renovação?"
- "Qual o valor da taxa de renovação?"
- "Posso renovar minha carteira online?"
- "Tenho 58 anos e tirei minha carteira há 8 anos. Posso renovar online ou preciso de exame médico?"

## Testing

### Quick Test (No Vertex AI Setup Required)

Test document ingestion without needing Vertex AI credentials:

```bash
python test_agent.py ingestion
```

This will fetch and display the documents from the configured URLs.

### Full Test Suite

Run all available tests:

```bash
python test_agent.py
```

This will test:
1. Document ingestion (no credentials needed)
2. Configuration loading
3. RAG pipeline initialization (requires credentials)

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

### Testing the Full Agent

Once you have Vertex AI set up:

1. **Ingest documents:**
```bash
python agent.py ingest
```

2. **Test with a query:**
```bash
python agent.py query "Preciso fazer exame médico para renovar minha carteira?"
```

3. **Interactive mode:**
```bash
python agent.py
```

Then type your questions directly.

## Project Structure

```
agent-workforce/
├── agent.py                 # Main agent entry point
├── rag_pipeline.py          # Vertex AI RAG pipeline integration
├── document_ingestion.py    # Document fetching and processing
├── config.py                # Configuration management
├── setup_verification.py    # Setup verification script
├── requirements.txt         # Python dependencies
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Document Sources

The agent ingests documents from:
- Lei 15.266/2013 (São Paulo)
- Código de Trânsito Brasileiro (Lei 9.503)
- Resoluções do CONTRAN
- Lei 13.296/2008 (São Paulo)

## Troubleshooting

### Authentication Errors
- Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to a valid service account key
- Verify the service account has necessary permissions

### Datastore Not Found
- Verify `RAG_DATASTORE_ID` matches your Vertex AI Search datastore ID
- Ensure the datastore exists in the specified location

### Document Fetching Errors
- Check internet connection
- Some government sites may have rate limiting
- Verify URLs are accessible

## License

This project is for educational/demonstration purposes.

