"""Abstract Spark client interface."""

from abc import ABC, abstractmethod

from agent.backend.spark.types import Invoice, PaymentStatus


class SparkClient(ABC):
    """Abstract base class for Spark Lightning client."""
    
    @abstractmethod
    async def create_invoice(self, amount_sats: int, memo: str = "") -> Invoice:
        """
        Create a new Lightning invoice.
        
        Args:
            amount_sats: Amount in satoshis
            memo: Optional invoice description
            
        Returns:
            Invoice object with BOLT11 string
        """
        pass
    
    @abstractmethod
    async def check_payment(self, invoice_id: str) -> PaymentStatus:
        """
        Check if an invoice has been paid.
        
        Args:
            invoice_id: The invoice identifier
            
        Returns:
            PaymentStatus indicating if paid
        """
        pass
