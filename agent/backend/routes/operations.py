"""Operations API routes."""
from typing import Annotated, List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from agent.backend.database.postgres import get_db
from agent.backend.errors import OperationNotFoundError
from agent.backend.repositories.operations import (
    Operation,
    get_all_operations,
    get_operation_by_id,
)

router = APIRouter(prefix="/api/v1/operations", tags=["operations"])


@router.get(
    "",
    response_model=List[Operation],
    operation_id="list_operations",
    summary="List all operations"
)
async def list_operations(
    db: Annotated[AsyncSession, Depends(get_db)]
) -> List[Operation]:
    """
    Get all available DETRAN operations.
    
    Returns a list of operations including:
    - **id**: Operation ID
    - **name**: Unique operation name (e.g., 'driver_license_renewal')
    - **description**: Human-readable description
    - **price**: Price in satoshis
    - **required_fields**: JSON schema of required form fields
    """
    return await get_all_operations(db)


@router.get(
    "/{operation_id}",
    response_model=Operation,
    operation_id="get_operation",
    summary="Get operation by ID"
)
async def get_operation(
    operation_id: int,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Operation:
    """
    Get a specific operation by its ID.
    
    - **operation_id**: The numeric ID of the operation
    
    Returns the operation details or 404 if not found.
    """
    operation = await get_operation_by_id(db, operation_id)
    
    if operation is None:
        raise OperationNotFoundError(operation_id)
    
    return operation
