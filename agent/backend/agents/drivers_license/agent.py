"""Drivers License Agent - Sub-agent for handling driver's license renewal questions."""
import logging
import sys
import os

# Add root directory to path for config import
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from google.adk.agents import Agent
from agent.backend.agents.drivers_license.prompt import PROMPT
from agent.rag.rag_pipeline import VertexAIRAGPipeline

logger = logging.getLogger(__name__)


def get_drivers_license_context(question: str) -> str:
    """
    Retrieve relevant context from RAG pipeline for driver's license questions.
    
    Args:
        question: The user's question
        
    Returns:
        Context string with relevant information
    """
    try:
        rag_pipeline = VertexAIRAGPipeline()
        context_docs = rag_pipeline.retrieve_relevant_context(question, top_k=5)
        
        if not context_docs:
            return "No relevant information found in the knowledge base."
        
        context_parts = []
        for doc in context_docs:
            source = doc.metadata.get('source', 'Unknown')
            title = doc.metadata.get('title', 'Unknown')
            context_parts.append(f"[Source: {title}]\n{doc.page_content}")
        
        return "\n\n---\n\n".join(context_parts)
    except Exception as e:
        logger.error(f"Error retrieving RAG context: {e}")
        return f"Error retrieving context: {str(e)}"


# Create the Drivers License Agent
drivers_license_agent = Agent(
    model="gemini-2.0-flash-exp",
    name="drivers_license_agent",
    description="Specialized agent for answering driver's license renewal questions in São Paulo, Brazil",
    instruction=PROMPT,
    tools=[
        {
            "name": "get_drivers_license_context",
            "description": "Retrieves relevant information from legal documents about driver's license renewal requirements, documentation, fees, and procedures. Use this tool when you need to look up specific information from the knowledge base.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "The question or topic to search for in the knowledge base"
                    }
                },
                "required": ["question"]
            },
            "function": get_drivers_license_context
        }
    ]
)

