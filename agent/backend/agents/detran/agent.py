"""DETRAN Agent - Sub-agent for handling driver's license transactions and payments."""
from google.adk.agents import Agent

from agent.backend.agents.detran.prompt import PROMPT


# Create the DETRAN agent for license renewal transactions
# Note: MCP tools (list_operations, get_operation, list_tickets, get_ticket) are 
# available via the MCP server and don't need to be explicitly added here.
# The frontend tool (start_driver_license_renewal) is registered on the CopilotKit side.
detran_agent = Agent(
    model="gemini-2.5-flash",
    name="detran_agent",
    description="Specialized agent for DETRAN-SP driver's license transactions, renewals, and Lightning Network payments",
    instruction=PROMPT,
    tools=[
        # MCP tools are auto-available via the MCP server
        # Frontend tools are registered in the CopilotKit frontend
    ]
)

# Add observability tag for Phare workflow tracking
detran_agent._x_phare_workflow = "detran_services"  # type: ignore
