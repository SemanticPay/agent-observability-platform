"""MCP Server setup using fastapi-mcp.

This module creates an MCP (Model Context Protocol) server from the FastAPI
application, exposing selected endpoints as tools for LLM integration.

The MCP server allows AI agents to:
- Query available DETRAN operations
- Check ticket status and details
- List user tickets (with authentication context)
"""

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import FastAPI

logger = logging.getLogger(__name__)


def setup_mcp(app: "FastAPI") -> None:
    """
    Set up and mount an MCP server on the FastAPI application.
    
    This function creates an MCP server that exposes selected FastAPI endpoints
    as MCP tools. Only read operations are exposed for agent access.
    
    Exposed operations (via operation_id):
    - list_operations: GET /api/v1/operations
    - get_operation: GET /api/v1/operations/{id}
    - list_tickets: GET /api/v1/tickets
    - get_ticket: GET /api/v1/tickets/{id}
    
    Args:
        app: The FastAPI application instance
        
    Note:
        The MCP server will be available at /mcp endpoint.
        Agents can connect using the MCP protocol to access these tools.
    """
    try:
        from fastapi_mcp import FastApiMCP
    except ImportError:
        logger.warning(
            "fastapi-mcp not installed. MCP server will not be available. "
            "Install with: pip install fastapi-mcp"
        )
        return
    
    # Create MCP server from FastAPI app
    # Only expose read endpoints for agent access
    mcp = FastApiMCP(
        app,
        name="detran-mcp",
        description="DETRAN-SP API for driver's license services and ticket management",
        # Only include specific operations by their operation_id
        include_operations=[
            "list_operations",
            "get_operation", 
            "list_tickets",
            "get_ticket"
        ],
        # Include response schemas for better tool descriptions
        describe_all_responses=True,
    )
    
    # Mount the MCP server to the app
    mcp.mount()
    
    logger.info("MCP server mounted at /mcp endpoint")
    logger.info("Exposed MCP tools: list_operations, get_operation, list_tickets, get_ticket")
