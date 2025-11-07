"""Main entry point for the Driver's License Renewal Agent."""
import asyncio
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from agent.backend.agents.orchestrator.agent import call_agent
from agent.backend.types.types import AgentCallRequest

async def main():
    """Main function for testing the agent."""
    if len(sys.argv) > 1:
        question = " ".join(sys.argv[1:])
    else:
        question = input("Enter your question: ")
    
    request = AgentCallRequest(
        question=question,
        session_id="cli-session-1"
    )
    
    response = await call_agent(request)
    print(f"\nAnswer: {response.answer}")

if __name__ == "__main__":
    asyncio.run(main())

