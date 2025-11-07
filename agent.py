"""Main agent for answering driver's license renewal questions."""
import logging
from typing import Optional
from document_ingestion import DocumentIngester
from rag_pipeline import VertexAIRAGPipeline
import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DriversLicenseAgent:
    """Agent that answers questions about driver's license renewal using Vertex AI RAG."""
    
    def __init__(self, ingest_on_init: bool = False):
        """
        Initialize the agent.
        
        Args:
            ingest_on_init: If True, automatically ingest documents on initialization
        """
        self.rag_pipeline = VertexAIRAGPipeline()
        self.ingester = DocumentIngester()
        
        if ingest_on_init:
            self._ingest_documents()
    
    def _ingest_documents(self) -> None:
        """Ingest all configured documents into the RAG pipeline."""
        logger.info("Ingesting documents into RAG pipeline...")
        # TODO: handle ingestion errors
        # TODO: pass urls upon class initialization
        documents = self.ingester.fetch_all_documents(config.DOCUMENT_URLS)
        
        if documents:
            self.rag_pipeline.ingest_documents(documents)
            logger.info(f"Successfully ingested {len(documents)} documents")
        else:
            logger.warning("No documents were successfully fetched")
    
    def answer_question(self, question: str, top_k: int = 5) -> str:
        """
        Answer a question about driver's license renewal.
        
        Args:
            question: The citizen's question
            top_k: Number of relevant document chunks to retrieve
            
        Returns:
            Answer string
        """
        logger.info(f"Processing question: {question}")
        
        # Retrieve relevant context
        context_docs = self.rag_pipeline.retrieve_relevant_context(question, top_k=top_k)
        
        if not context_docs:
            return "Desculpe, não consegui encontrar informações relevantes na base de conhecimento para responder sua pergunta. Por favor, entre em contato com o DETRAN para mais informações."
        
        # Generate answer using LLM with context
        answer = self.rag_pipeline.generate_answer(question, context_docs)
        
        return answer
    
    def ingest_documents(self) -> None:
        """Public method to manually trigger document ingestion."""
        self._ingest_documents()


def main():
    """Main entry point for the agent."""
    import sys
    
    # Initialize agent (don't auto-ingest, let user control it)
    agent = DriversLicenseAgent(ingest_on_init=False)
    
    # TODO: use a command-line interface library like argparse or click
    if len(sys.argv) > 1:
        if sys.argv[1] == "ingest":
            # Ingest documents
            print("Ingesting documents...")
            agent.ingest_documents()
            print("Document ingestion complete!")
        elif sys.argv[1] == "query" and len(sys.argv) > 2:
            # Answer a question
            question = " ".join(sys.argv[2:])
            answer = agent.answer_question(question)
            print(f"\nQuestion: {question}")
            print(f"\nAnswer:\n{answer}")
        else:
            print("Usage:")
            print("  python agent.py ingest                    - Ingest documents into RAG pipeline")
            print("  python agent.py query 'your question'     - Answer a question")
    else:
        # Interactive mode
        print("Driver's License Renewal Agent")
        print("=" * 50)
        print("Commands:")
        print("  'ingest' - Ingest documents into RAG pipeline")
        print("  'quit' or 'exit' - Exit the agent")
        print("  Any other text - Ask a question")
        print("=" * 50)
        
        while True:
            user_input = input("\n> ").strip()
            
            if not user_input:
                continue
                
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!")
                break
            elif user_input.lower() == 'ingest':
                print("Ingesting documents...")
                agent.ingest_documents()
                print("Document ingestion complete!")
            else:
                try:
                    answer = agent.answer_question(user_input)
                    print(f"\n{answer}\n")
                except Exception as e:
                    logger.error(f"Error answering question: {e}")
                    print(f"Sorry, an error occurred: {e}")


if __name__ == "__main__":
    # TODO: use ADK and proper agent chain. the drivers license agent has the "retrieve" functionality as one of its tools
    main()

