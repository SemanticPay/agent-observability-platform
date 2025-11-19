"""Drivers License Agent - Sub-agent for handling driver's license renewal questions."""
from google.adk.agents import Agent

from agent.backend.agents.drivers_license.prompt import PROMPT
from agent.backend.tools.drivers_license import ask_vertex_retrieval


drivers_license_agent = Agent(
    model="gemini-2.5-flash",
    name="drivers_license_agent",
    description="Specialized agent for answering driver's license renewal questions in São Paulo, Brazil",
    instruction=PROMPT,
    tools=[
        ask_vertex_retrieval,
    ]
)

