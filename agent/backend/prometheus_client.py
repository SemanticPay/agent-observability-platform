"""Prometheus client for fetching metrics."""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import httpx

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


class PrometheusClient:
    """Client for querying Prometheus metrics."""
    
    def __init__(self, prometheus_url: str = "http://localhost:9090"):
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
    
    async def get_total_cost(self, time_range: str = "1h") -> float:
        """Get total cost over time range."""
        query = f'sum(rate(total_cost_total[{time_range}])) * 3600'
        result = await self.query(query)
        
        if result and result.get("result"):
            return float(result["result"][0]["value"][1])
        return 0.0
    
    async def get_total_tokens(self, time_range: str = "1h") -> int:
        """Get total tokens used over time range."""
        query = f'sum(rate(total_tokens_total[{time_range}])) * 3600'
        result = await self.query(query)
        
        if result and result.get("result"):
            return int(float(result["result"][0]["value"][1]))
        return 0
    
    async def get_total_tool_calls(self, time_range: str = "1h") -> int:
        """Get total tool calls over time range."""
        query = f'sum(rate(tool_calls_total[{time_range}])) * 3600'
        result = await self.query(query)
        
        if result and result.get("result"):
            return int(float(result["result"][0]["value"][1]))
        return 0
    
    async def get_avg_execution_duration(self, time_range: str = "1h") -> float:
        """Get average execution duration over time range."""
        query = f'avg(rate(execution_duration_sum[{time_range}]) / rate(execution_duration_count[{time_range}]))'
        result = await self.query(query)
        
        if result and result.get("result"):
            return float(result["result"][0]["value"][1])
        return 0.0
    
    async def get_metrics_by_agent(self, time_range: str = "1h") -> List[Dict[str, Any]]:
        """Get metrics grouped by agent_id."""
        queries = {
            "cost": f'sum by (agent_id) (rate(total_cost_total[{time_range}])) * 3600',
            "tokens": f'sum by (agent_id) (rate(total_tokens_total[{time_range}])) * 3600',
            "tool_calls": f'sum by (agent_id) (rate(tool_calls_total[{time_range}])) * 3600',
            "duration": f'avg by (agent_id) (rate(execution_duration_sum[{time_range}]) / rate(execution_duration_count[{time_range}]))',
        }
        
        metrics_by_agent = {}
        
        for metric_name, query in queries.items():
            result = await self.query(query)
            if result and result.get("result"):
                for item in result["result"]:
                    agent_id = item["metric"].get("agent_id", "unknown")
                    if agent_id not in metrics_by_agent:
                        metrics_by_agent[agent_id] = {"agent_id": agent_id}
                    metrics_by_agent[agent_id][metric_name] = float(item["value"][1])
        
        return list(metrics_by_agent.values())
    
    async def get_metrics_time_series(
        self,
        hours: int = 24,
        step: str = "5m"
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Get time series data for all metrics."""
        end = datetime.now()
        start = end - timedelta(hours=hours)
        
        queries = {
            "cost": 'sum(rate(total_cost_total[5m])) * 300',
            "tokens": 'sum(rate(total_tokens_total[5m])) * 300',
            "tool_calls": 'sum(rate(tool_calls_total[5m])) * 300',
            "duration": 'avg(rate(execution_duration_sum[5m]) / rate(execution_duration_count[5m]))',
        }
        
        time_series = {}
        
        for metric_name, query in queries.items():
            result = await self.query_range(query, start, end, step)
            if result and result.get("result"):
                time_series[metric_name] = []
                for item in result["result"]:
                    for timestamp, value in item["values"]:
                        time_series[metric_name].append({
                            "timestamp": datetime.fromtimestamp(timestamp).isoformat(),
                            "value": float(value)
                        })
        
        return time_series
