"""Configuration settings for the driver's license renewal agent."""
import os
from dotenv import load_dotenv

load_dotenv()

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
VERTEX_AI_LOCATION = os.getenv("VERTEX_AI_LOCATION", "us-central1")

# Vertex AI RAG Configuration
# Can be either a Vertex AI Vector Search index ID or a Vertex AI Search datastore ID
RAG_DATASTORE_ID = os.getenv("RAG_DATASTORE_ID")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "textembedding-gecko@003")

# Document URLs to ingest
DOCUMENT_URLS = [
    "https://www.al.sp.gov.br/repositorio/legislacao/lei/2013/lei-15266-26.12.2013.html",
    "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
    "https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran",
    "https://www.al.sp.gov.br/repositorio/legislacao/lei/2008/lei-13296-23.12.2008.html",
]

# Validate required configuration
if not GOOGLE_CLOUD_PROJECT:
    raise ValueError("GOOGLE_CLOUD_PROJECT environment variable is required")
if not RAG_DATASTORE_ID:
    raise ValueError("RAG_DATASTORE_ID environment variable is required")

