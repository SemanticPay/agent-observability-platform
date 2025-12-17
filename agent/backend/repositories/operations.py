"""Operations repository for database operations."""
from typing import Optional, List
from datetime import datetime

from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class Operation(BaseModel):
    """Operation model as stored in database."""
    id: int
    name: str
    description: Optional[str] = None
    price: int  # satoshis
    required_fields: dict  # JSON object defining required form fields
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


async def get_all_operations(db: AsyncSession) -> List[Operation]:
    """
    Get all available operations.
    
    Args:
        db: Database session
        
    Returns:
        List of all operations
    """
    result = await db.execute(
        text("""
            SELECT id, name, description, price, required_fields, created_at
            FROM operations
            ORDER BY id
        """)
    )
    
    rows = result.fetchall()
    return [
        Operation(
            id=row.id,
            name=row.name,
            description=row.description,
            price=row.price,
            required_fields=row.required_fields,
            created_at=row.created_at
        )
        for row in rows
    ]


async def get_operation_by_id(db: AsyncSession, operation_id: int) -> Optional[Operation]:
    """
    Get an operation by its ID.
    
    Args:
        db: Database session
        operation_id: Operation ID
        
    Returns:
        Operation if found, None otherwise
    """
    result = await db.execute(
        text("""
            SELECT id, name, description, price, required_fields, created_at
            FROM operations
            WHERE id = :operation_id
        """),
        {"operation_id": operation_id}
    )
    
    row = result.fetchone()
    if row is None:
        return None
    
    return Operation(
        id=row.id,
        name=row.name,
        description=row.description,
        price=row.price,
        required_fields=row.required_fields,
        created_at=row.created_at
    )


async def get_operation_by_name(db: AsyncSession, name: str) -> Optional[Operation]:
    """
    Get an operation by its name.
    
    Args:
        db: Database session
        name: Operation name (e.g., 'driver_license_renewal')
        
    Returns:
        Operation if found, None otherwise
    """
    result = await db.execute(
        text("""
            SELECT id, name, description, price, required_fields, created_at
            FROM operations
            WHERE name = :name
        """),
        {"name": name}
    )
    
    row = result.fetchone()
    if row is None:
        return None
    
    return Operation(
        id=row.id,
        name=row.name,
        description=row.description,
        price=row.price,
        required_fields=row.required_fields,
        created_at=row.created_at
    )
