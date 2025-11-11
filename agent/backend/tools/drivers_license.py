import logging
from typing import Optional

from google.adk.tools import ToolContext
from agent.backend.state.keys import DRIVERS_LICENSE_CONTEXT
from agent.backend.rag.rag_pipeline import retrieve_context_for


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


def get_drivers_license_context(question: str, tool_context: Optional[ToolContext] = None) -> str:
    """
    Retrieve relevant context from RAG pipeline for driver's license questions.
    
    Args:
        question: The user's question
        
    Returns:
        Context string with relevant information
    """
    try:
        context = retrieve_context_for(question)

        if tool_context:
            tool_context.state[DRIVERS_LICENSE_CONTEXT] = context
            logger.info(f"Inserted context parts into tool context state.")

        return context

    except Exception as e:
        logger.error(f"Error retrieving RAG context: {e}")
        return ""


if __name__ == "__main__":
    sample_question = "What documents do I need to renew my driver's license?"
    context = get_drivers_license_context(sample_question)
    print("Retrieved Context:\n", context)
