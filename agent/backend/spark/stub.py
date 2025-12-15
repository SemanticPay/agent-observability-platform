"""Stub Spark client for development/testing."""

import uuid
import hashlib
import base64
from datetime import datetime
from typing import Dict

from config import SPARK_MODE
from agent.backend.spark.client import SparkClient
from agent.backend.spark.types import Invoice, PaymentStatus


class StubSparkClient(SparkClient):
    """
    Stub implementation of Spark client for development.
    
    - Generates fake BOLT11 invoices
    - Simulates payment confirmation after 3 check attempts
    """
    
    def __init__(self):
        # In-memory storage for invoices
        self._invoices: Dict[str, Invoice] = {}
        # Track check attempts per invoice (for simulating payment)
        self._check_counts: Dict[str, int] = {}
        # Track paid invoices
        self._paid: Dict[str, datetime] = {}
    
    def _generate_fake_bolt11(self, amount_sats: int, memo: str) -> str:
        """Generate a fake BOLT11 invoice string."""
        # Create a deterministic but unique-looking invoice
        unique_data = f"{uuid.uuid4()}{amount_sats}{memo}{datetime.utcnow().isoformat()}"
        hash_bytes = hashlib.sha256(unique_data.encode()).digest()
        encoded = base64.b32encode(hash_bytes).decode().lower().rstrip("=")
        
        # Format: lnbc<amount><unit><encoded_data>
        # Real BOLT11 has much more structure, but this is recognizable as fake
        amount_str = str(amount_sats)
        return f"lnbc{amount_str}n1p{encoded[:50]}"
    
    async def create_invoice(self, amount_sats: int, memo: str = "") -> Invoice:
        """Create a fake Lightning invoice."""
        invoice_id = str(uuid.uuid4())
        bolt11 = self._generate_fake_bolt11(amount_sats, memo)
        
        invoice = Invoice(
            invoice_id=invoice_id,
            bolt11=bolt11,
            amount_sats=amount_sats,
            memo=memo,
            created_at=datetime.utcnow()
        )
        
        self._invoices[invoice_id] = invoice
        self._check_counts[invoice_id] = 0
        
        return invoice
    
    async def check_payment(self, invoice_id: str) -> PaymentStatus:
        """
        Check payment status.
        
        Simulates payment: Returns paid=True after 3rd check attempt.
        """
        # If already paid, return paid status
        if invoice_id in self._paid:
            return PaymentStatus(
                invoice_id=invoice_id,
                paid=True,
                paid_at=self._paid[invoice_id]
            )
        
        # Increment check count
        self._check_counts[invoice_id] = self._check_counts.get(invoice_id, 0) + 1
        
        # After 3 checks, mark as paid
        if self._check_counts[invoice_id] >= 3:
            paid_at = datetime.utcnow()
            self._paid[invoice_id] = paid_at
            return PaymentStatus(
                invoice_id=invoice_id,
                paid=True,
                paid_at=paid_at
            )
        
        # Still pending
        return PaymentStatus(
            invoice_id=invoice_id,
            paid=False,
            paid_at=None
        )
    
    def get_invoice(self, invoice_id: str) -> Invoice | None:
        """Get an invoice by ID (for testing/debugging)."""
        return self._invoices.get(invoice_id)
    
    def force_pay(self, invoice_id: str) -> bool:
        """Force an invoice to be marked as paid (for testing)."""
        if invoice_id in self._invoices:
            self._paid[invoice_id] = datetime.utcnow()
            return True
        return False


# Singleton instance
_stub_client: StubSparkClient | None = None


def get_spark_client() -> SparkClient:
    """
    Factory function to get the appropriate Spark client.
    
    Based on SPARK_MODE config:
    - "stub": Returns StubSparkClient (default for development)
    - "production": Would return real WDK Spark client (not implemented)
    """
    global _stub_client
    
    if SPARK_MODE == "production":
        # TODO: Implement real WDK Spark client when credentials available
        raise NotImplementedError(
            "Production Spark client not yet implemented. "
            "Set SPARK_MODE=stub for development."
        )
    
    # Default to stub
    if _stub_client is None:
        _stub_client = StubSparkClient()
    
    return _stub_client
