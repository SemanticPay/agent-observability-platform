"""Prometheus client for fetching metrics."""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import httpx

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


class PrometheusClient:
    """Client for querying Prometheus metrics."""
    
    def __init__(self, prometheus_url: str = "http://localhost:9093"):
        self.prometheus_url = prometheus_url
        self.query_url = f"{prometheus_url}/api/v1/query"
        self.query_range_url = f"{prometheus_url}/api/v1/query_range"
    
    async def query(self, query: str) -> Optional[Dict[str, Any]]:
        """Execute a PromQL query and return results."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.query_url,
                    params={"query": query},
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") == "success":
                    return data.get("data")
                else:
                    logger.error(f"Prometheus query failed: {data}")
                    return None
        except Exception as e:
            logger.error(f"Error querying Prometheus: {e}")
            return None
    
    async def query_range(
        self,
        query: str,
        start: datetime,
        end: datetime,
        step: str = "15s"
    ) -> Optional[Dict[str, Any]]:
        """Execute a PromQL range query."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.query_range_url,
                    params={
                        "query": query,
                        "start": start.timestamp(),
                        "end": end.timestamp(),
                        "step": step,
                    },
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") == "success":
                    return data.get("data")
                else:
                    logger.error(f"Prometheus range query failed: {data}")
                    return None
        except Exception as e:
            logger.error(f"Error querying Prometheus range: {e}")
            return None
    