"""CopilotKit AG-UI integration for orchestrator agent."""
import logging
import sys
from dotenv import load_dotenv
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent.backend.agents.orchestrator.agent import ORCHESTRATOR_AGENT

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

logger.info("Creating ADK middleware agent instance for CopilotKit")

# Create ADK middleware agent instance wrapping the orchestrator
# Don't set user_id here - let it be extracted from the request
adk_copilot_agent = ADKAgent(
    adk_agent=ORCHESTRATOR_AGENT,
    app_name="drivers-license-assistant",
    session_timeout_seconds=3600,
    use_in_memory_services=True
)

logger.info("ADK middleware agent instance created successfully")

# Create FastAPI app for CopilotKit
copilotkit_app = FastAPI(title="CopilotKit Agent API")

# Add CORS middleware
copilotkit_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add the ADK streaming endpoint for CopilotKit
# Note: path="/" because this app will be mounted at /copilot in main.py
logger.info("Adding ADK FastAPI endpoint at /")
add_adk_fastapi_endpoint(copilotkit_app, adk_copilot_agent, path="/")

logger.info("CopilotKit agent endpoint configured successfully")

if __name__ == "__main__":
    import os
    import uvicorn

    if not os.getenv("GOOGLE_API_KEY"):
        logger.warning("⚠️  Warning: GOOGLE_API_KEY environment variable not set!")
        logger.warning("   Set it with: export GOOGLE_API_KEY='your-key-here'")
        logger.warning("   Get a key from: https://makersuite.google.com/app/apikey")

    port = int(os.getenv("PORT", 8001))
    logger.info(f"Starting CopilotKit agent server on port {port}")
    uvicorn.run(copilotkit_app, host="0.0.0.0", port=port)

