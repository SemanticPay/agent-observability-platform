"""Vertex AI RAG pipeline integration for document storage and retrieval."""
import logging
from typing import List, Dict, Optional
from google.cloud import aiplatform
from google.cloud import discoveryengine
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_google_vertexai import VertexAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
import json
import time
import sys
import os

# Add parent directory to path for config import
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Try importing VertexAIVectorSearch from the correct location
try:
    from langchain_google_vertexai import VertexAIVectorSearch
except ImportError:
    try:
        from langchain_community.vectorstores import VertexAIVectorSearch
    except ImportError:
        # If not available, we'll use Discovery Engine only
        VertexAIVectorSearch = None

from config import (
    GOOGLE_CLOUD_PROJECT,
    VERTEX_AI_LOCATION,
    RAG_DATASTORE_ID,
    EMBEDDING_MODEL
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VertexAIRAGPipeline:
    """Manages Vertex AI RAG pipeline for document storage and retrieval."""
    
    def __init__(self):
        """Initialize the RAG pipeline with Vertex AI components."""
        aiplatform.init(
            project=GOOGLE_CLOUD_PROJECT,
            location=VERTEX_AI_LOCATION
        )
        
        self.embeddings = VertexAIEmbeddings(
            model_name=EMBEDDING_MODEL
        )
        
        self.llm = VertexAI(
            model_name="gemini-1.5-pro",
            temperature=0.1,
            max_output_tokens=2048
        )
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        self.datastore_id = RAG_DATASTORE_ID
        self.datastore_path = (
            f"projects/{GOOGLE_CLOUD_PROJECT}/"
            f"locations/{VERTEX_AI_LOCATION}/"
            f"dataStores/{self.datastore_id}"
        )
        
    def ingest_documents(self, documents: List[Dict[str, str]]) -> None:
        """
        Ingest documents into Vertex AI Search (Enterprise Search).
        
        Args:
            documents: List of document dictionaries with 'url', 'title', 'content'
        """
        logger.info(f"Ingesting {len(documents)} documents into Vertex AI RAG pipeline...")
        
        # Convert documents to LangChain Document format
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
        
        # Try using Vertex AI Vector Search (for Vector Search indexes)
        if VertexAIVectorSearch is not None:
            try:
                vector_store = VertexAIVectorSearch(
                    project_id=GOOGLE_CLOUD_PROJECT,
                    location=VERTEX_AI_LOCATION,
                    index_id=self.datastore_id,
                    embedding=self.embeddings,
                )
                
                # Add documents to vector store
                vector_store.add_documents(langchain_docs)
                logger.info("Successfully ingested documents into Vertex AI Vector Search")
                return
                
            except Exception as vector_error:
                logger.warning(f"Vector Search approach failed: {vector_error}")
                logger.info("Attempting Discovery Engine API approach...")
        else:
            logger.info("VertexAIVectorSearch not available, using Discovery Engine API...")
        
        # Fallback to Discovery Engine API (Enterprise Search)
        try:
            self._ingest_via_discovery_engine(documents)
        except Exception as de_error:
            logger.error(f"Discovery Engine approach also failed: {de_error}")
            logger.error("Please ensure you have:")
            logger.error("1. Created a Vertex AI Search datastore, OR")
            logger.error("2. Created a Vertex AI Vector Search index")
            logger.error("3. Set RAG_DATASTORE_ID to the correct ID")
            raise
    
    def _ingest_via_discovery_engine(self, documents: List[Dict[str, str]]) -> None:
        """
        Ingest documents using Discovery Engine API (Enterprise Search).
        
        Args:
            documents: List of document dictionaries
        """
        client = discoveryengine.DocumentServiceClient()
        
        for doc in documents:
            # Create document structure for Discovery Engine
            document = discoveryengine.Document(
                struct_data={
                    "title": doc['title'],
                    "url": doc['url'],
                    "content": doc['content']
                }
            )
            
            parent = (
                f"projects/{GOOGLE_CLOUD_PROJECT}/"
                f"locations/{VERTEX_AI_LOCATION}/"
                f"dataStores/{self.datastore_id}/branches/default_branch"
            )
            
            request = discoveryengine.ImportDocumentsRequest(
                parent=parent,
                gcs_source=None,  # Using inline import
                inline_source=discoveryengine.ImportDocumentsRequest.InlineSource(
                    documents=[document]
                )
            )
            
            operation = client.import_documents(request=request)
            operation.result(timeout=300)  # Wait up to 5 minutes
            
        logger.info("Successfully ingested documents via Discovery Engine API")
    
    def retrieve_relevant_context(self, query: str, top_k: int = 5) -> List[Document]:
        """
        Retrieve relevant document chunks for a query.
        
        Args:
            query: The search query
            top_k: Number of top results to return
            
        Returns:
            List of relevant document chunks
        """
        # Try Vector Search first
        if VertexAIVectorSearch is not None:
            try:
                vector_store = VertexAIVectorSearch(
                    project_id=GOOGLE_CLOUD_PROJECT,
                    location=VERTEX_AI_LOCATION,
                    index_id=self.datastore_id,
                    embedding=self.embeddings,
                )
                
                # Perform similarity search
                results = vector_store.similarity_search(query, k=top_k)
                return results
                
            except Exception as vector_error:
                logger.warning(f"Vector Search retrieval failed: {vector_error}")
        
        # Fallback to Discovery Engine search
        try:
            return self._search_via_discovery_engine(query, top_k)
        except Exception as de_error:
            logger.error(f"Discovery Engine search also failed: {de_error}")
            return []
    
    def _search_via_discovery_engine(self, query: str, top_k: int = 5) -> List[Document]:
        """
        Search using Discovery Engine API.
        
        Args:
            query: Search query
            top_k: Number of results
            
        Returns:
            List of Document objects
        """
        client = discoveryengine.SearchServiceClient()
        
        serving_config = (
            f"projects/{GOOGLE_CLOUD_PROJECT}/"
            f"locations/{VERTEX_AI_LOCATION}/"
            f"dataStores/{self.datastore_id}/"
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

