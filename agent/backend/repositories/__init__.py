"""Repository modules for database operations."""
from agent.backend.repositories.users import (
    create_user,
    get_user_by_email,
    get_user_by_id,
)
from agent.backend.repositories.operations import (
    Operation,
    get_all_operations,
    get_operation_by_id,
    get_operation_by_name,
)
from agent.backend.repositories.tickets import (
    Ticket,
    TicketWithOperation,
    CreateTicketData,
    create_ticket,
    get_ticket_by_id,
    get_tickets_by_user,
    update_ticket_payment_status,
)

__all__ = [
    # Users
    "create_user",
    "get_user_by_email",
    "get_user_by_id",
    # Operations
    "Operation",
    "get_all_operations",
    "get_operation_by_id",
    "get_operation_by_name",
    # Tickets
    "Ticket",
    "TicketWithOperation",
    "CreateTicketData",
    "create_ticket",
    "get_ticket_by_id",
    "get_tickets_by_user",
    "update_ticket_payment_status",
]
