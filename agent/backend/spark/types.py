"""Spark Lightning Network types."""

from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, Field


# Default invoice expiry time in minutes
DEFAULT_INVOICE_EXPIRY_MINUTES = 15


class Invoice(BaseModel):
    """Lightning Network invoice."""
    
    invoice_id: str = Field(..., description="Unique invoice identifier")
    bolt11: str = Field(..., description="BOLT11 encoded invoice string")
    amount_sats: int = Field(..., description="Invoice amount in satoshis")
    memo: str = Field(default="", description="Invoice memo/description")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(
        default_factory=lambda: datetime.utcnow() + timedelta(minutes=DEFAULT_INVOICE_EXPIRY_MINUTES),
        description="Invoice expiry timestamp"
    )
    
    @property
    def is_expired(self) -> bool:
        """Check if the invoice has expired."""
        return datetime.utcnow() > self.expires_at


class PaymentStatus(BaseModel):
    """Payment status for a Lightning invoice."""
    
    invoice_id: str = Field(..., description="Invoice identifier")
    paid: bool = Field(default=False, description="Whether the invoice has been paid")
    paid_at: Optional[datetime] = Field(default=None, description="Timestamp when paid")
    expired: bool = Field(default=False, description="Whether the invoice has expired")
