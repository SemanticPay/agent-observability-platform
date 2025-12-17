"""WDK Spark client for production Lightning Network payments.

This module provides the real implementation for interacting with
WDK Spark (Tether wallet SDK) for Lightning Network invoice creation
and payment verification.

Environment Variables Required:
- SPARK_API_URL: Base URL for WDK Spark API
- SPARK_API_KEY: API key for authentication
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx

from config import SPARK_API_URL, SPARK_API_KEY
from agent.backend.spark.client import SparkClient
from agent.backend.spark.types import Invoice, PaymentStatus, DEFAULT_INVOICE_EXPIRY_MINUTES

logger = logging.getLogger(__name__)


class WdkSparkClient(SparkClient):
    """
    Production WDK Spark client for Lightning Network payments.
    
    Uses the WDK Spark API to:
    - Create Lightning invoices (BOLT11)
    - Check payment status
    
    See: https://docs.wdk.io/spark (hypothetical docs URL)
    """
    
    def __init__(self, api_url: Optional[str] = None, api_key: Optional[str] = None):
        """
        Initialize WDK Spark client.
        
        Args:
            api_url: WDK Spark API base URL (defaults to SPARK_API_URL env var)
            api_key: API key for authentication (defaults to SPARK_API_KEY env var)
        """
        self.api_url = (api_url or SPARK_API_URL).rstrip("/")
        self.api_key = api_key or SPARK_API_KEY
        
        if not self.api_url:
            raise ValueError("SPARK_API_URL is required for production mode")
        if not self.api_key:
            raise ValueError("SPARK_API_KEY is required for production mode")
        
        self._client = httpx.AsyncClient(
            base_url=self.api_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
    
    async def create_invoice(self, amount_sats: int, memo: str = "", expiry_minutes: int = DEFAULT_INVOICE_EXPIRY_MINUTES) -> Invoice:
        """
        Create a Lightning invoice via WDK Spark API.
        
        Args:
            amount_sats: Invoice amount in satoshis
            memo: Optional description/memo for the invoice
            expiry_minutes: Invoice expiry time in minutes (default: 15)
            
        Returns:
            Invoice object with BOLT11 string and metadata
            
        Raises:
            Exception: If API call fails
        """
        try:
            response = await self._client.post(
                "/v1/invoices",
                json={
                    "amount_sats": amount_sats,
                    "memo": memo,
                    "expiry_seconds": expiry_minutes * 60,
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # Parse response from WDK Spark API
            # Note: Adjust field names based on actual WDK Spark API response format
            return Invoice(
                invoice_id=data["invoice_id"],
                bolt11=data["bolt11"],
                amount_sats=amount_sats,
                memo=memo,
                created_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(minutes=expiry_minutes),
            )
            
        except httpx.HTTPStatusError as e:
            logger.error(f"WDK Spark API error creating invoice: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Failed to create Lightning invoice: {e.response.text}")
        except Exception as e:
            logger.error(f"Error creating invoice via WDK Spark: {e}")
            raise
    
    async def check_payment(self, invoice_id: str) -> PaymentStatus:
        """
        Check payment status for an invoice via WDK Spark API.
        
        Args:
            invoice_id: The invoice ID to check
            
        Returns:
            PaymentStatus with paid/expired flags
        """
        try:
            response = await self._client.get(f"/v1/invoices/{invoice_id}")
            response.raise_for_status()
            data = response.json()
            
            # Parse response from WDK Spark API
            # Note: Adjust field names based on actual WDK Spark API response format
            is_paid = data.get("status") == "paid"
            is_expired = data.get("status") == "expired"
            paid_at = None
            
            if is_paid and data.get("paid_at"):
                paid_at = datetime.fromisoformat(data["paid_at"].replace("Z", "+00:00"))
            
            return PaymentStatus(
                invoice_id=invoice_id,
                paid=is_paid,
                paid_at=paid_at,
                expired=is_expired,
            )
            
        except httpx.HTTPStatusError as e:
            logger.error(f"WDK Spark API error checking payment: {e.response.status_code} - {e.response.text}")
            # Return unknown status on error
            return PaymentStatus(
                invoice_id=invoice_id,
                paid=False,
                paid_at=None,
                expired=False,
            )
        except Exception as e:
            logger.error(f"Error checking payment via WDK Spark: {e}")
            raise
    
    async def close(self):
        """Close the HTTP client connection."""
        await self._client.aclose()
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
