"""Scheduler Agent - Sub-agent for booking exam slots at verified clinics."""
from google.adk.agents import Agent
from agent.backend.agents.scheduler.prompt import PROMPT
from agent.backend.tools.scheduler import (
    search_nearby_clinics,
    book_exam,
    geocode_location,
)


scheduler_agent = Agent(
    model="gemini-2.5-flash",
    name="scheduler_agent",
    description="Specialized agent for finding and booking exam slots (medical or driving) at verified clinics",
    instruction=PROMPT,
    tools=[
        geocode_location,
        search_nearby_clinics,
        book_exam,
    ]
)

