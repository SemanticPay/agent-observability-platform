"""Custom exception classes for the DETRAN API."""
from typing import Optional, List

from fastapi import HTTPException, status


class UnauthorizedError(HTTPException):
    """401 Unauthorized - Missing or invalid token."""
    
    def __init__(self, detail: str = "unauthorized"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


class ForbiddenError(HTTPException):
    """403 Forbidden - User doesn't have permission."""
    
    def __init__(self, detail: str = "forbidden"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class TicketNotFoundError(HTTPException):
    """404 Not Found - Ticket doesn't exist."""
    
    def __init__(self, ticket_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "ticket_not_found",
                "ticket_id": ticket_id
            }
        )


class OperationNotFoundError(HTTPException):
    """404 Not Found - Operation doesn't exist."""
    
    def __init__(self, operation_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "operation_not_found",
                "operation_id": operation_id
            }
        )


class MissingRequiredFieldsError(HTTPException):
    """400 Bad Request - Form data missing required fields."""
    
    def __init__(self, missing: List[str]):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "missing_required_fields",
                "missing": missing
            }
        )


class InvoiceCreationFailedError(HTTPException):
    """500 Internal Server Error - Failed to create Lightning invoice."""
    
    def __init__(self, reason: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "invoice_creation_failed",
                "reason": reason or "Unknown error creating Lightning invoice"
            }
        )
