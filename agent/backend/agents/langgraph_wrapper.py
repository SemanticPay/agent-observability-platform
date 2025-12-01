"""LangGraph wrapper for ADK orchestrator agent - enables CopilotKit integration."""
import logging
import uuid
from typing import List, Dict, Any, Annotated
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.runnables import RunnableConfig

from copilotkit import CopilotKitState

from agent.backend.agents.orchestrator.agent import call_agent
from agent.backend.types.types import AgentCallRequest

logger = logging.getLogger(__name__)


def add_messages(left: List[BaseMessage], right: List[BaseMessage]) -> List[BaseMessage]:
    """Reducer that appends new messages to existing ones."""
    return left + right


class AgentState(CopilotKitState):
    """State for the LangGraph agent that wraps ADK."""
    messages: Annotated[List[BaseMessage], add_messages]


async def chat_node(state: AgentState, config: RunnableConfig) -> Dict[str, Any]:
    """Process user message through ADK orchestrator and return response."""
    messages = state.get("messages", [])
    
    if not messages:
        logger.warning("No messages in state")
        return {"messages": [AIMessage(content="Hello! How can I help you today?")]}
    
    # Get the last user message
    last_message = messages[-1]
    if not isinstance(last_message, HumanMessage):
        logger.debug("Last message is not from user, skipping")
        return {"messages": []}
    
    user_question = last_message.content
    logger.info(f"Processing user question: {user_question}")
    
    # Extract session_id from config or generate one
    configurable = config.get("configurable", {})
    session_id = configurable.get("thread_id", str(uuid.uuid4()))
    
    try:
        # Call the ADK agent
        response = await call_agent(
            AgentCallRequest(
                question=user_question,
                session_id=session_id,
            )
        )
        
        answer = response.answer if response and response.answer else "I couldn't generate a response."
        logger.info(f"ADK agent response: {answer[:100]}...")
        
        return {"messages": [AIMessage(content=answer)]}
    
    except Exception as e:
        logger.error(f"Error calling ADK agent: {e}", exc_info=True)
        return {"messages": [AIMessage(content=f"Sorry, I encountered an error: {str(e)}")]}


# Build the LangGraph
def build_graph():
    """Build and compile the LangGraph that wraps ADK."""
    workflow = StateGraph(AgentState)
    
    # Add the chat node
    workflow.add_node("chat", chat_node)
    
    # Define edges
    workflow.add_edge(START, "chat")
    workflow.add_edge("chat", END)
    
    # Compile with memory checkpointer
    memory = MemorySaver()
    graph = workflow.compile(checkpointer=memory)
    
    return graph


# Create the compiled graph instance
adk_langgraph_agent = build_graph()
