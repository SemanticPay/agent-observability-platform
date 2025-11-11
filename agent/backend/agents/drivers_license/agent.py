"""Drivers License Agent - Sub-agent for handling driver's license renewal questions."""
from google.adk.agents import Agent

from agent.backend.agents.drivers_license.prompt import PROMPT
from agent.backend.tools.drivers_license import get_drivers_license_context


drivers_license_agent = Agent(
    model="gemini-2.5-flash",
    name="drivers_license_agent",
    description="Specialized agent for answering driver's license renewal questions in São Paulo, Brazil",
    instruction=PROMPT,
    tools=[
        get_drivers_license_context,
    ]
)

