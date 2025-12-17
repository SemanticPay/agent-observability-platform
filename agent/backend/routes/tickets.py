"""Tickets API routes."""
import json
import logging
from typing import Annotated, Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from agent.backend.auth.dependencies import get_current_user
from agent.backend.auth.models import UserInDB
from agent.backend.database.postgres import get_db
from agent.backend.errors import (
    ForbiddenError,
    InvoiceCreationFailedError,
    MissingRequiredFieldsError,
    OperationNotFoundError,
    TicketNotFoundError,
)
from agent.backend.repositories.operations import get_operation_by_id
from agent.backend.repositories.tickets import (
    CreateTicketData,
    TicketWithOperation,
    create_ticket,
    get_ticket_by_id,
    get_tickets_by_user,
    update_ticket_payment_status,
)
from agent.backend.spark import get_spark_client
from agent.backend.types.types import (
    CreateTicketRequest,
    CreateTicketResponse,
    TicketResponse,
    TicketListResponse,
    ConfirmPaymentResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/tickets", tags=["tickets"])


def _validate_form_data(form_data: dict, required_fields: dict) -> List[str]:
    """
    Validate form_data against required_fields schema.
    
    Returns list of missing field names.
    """
    missing = []
    for field_name in required_fields.keys():
        if field_name not in form_data or not form_data[field_name]:
            missing.append(field_name)
    return missing


def _ticket_to_response(ticket: TicketWithOperation) -> TicketResponse:
    """Convert repository ticket to API response."""
    return TicketResponse(
        id=ticket.id,
        operation_id=ticket.operation_id,
        operation_name=ticket.operation_name,
        form_data=ticket.form_data,
        ln_invoice=ticket.ln_invoice,
        amount_sats=ticket.amount_sats,
        payment_status=ticket.payment_status,
        created_at=ticket.created_at
    )


@router.post(
    "",
    response_model=CreateTicketResponse,
    status_code=201,
    operation_id="create_ticket",
    summary="Create a new ticket"
)
async def create_new_ticket(
    request: CreateTicketRequest,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> CreateTicketResponse:
    """
    Create a new service ticket with Lightning invoice.
    
    **Requires authentication.**
    
    - **operation_id**: ID of the operation (e.g., driver license renewal)
    - **form_data**: Form data matching the operation's required_fields
    
    Returns the ticket ID and BOLT11 invoice for payment.
    """
    # Get operation
    operation = await get_operation_by_id(db, request.operation_id)
    if operation is None:
        raise OperationNotFoundError(request.operation_id)
    
    # Validate form data
    missing = _validate_form_data(request.form_data, operation.required_fields)
    if missing:
        raise MissingRequiredFieldsError(missing)
    
    # Create Lightning invoice
    try:
        spark_client = get_spark_client()
        memo = f"DETRAN-SP: {operation.description or operation.name}"
        invoice = await spark_client.create_invoice(
            amount_sats=operation.price,
            memo=memo
        )
    except Exception as e:
        logger.error(f"Failed to create Lightning invoice: {e}")
        raise InvoiceCreationFailedError(str(e))
    
    # Create ticket in database
    ticket_data = CreateTicketData(
        operation_id=operation.id,
        user_id=current_user.id,
        form_data=request.form_data,
        ln_invoice_id=invoice.invoice_id,
        ln_invoice=invoice.bolt11,
        amount_sats=operation.price
    )
    
    ticket = await create_ticket(db, ticket_data)
    
    return CreateTicketResponse(
        ticket_id=ticket.id,
        ln_invoice=invoice.bolt11,
        amount_sats=operation.price
    )


@router.get(
    "",
    response_model=TicketListResponse,
    operation_id="list_tickets",
    summary="List user's tickets"
)
async def list_user_tickets(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status: Optional[str] = Query(None, description="Filter by payment status: 'pending' or 'paid'"),
    limit: int = Query(20, ge=1, le=100, description="Max tickets to return"),
    offset: int = Query(0, ge=0, description="Number of tickets to skip")
) -> TicketListResponse:
    """
    Get all tickets for the authenticated user.
    
    **Requires authentication.**
    
    - **status**: Optional filter ('pending' or 'paid')
    - **limit**: Max results (1-100, default 20)
    - **offset**: Pagination offset
    
    Returns paginated list of tickets with total count.
    """
    tickets, total = await get_tickets_by_user(
        db,
        user_id=current_user.id,
        status=status,
        limit=limit,
        offset=offset
    )
    
    return TicketListResponse(
        tickets=[_ticket_to_response(t) for t in tickets],
        total=total
    )


@router.get(
    "/{ticket_id}",
    response_model=TicketResponse,
    operation_id="get_ticket",
    summary="Get ticket details"
)
async def get_ticket_details(
    ticket_id: UUID,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TicketResponse:
    """
    Get details of a specific ticket.
    
    **Requires authentication.** Users can only view their own tickets.
    
    - **ticket_id**: UUID of the ticket
    
    Returns ticket details including payment status.
    """
    ticket = await get_ticket_by_id(db, ticket_id)
    
    if ticket is None:
        raise TicketNotFoundError(str(ticket_id))
    
    # Verify ownership
    if ticket.user_id != current_user.id:
        raise ForbiddenError("forbidden")
    
    return _ticket_to_response(ticket)


@router.post(
    "/{ticket_id}/confirm-payment",
    response_model=ConfirmPaymentResponse,
    operation_id="confirm_payment",
    summary="Confirm ticket payment"
)
async def confirm_ticket_payment(
    ticket_id: UUID,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> ConfirmPaymentResponse:
    """
    Check and confirm payment for a ticket.
    
    **Requires authentication.** Users can only confirm their own tickets.
    
    Calls the Lightning Network to check if the invoice has been paid.
    If paid, updates the ticket status.
    
    - **ticket_id**: UUID of the ticket
    
    Returns the current payment status.
    """
    ticket = await get_ticket_by_id(db, ticket_id)
    
    if ticket is None:
        raise TicketNotFoundError(str(ticket_id))
    
    # Verify ownership
    if ticket.user_id != current_user.id:
        raise ForbiddenError("forbidden")
    
    # If already paid, return immediately
    if ticket.payment_status == "paid":
        return ConfirmPaymentResponse(status="paid")
    
    # Check payment with Lightning Network
    spark_client = get_spark_client()
    payment_status = await spark_client.check_payment(ticket.ln_invoice_id)
    
    if payment_status.paid:
        # Update ticket status in database
        await update_ticket_payment_status(db, ticket_id, "paid")
        return ConfirmPaymentResponse(status="paid")
    
    return ConfirmPaymentResponse(status="pending")
