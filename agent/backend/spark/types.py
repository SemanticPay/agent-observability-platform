"""Spark Lightning Network types."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Invoice(BaseModel):
    """Lightning Network invoice."""
    
    invoice_id: str = Field(..., description="Unique invoice identifier")
    bolt11: str = Field(..., description="BOLT11 encoded invoice string")
    amount_sats: int = Field(..., description="Invoice amount in satoshis")
    memo: str = Field(default="", description="Invoice memo/description")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PaymentStatus(BaseModel):
    """Payment status for a Lightning invoice."""
    
    invoice_id: str = Field(..., description="Invoice identifier")
    paid: bool = Field(default=False, description="Whether the invoice has been paid")
    paid_at: Optional[datetime] = Field(default=None, description="Timestamp when paid")
