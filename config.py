"""Configuration settings for the driver's license renewal agent."""
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLOUD_PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT_ID", "UNKNOWN")
GCS_LOCATION = os.getenv("GCS_LOCATION", "UNKNOWN")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "publishers/google/models/text-embedding-005")
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "UNKNOWN")
VERTEX_AI_INDEX_ID = os.getenv("VERTEX_AI_INDEX_ID", "UNKNOWN")
VERTEX_AI_INDEX_ENDPOINT_ID = os.getenv("VERTEX_AI_INDEX_ENDPOINT_ID", "UNKNOWN")
VERTEX_RAG_CORPUS = os.getenv("VERTEX_RAG_CORPUS", "UNKNOWN")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Upload directory for photos
UPLOAD_DIR = "/tmp/uploads"

# Document URLs to ingest
DOCUMENT_URLS = [
    "https://www.al.sp.gov.br/repositorio/legislacao/lei/2013/lei-15266-26.12.2013.html",
    "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
    "https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran",
    "https://www.al.sp.gov.br/repositorio/legislacao/lei/2008/lei-13296-23.12.2008.html",
]
