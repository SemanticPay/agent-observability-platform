import tempfile
import logging
import vertexai
from vertexai import rag
from agent.backend.rag.document_fetcher import DocumentFetcher
from agent.backend.rag.types import Document
from config import (
    DOCUMENT_URLS,
    GOOGLE_CLOUD_PROJECT_ID,
    GCS_LOCATION,
    VERTEX_RAG_CORPUS,
)


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


vertexai.init(project=GOOGLE_CLOUD_PROJECT_ID, location=GCS_LOCATION)


def _get_or_create_corpus() -> rag.RagCorpus:
    """Get existing RAG corpus or create a new one if it doesn't exist.
    
    Returns:
        The RAG corpus with text-embedding-005 model configuration
    """
    cfg = rag.RagEmbeddingModelConfig(
        vertex_prediction_endpoint=rag.VertexPredictionEndpoint(
            publisher_model="publishers/google/models/text-embedding-005"
        ),
    )

    for c in rag.list_corpora():
        if c.display_name == VERTEX_RAG_CORPUS:
            return c  # type: ignore

    return rag.create_corpus(
        display_name=VERTEX_RAG_CORPUS,
        description="Brazil government documents corpus",
        backend_config=rag.RagVectorDbConfig(
            rag_embedding_model_config=cfg,
        ),
    )


RAG_CORPUS = _get_or_create_corpus()
RAG_RETRIEVAL_CONFIG = rag.RagRetrievalConfig(
    top_k=5,  # TODO: make configurable
    filter=rag.Filter(vector_distance_threshold=0.5),  # TODO: make configurable
)
RAG_TRANSFORMATION_CONFIG = rag.TransformationConfig(
    chunking_config=rag.ChunkingConfig(
        chunk_size=1024,
        chunk_overlap=200,
    ),
)


def retrieve_context_for(query: str) -> str:
    """Retrieve relevant context from the RAG corpus for a given query.
    
    Args:
        query: The search query text
        
    Returns:
        Formatted string containing retrieved contexts with source information
    """
    response = rag.retrieval_query(
        rag_resources=[
            rag.RagResource(
                rag_corpus=RAG_CORPUS.name,
            )
        ],
        text=query,
        rag_retrieval_config=RAG_RETRIEVAL_CONFIG,
    )

    contexts = []
    for ctx in response.contexts.contexts:
        contexts.append(
            f"source_uri: {ctx.source_uri}\n"
            f"source_display_name: {ctx.source_display_name}\n"
            f"{ctx.text}"
        )

    return "\n\n---\n\n".join(contexts)


def _upload_to_corpus(corpus: rag.RagCorpus, doc: Document) -> None:
    """Upload a document to the RAG corpus.
    
    Args:
        corpus: The RAG corpus to upload to
        doc: Document containing title, content, and source URL
    """
    with tempfile.NamedTemporaryFile("w+", suffix=".txt") as tmp:
        tmp.write(doc.content)
        tmp.flush()
        rag.upload_file(
            corpus_name=corpus.name,  # type: ignore
            path=tmp.name,
            display_name=doc.title,
            description=f"[Title: {doc.title}] [Source URL: {doc.source_url}]",
            transformation_config=RAG_TRANSFORMATION_CONFIG,
        )


if __name__ == "__main__":
    fetches = DocumentFetcher()

    for url in DOCUMENT_URLS:
        logger.info(f"Fetching and uploading document from URL: {url}")
        doc = fetches.fetch_document(url)
        logger.info(f"Fetched document titled: {doc.title}")
        _upload_to_corpus(RAG_CORPUS, doc)
        logger.info(f"Uploaded document '{doc.title}' to corpus '{RAG_CORPUS.display_name}'")
