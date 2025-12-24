"""Configuration settings for the driver's license renewal agent."""
import os
import logging
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# Google Cloud Configuration
# =============================================================================
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

# =============================================================================
# PostgreSQL Database Configuration
# =============================================================================
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
POSTGRES_DB = os.getenv("POSTGRES_DB", "detran")
POSTGRES_USER = os.getenv("POSTGRES_USER", "detran")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "detran")

# Async database URL for SQLAlchemy
DATABASE_URL = f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# =============================================================================
# JWT Authentication Configuration
# =============================================================================
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Warn if using default JWT secret in production
if JWT_SECRET_KEY == "change-me-in-production":
    logging.warning(
        "⚠️  Using default JWT_SECRET_KEY. Set a secure secret in production!"
    )

# =============================================================================
# WDK Spark (Lightning Network) Configuration
# =============================================================================
SPARK_MODE = os.getenv("SPARK_MODE", "stub")  # "stub" or "production"
SPARK_API_URL = os.getenv("SPARK_API_URL", "")
SPARK_API_KEY = os.getenv("SPARK_API_KEY", "")
