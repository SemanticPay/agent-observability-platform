"""Vertex AI RAG pipeline integration for document storage and retrieval."""
import logging
from typing import List, Dict
from google.cloud import aiplatform
from google.cloud import discoveryengine
from langchain_google_vertexai import (
    VectorSearchVectorStore,
    VertexAI,
    VertexAIEmbeddings,
)
from langchain_text_splitters.character import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore


import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VertexAIRAGPipeline:
    """Manages Vertex AI RAG pipeline for document storage and retrieval."""
    
    def __init__(self):
        """Initialize the RAG pipeline with Vertex AI components."""
        aiplatform.init(
            project=config.GOOGLE_CLOUD_PROJECT,
            location=config.VERTEX_AI_LOCATION
        )
        
        self.embeddings = VertexAIEmbeddings(
            model_name=config.EMBEDDING_MODEL
        )
        
        self.llm = VertexAI(
            # TODO: make model configurable
            model_name="gemini-1.5-pro",
            temperature=0.1,
            max_output_tokens=2048
        )
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            # TODO: make chunk size and overlap configurable
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        # For Vector Search, datastore_id should be your Vector Search INDEX_ID
        # For Discovery Engine, it's the datastore ID
        self.index_id = config.VECTOR_SEARCH_INDEX_ID or config.RAG_DATASTORE_ID
        self.endpoint_id = config.VECTOR_SEARCH_ENDPOINT_ID
        self.gcs_bucket = config.VECTOR_SEARCH_GCS_BUCKET
        
        self.datastore_path = (
            f"projects/{config.GOOGLE_CLOUD_PROJECT}/"
            f"locations/{config.VERTEX_AI_LOCATION}/"
            f"dataStores/{config.RAG_DATASTORE_ID}"
        )
        
        # Lazily initialized vector store (reuses existing index)
        self._vector_store = None
        
        # Track which mode we're using
        self.use_vector_search = bool(self.index_id and self.endpoint_id)
    
    def _get_vector_store(self) -> VectorSearchVectorStore:
        """
        Get or create connection to existing Vector Search index.
        This connects to a pre-existing index rather than creating a new one.
        
        Returns:
            VectorSearchVectorStore instance connected to existing index
            
        Raises:
            ValueError: If Vector Search is not properly configured
        """
        if not self.use_vector_search:
            raise ValueError(
                "Vector Search not configured. Please set:\n"
                "  - VECTOR_SEARCH_INDEX_ID (your Vector Search index ID)\n"
                "  - VECTOR_SEARCH_ENDPOINT_ID (your deployed endpoint ID)\n"
                "  - VECTOR_SEARCH_GCS_BUCKET (GCS bucket name for staging)"
            )
            
        if not self.gcs_bucket:
            raise ValueError(
                "VECTOR_SEARCH_GCS_BUCKET is required for Vector Search.\n"
                "This should be the name of a GCS bucket (e.g., 'my-bucket', not 'gs://my-bucket')"
            )
            
        if self._vector_store is None:
            logger.info(f"Connecting to Vector Search index: {self.index_id}, endpoint: {self.endpoint_id}")
            self._vector_store = VectorSearchVectorStore.from_components(
                project_id=config.GOOGLE_CLOUD_PROJECT,
                region=config.VERTEX_AI_LOCATION,
                gcs_bucket_name=self.gcs_bucket,
                index_id=self.index_id,
                endpoint_id=self.endpoint_id,
                embedding=self.embeddings,
                stream_update=True,  # Use streaming updates by default
            )
        return self._vector_store
        
    def ingest_documents(self, documents: List[Dict[str, str]]) -> None:
        """
        Ingest documents into Vertex AI Vector Search index.
        This adds documents to an EXISTING index (must be created beforehand).
        
        Args:
            documents: List of document dictionaries with 'url', 'title', 'content'
        """
        logger.info(f"Ingesting {len(documents)} documents into Vertex AI Vector Search...")
        
        # Convert documents to LangChain Document format with chunking
        langchain_docs = []
        for doc in documents:
            # Split document into chunks
            chunks = self.text_splitter.split_text(doc['content'])
            
            for i, chunk in enumerate(chunks):
                metadata = {
                    'source': doc['url'],
                    'title': doc['title'],
                    'chunk_index': i,
                    'total_chunks': len(chunks)
                }
                langchain_docs.append(Document(page_content=chunk, metadata=metadata))
        
        logger.info(f"Created {len(langchain_docs)} document chunks")
        
        try:
            # Connect to existing vector store and add documents
            vector_store = self._get_vector_store()
            vector_store.add_documents(langchain_docs)
            logger.info("Successfully ingested documents into Vertex AI Vector Search")
        except Exception as e:
            logger.error(f"Failed to ingest documents: {e}")
            logger.error("Make sure you have:")
            logger.error("1. Created a Vertex AI Vector Search index")
            logger.error("2. Set RAG_DATASTORE_ID to your index ID")
            logger.error("3. Deployed the index to an endpoint")
            raise
                
        #     except Exception as vector_error:
        #         logger.warning(f"Vector Search approach failed: {vector_error}")
        #         logger.info("Attempting Discovery Engine API approach...")
        # else:
        #     logger.info("VertexAIVectorSearch not available, using Discovery Engine API...")
        
        # # Fallback to Discovery Engine API (Enterprise Search)
        # try:
        #     self._ingest_via_discovery_engine(documents)
        # except Exception as de_error:
        #     logger.error(f"Discovery Engine approach also failed: {de_error}")
        #     logger.error("Please ensure you have:")
        #     logger.error("1. Created a Vertex AI Search datastore, OR")
        #     logger.error("2. Created a Vertex AI Vector Search index")
        #     logger.error("3. Set RAG_DATASTORE_ID to the correct ID")
        #     raise
    
    # def _ingest_via_discovery_engine(self, documents: List[Dict[str, str]]) -> None:
    #     """
    #     Ingest documents using Discovery Engine API (Enterprise Search).
        
    #     Args:
    #         documents: List of document dictionaries
    #     """
    #     # TODO: create client only once
    #     client = discoveryengine.DocumentServiceClient()
        
    #     for doc in documents:
    #         # Create document structure for Discovery Engine
    #         document = discoveryengine.Document(
    #             struct_data={
    #                 "title": doc['title'],
    #                 "url": doc['url'],
    #                 "content": doc['content']
    #             }
    #         )
            
    #         # TODO: utilize self.datastore_path
    #         parent = (
    #             f"projects/{config.GOOGLE_CLOUD_PROJECT}/"
    #             f"locations/{config.VERTEX_AI_LOCATION}/"
    #             f"dataStores/{self.datastore_id}/branches/default_branch"
    #         )
            
    #         request = discoveryengine.ImportDocumentsRequest(
    #             parent=parent,
    #             gcs_source=None,  # Using inline import
    #             inline_source=discoveryengine.ImportDocumentsRequest.InlineSource(
    #                 documents=[document]
    #             )
    #         )
            
    #         operation = client.import_documents(request=request)
    #         operation.result(timeout=300)  # Wait up to 5 minutes
            
    #     logger.info("Successfully ingested documents via Discovery Engine API")
    
    def retrieve_relevant_context(self, query: str, top_k: int = 5) -> List[Document]:
        """
        Retrieve relevant document chunks for a query from Vector Search index.
        
        Args:
            query: The search query
            top_k: Number of top results to return
            
        Returns:
            List of relevant document chunks
        """
        try:
            # Connect to existing vector store
            vector_store = self._get_vector_store()
            
            # Perform similarity search
            results = vector_store.similarity_search(query, k=top_k)
            logger.info(f"Retrieved {len(results)} relevant documents")
            return results
            
        except Exception as e:
            logger.error(f"Vector Search retrieval failed: {e}")
            logger.error("Make sure you have:")
            logger.error("1. Created a Vertex AI Vector Search index")
            logger.error("2. Ingested documents into the index")
            logger.error("3. Deployed the index to an endpoint")
            return []
    
    def _search_via_discovery_engine(self, query: str, top_k: int = 5) -> List[Document]:
        """
        Search using Discovery Engine API (fallback option).
        
        Args:
            query: Search query
            top_k: Number of results
            
        Returns:
            List of Document objects
        """
        client = discoveryengine.SearchServiceClient()
        
        serving_config = (
            f"projects/{config.GOOGLE_CLOUD_PROJECT}/"
            f"locations/{config.VERTEX_AI_LOCATION}/"
            f"dataStores/{self.index_id}/"
            f"servingConfigs/default_search"
        )
        
        request = discoveryengine.SearchRequest(
            serving_config=serving_config,
            query=query,
            page_size=top_k,
        )
        
        response = client.search(request=request)
        
        # Convert results to LangChain Documents
        documents = []
        for result in response.results:
            if result.document:
                struct_data = result.document.struct_data
                content = struct_data.get('content', '')
                title = struct_data.get('title', 'Unknown')
                url = struct_data.get('url', 'Unknown')
                
                doc = Document(
                    page_content=content,
                    metadata={
                        'source': url,
                        'title': title,
                        'score': result.relevance_score if hasattr(result, 'relevance_score') else 0.0
                    }
                )
                documents.append(doc)
        
        return documents
    
    def generate_answer(self, query: str, context_docs: List[Document]) -> str:
        """
        Generate an answer using the LLM with retrieved context.
        
        Args:
            query: The user's question
            context_docs: Retrieved relevant document chunks
            
        Returns:
            Generated answer string
        """
        # Build context from retrieved documents
        context_parts = []
        for doc in context_docs:
            source = doc.metadata.get('source', 'Unknown')
            title = doc.metadata.get('title', 'Unknown')
            context_parts.append(f"[Source: {title}]\n{doc.page_content}")
        
        context = "\n\n---\n\n".join(context_parts)
        
        # Create prompt for the LLM
        prompt = f"""Você é um assistente especializado em questões sobre renovação de carteira de motorista no Brasil, especificamente no estado de São Paulo.

Use APENAS as informações fornecidas no contexto abaixo para responder à pergunta do cidadão. Se a informação não estiver no contexto, diga que não tem essa informação específica disponível.

Contexto:
{context}

Pergunta do cidadão: {query}

Forneça uma resposta clara, precisa e útil baseada nas informações legais fornecidas. Se possível, mencione a fonte da informação."""
        
        try:
            response = self.llm.invoke(prompt)
            return response
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            raise


if __name__ == "__main__":
    # Test the RAG pipeline
    from document_ingestion import DocumentIngester
    from config import DOCUMENT_URLS
    
    # Fetch documents
    ingester = DocumentIngester()
    documents = ingester.fetch_all_documents(DOCUMENT_URLS)
    
    # Ingest into RAG pipeline
    rag = VertexAIRAGPipeline()
    rag.ingest_documents(documents)
    
    # Test query
    test_query = "Preciso fazer exame médico para renovar minha carteira?"
    context = rag.retrieve_relevant_context(test_query)
    answer = rag.generate_answer(test_query, context)
    print(f"\nQuery: {test_query}")
    print(f"\nAnswer: {answer}")

