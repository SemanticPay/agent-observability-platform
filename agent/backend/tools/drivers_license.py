from google.adk.tools.retrieval.vertex_ai_rag_retrieval import VertexAiRagRetrieval
from vertexai import rag
from agent.backend.rag.rag_pipeline import RAG_CORPUS


ask_vertex_retrieval = VertexAiRagRetrieval(
    name='retrieve_rag_documentation',
    description=(
        'Use this tool to retrieve documentation and reference materials for the question from the RAG corpus,'
    ),
    rag_resources=[
        rag.RagResource(
            rag_corpus=RAG_CORPUS.name,
        )  # type: ignore
    ],
    similarity_top_k=10,
    vector_distance_threshold=0.6,
)
