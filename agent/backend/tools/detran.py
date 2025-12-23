"""Tools for the DETRAN agent.

These tools allow the agent to query operations and tickets directly.
"""
import logging
from typing import Optional
from uuid import UUID

from google.adk.tools import ToolContext

from agent.backend.database.postgres import get_db_context
from agent.backend.repositories.operations import get_all_operations, get_operation_by_id
from agent.backend.repositories.tickets import get_tickets_by_user, get_ticket_by_id

logger = logging.getLogger(__name__)


async def list_operations(tool_context: Optional[ToolContext] = None) -> str:
    """
    Get all available DETRAN operations/services.
    
    Returns a list of all operations including their ID, name, description, and price in satoshis.
    Use this to tell users what services are available.
    
    Returns:
        A formatted string listing all available operations.
    """
    async with get_db_context() as db:
        operations = await get_all_operations(db)
    
    if not operations:
        return "No operations available at this time."
    
    result = "Available DETRAN Services:\n\n"
    for op in operations:
        result += f"• **{op.description}** (ID: {op.id})\n"
        result += f"  - Price: {op.price:,} satoshis\n"
        result += f"  - Service code: {op.name}\n\n"
    
    return result


async def get_operation(operation_id: int, tool_context: Optional[ToolContext] = None) -> str:
    """
    Get details about a specific DETRAN operation by ID.
    
    Args:
        operation_id: The numeric ID of the operation to look up.
        
    Returns:
        Details about the operation including price and required fields.
    """
    async with get_db_context() as db:
        operation = await get_operation_by_id(db, operation_id)
    
    if operation is None:
        return f"Operation with ID {operation_id} not found."
    
    result = f"**{operation.description}**\n\n"
    result += f"- ID: {operation.id}\n"
    result += f"- Service code: {operation.name}\n"
    result += f"- Price: {operation.price:,} satoshis\n"
    
    if operation.required_fields:
        result += "\nRequired information:\n"
        for field, details in operation.required_fields.items():
            field_type = details.get("type", "text")
            result += f"  • {field} ({field_type})\n"
    
    return result


async def list_tickets(
    status: Optional[str] = None,
    tool_context: Optional[ToolContext] = None
) -> str:
    """
    Get the current user's tickets/transactions.
    
    Args:
        status: Optional filter by payment status ('pending' or 'paid').
        
    Returns:
        A formatted list of the user's tickets with their status.
    """
    # For now, use a demo user ID. In production, this would come from auth context.
    # TODO: Get actual user ID from tool_context or session
    demo_user_id = UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")  # Demo user UUID
    
    async with get_db_context() as db:
        tickets, total = await get_tickets_by_user(db, demo_user_id, status=status)
    
    if not tickets:
        if status:
            return f"No tickets found with status '{status}'."
        return "You have no tickets yet. Start a service to create one!"
    
    result = f"Your Tickets ({total} total):\n\n"
    for ticket in tickets:
        status_emoji = "✅" if ticket.payment_status == "paid" else "⏳"
        result += f"{status_emoji} **{ticket.operation_name}**\n"
        result += f"   - Ticket ID: {ticket.id}\n"
        result += f"   - Amount: {ticket.amount_sats:,} sats\n"
        result += f"   - Status: {ticket.payment_status}\n"
        result += f"   - Created: {ticket.created_at.strftime('%Y-%m-%d %H:%M')}\n\n"
    
    return result


async def get_ticket(ticket_id: str, tool_context: Optional[ToolContext] = None) -> str:
    """
    Get details about a specific ticket by ID.
    
    Args:
        ticket_id: The UUID of the ticket to look up.
        
    Returns:
        Full details about the ticket including payment info.
    """
    try:
        uuid_id = UUID(ticket_id)
    except ValueError:
        return f"Invalid ticket ID format: {ticket_id}. Please provide a valid UUID."
    
    async with get_db_context() as db:
        ticket = await get_ticket_by_id(db, uuid_id)
    
    if ticket is None:
        return f"Ticket with ID {ticket_id} not found."
    
    status_emoji = "✅" if ticket.payment_status == "paid" else "⏳"
    
    result = f"{status_emoji} **Ticket Details**\n\n"
    result += f"**Service:** {ticket.operation_name}\n"
    result += f"**Ticket ID:** {ticket.id}\n"
    result += f"**Amount:** {ticket.amount_sats:,} satoshis\n"
    result += f"**Status:** {ticket.payment_status}\n"
    result += f"**Created:** {ticket.created_at.strftime('%Y-%m-%d %H:%M')}\n"
    
    if ticket.payment_status == "pending" and ticket.ln_invoice:
        result += f"\n**Lightning Invoice:** `{ticket.ln_invoice[:30]}...`\n"
        result += "\nTo pay, scan the QR code in the payment form or copy the invoice to your Lightning wallet."
    
    if ticket.form_data:
        result += "\n\n**Submitted Information:**\n"
        for key, value in ticket.form_data.items():
            # Mask sensitive data
            if "cpf" in key.lower():
                value = f"{str(value)[:3]}.***.***-{str(value)[-2:]}"
            result += f"  • {key}: {value}\n"
    
    return result
