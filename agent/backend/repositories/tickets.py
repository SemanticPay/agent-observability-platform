"""Tickets repository for database operations."""
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class Ticket(BaseModel):
    """Ticket model as stored in database."""
    id: UUID
    operation_id: int
    user_id: UUID
    form_data: dict
    ln_invoice_id: Optional[str] = None
    ln_invoice: Optional[str] = None  # BOLT11 string
    amount_sats: int
    payment_status: str = "pending"
    created_at: datetime

    class Config:
        from_attributes = True


class TicketWithOperation(Ticket):
    """Ticket with operation details included."""
    operation_name: str
    operation_description: Optional[str] = None


class CreateTicketData(BaseModel):
    """Data required to create a ticket."""
    operation_id: int
    user_id: UUID
    form_data: dict
    ln_invoice_id: str
    ln_invoice: str
    amount_sats: int


async def create_ticket(db: AsyncSession, data: CreateTicketData) -> Ticket:
    """
    Create a new ticket in the database.
    
    Args:
        db: Database session
        data: Ticket creation data
        
    Returns:
        Created ticket
    """
    result = await db.execute(
        text("""
            INSERT INTO tickets (operation_id, user_id, form_data, ln_invoice_id, ln_invoice, amount_sats)
            VALUES (:operation_id, :user_id, :form_data, :ln_invoice_id, :ln_invoice, :amount_sats)
            RETURNING id, operation_id, user_id, form_data, ln_invoice_id, ln_invoice, amount_sats, payment_status, created_at
        """),
        {
            "operation_id": data.operation_id,
            "user_id": data.user_id,
            "form_data": data.form_data,
            "ln_invoice_id": data.ln_invoice_id,
            "ln_invoice": data.ln_invoice,
            "amount_sats": data.amount_sats
        }
    )
    
    row = result.fetchone()
    await db.commit()
    
    return Ticket(
        id=row.id,
        operation_id=row.operation_id,
        user_id=row.user_id,
        form_data=row.form_data,
        ln_invoice_id=row.ln_invoice_id,
        ln_invoice=row.ln_invoice,
        amount_sats=row.amount_sats,
        payment_status=row.payment_status,
        created_at=row.created_at
    )


async def get_ticket_by_id(db: AsyncSession, ticket_id: UUID) -> Optional[TicketWithOperation]:
    """
    Get a ticket by its ID with operation details.
    
    Args:
        db: Database session
        ticket_id: Ticket UUID
        
    Returns:
        TicketWithOperation if found, None otherwise
    """
    result = await db.execute(
        text("""
            SELECT 
                t.id, t.operation_id, t.user_id, t.form_data, 
                t.ln_invoice_id, t.ln_invoice, t.amount_sats, 
                t.payment_status, t.created_at,
                o.name as operation_name, o.description as operation_description
            FROM tickets t
            JOIN operations o ON t.operation_id = o.id
            WHERE t.id = :ticket_id
        """),
        {"ticket_id": ticket_id}
    )
    
    row = result.fetchone()
    if row is None:
        return None
    
    return TicketWithOperation(
        id=row.id,
        operation_id=row.operation_id,
        user_id=row.user_id,
        form_data=row.form_data,
        ln_invoice_id=row.ln_invoice_id,
        ln_invoice=row.ln_invoice,
        amount_sats=row.amount_sats,
        payment_status=row.payment_status,
        created_at=row.created_at,
        operation_name=row.operation_name,
        operation_description=row.operation_description
    )


async def get_tickets_by_user(
    db: AsyncSession,
    user_id: UUID,
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0
) -> tuple[List[TicketWithOperation], int]:
    """
    Get tickets for a user with pagination.
    
    Args:
        db: Database session
        user_id: User UUID
        status: Optional filter by payment_status ('pending' or 'paid')
        limit: Max tickets to return
        offset: Number of tickets to skip
        
    Returns:
        Tuple of (tickets list, total count)
    """
    # Build WHERE clause
    where_conditions = ["t.user_id = :user_id"]
    params = {"user_id": user_id, "limit": limit, "offset": offset}
    
    if status:
        where_conditions.append("t.payment_status = :status")
        params["status"] = status
    
    where_clause = " AND ".join(where_conditions)
    
    # Get total count
    count_result = await db.execute(
        text(f"""
            SELECT COUNT(*) as total
            FROM tickets t
            WHERE {where_clause}
        """),
        params
    )
    total = count_result.scalar()
    
    # Get tickets
    result = await db.execute(
        text(f"""
            SELECT 
                t.id, t.operation_id, t.user_id, t.form_data, 
                t.ln_invoice_id, t.ln_invoice, t.amount_sats, 
                t.payment_status, t.created_at,
                o.name as operation_name, o.description as operation_description
            FROM tickets t
            JOIN operations o ON t.operation_id = o.id
            WHERE {where_clause}
            ORDER BY t.created_at DESC
            LIMIT :limit OFFSET :offset
        """),
        params
    )
    
    rows = result.fetchall()
    tickets = [
        TicketWithOperation(
            id=row.id,
            operation_id=row.operation_id,
            user_id=row.user_id,
            form_data=row.form_data,
            ln_invoice_id=row.ln_invoice_id,
            ln_invoice=row.ln_invoice,
            amount_sats=row.amount_sats,
            payment_status=row.payment_status,
            created_at=row.created_at,
            operation_name=row.operation_name,
            operation_description=row.operation_description
        )
        for row in rows
    ]
    
    return tickets, total


async def update_ticket_payment_status(
    db: AsyncSession,
    ticket_id: UUID,
    status: str
) -> Optional[Ticket]:
    """
    Update a ticket's payment status.
    
    Args:
        db: Database session
        ticket_id: Ticket UUID
        status: New payment status ('pending' or 'paid')
        
    Returns:
        Updated ticket if found, None otherwise
    """
    result = await db.execute(
        text("""
            UPDATE tickets
            SET payment_status = :status
            WHERE id = :ticket_id
            RETURNING id, operation_id, user_id, form_data, ln_invoice_id, ln_invoice, amount_sats, payment_status, created_at
        """),
        {"ticket_id": ticket_id, "status": status}
    )
    
    row = result.fetchone()
    await db.commit()
    
    if row is None:
        return None
    
    return Ticket(
        id=row.id,
        operation_id=row.operation_id,
        user_id=row.user_id,
        form_data=row.form_data,
        ln_invoice_id=row.ln_invoice_id,
        ln_invoice=row.ln_invoice,
        amount_sats=row.amount_sats,
        payment_status=row.payment_status,
        created_at=row.created_at
    )
