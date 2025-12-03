import logging
import math
import sys
import time
import uuid
import os
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from prometheus_client import make_asgi_app
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from agent.backend.prometheus.client import PrometheusClient

from agent.backend.instrument import instrument
from agent.backend.agents.orchestrator.agent import call_agent
from agent.backend.types.types import (
    AgentCallRequest, QueryRequest, QueryResponse, 
    Photo, PhotoUploadResponse,
    MetricsSummary, AgentMetrics, AgentMetricsResponse,
    TimeSeriesPoint, TimeSeriesData, TimeSeriesResponse,
    AgentConfigInfo, AgentConfigResponse,
    ToolMetrics, AgentDetailMetrics, AgentDetailResponse
)
from agent.backend.database.photo import MockPhotoDatabase
from agent.backend.photo.classification import classify_photo
from config import UPLOAD_DIR


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


logger.info("Initializing FastAPI application")
app = FastAPI(
    title="Orchestrator agent API",
    description="HTTP API for the Orchestrator Agent",
    version="1.0.0",
)
logger.info("FastAPI application initialized")

# Create metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Instrument FastAPI
FastAPIInstrumentor.instrument_app(app)

prometheus_client = PrometheusClient()

# Instrument ADK
instrument()


def _safe_float(val: float, default: float = 0.0) -> float:
    """Return default if val is NaN or infinite."""
    if math.isnan(val) or math.isinf(val):
        return default
    return val


logger.info("Adding CORS middleware")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("CORS middleware added successfully")

# Initialize photo database
photo_db = MockPhotoDatabase()
photo_db.connect()

# Create uploads directory
PHOTO_UPLOAD_PATH = Path(UPLOAD_DIR)
PHOTO_UPLOAD_PATH.mkdir(exist_ok=True)
logger.info(f"Photo upload directory: {PHOTO_UPLOAD_PATH.absolute()}")


@app.post("/query", response_model=QueryResponse)
async def query_agent(request: QueryRequest):
    """Process a user query through the orchestrator agent.
    
    Args:
        request: QueryRequest containing the question and optional session_id
        
    Returns:
        QueryResponse with the agent's answer and session information
        
    Raises:
        HTTPException: If query processing fails
    """
    logger.info("="*60)
    logger.info("Query endpoint called")
    logger.info(f"Question: {request.question}")
    
    try:
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        logger.info(f"Session ID: {session_id}")

        logger.info("Calling agent with question, context, and products data")
        while True:
            logger.info("Invoking call_agent function")
            agent_resp = await call_agent(
                req=AgentCallRequest(
                    question=request.question,
                    session_id=session_id,
                ),
            )

            if not agent_resp.answer and not agent_resp.function_payloads:
                logger.warning("Agent returned no answer and no function payloads, retrying...")
                time.sleep(1)  # Brief pause before retrying
            else:
                logger.info("Agent returned a valid response")
                break

        # TODO: handle function_payloads if needed

        logger.info("Agent response received")
        # logger.info(f"Agent answer: {agent_resp.answer if agent_resp else 'No response'}")
        logger.info(f"Function payloads count: {len(agent_resp.function_payloads) if agent_resp.function_payloads else 0}")

        logger.info("Building query response")
        response = QueryResponse(
            response=agent_resp.answer if agent_resp else "No response generated",
            status="success",
            session_id=session_id,
        )
        logger.info("Query completed successfully")
        logger.info("="*60)
        
        return response
        
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


@app.post("/upload-photo", response_model=PhotoUploadResponse)
async def upload_photo(file: UploadFile = File(...)):
    """Upload and classify a photo (passport or driver's license).
    
    Args:
        file: Uploaded image file
        
    Returns:
        PhotoUploadResponse with classification and metadata
        
    Raises:
        HTTPException: If upload or processing fails
    """
    logger.info(f"Photo upload endpoint called: {file.filename}")
    
    try:
        contents = await file.read()
        file_size = len(contents)
        
        # Classify the photo
        classification = classify_photo(contents)
        logger.info(f"Photo classified as: {classification.value}")
        
        # Generate unique filename and save to disk
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename or "photo").suffix or ".jpg"
        saved_filename = f"{file_id}{file_extension}"
        file_path = PHOTO_UPLOAD_PATH / saved_filename
        
        with open(file_path, "wb") as f:
            f.write(contents)
        logger.info(f"Photo saved to: {file_path}")
        
        # Save to database
        photo = Photo(
            filename=file.filename or "unknown",
            classification=classification,
            size=file_size,
            content_type=file.content_type or "application/octet-stream",
            file_path=str(file_path),
            uploaded_at=datetime.now()
        )
        saved_photo = photo_db.save_photo(photo)
        
        logger.info(f"Photo uploaded successfully: {file.filename} ({file_size} bytes)")
        
        return PhotoUploadResponse(
            status="success",
            id=saved_photo.id or "",
            filename=saved_photo.filename,
            classification=saved_photo.classification,
            size=saved_photo.size,
            content_type=saved_photo.content_type
        )
        
    except Exception as e:
        logger.error(f"Error uploading photo: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error uploading photo: {str(e)}")


# --- Metrics Endpoints ---

def _parse_time_range(time_range: str) -> int:
    """Convert time range string (e.g., '1h', '24h', '7d') to seconds."""
    unit = time_range[-1].lower()
    value = int(time_range[:-1])
    if unit == 'h':
        return value * 3600
    elif unit == 'd':
        return value * 86400
    elif unit == 'm':
        return value * 60
    return 3600  # Default 1 hour


@app.get("/api/metrics/summary", response_model=MetricsSummary)
async def get_metrics_summary(time_range: str = "1h"):
    """Get summary of key metrics over a time range.
    
    Args:
        time_range: Time range string (e.g., '1h', '24h', '7d')
        
    Returns:
        MetricsSummary with totals and averages
    """
    logger.info(f"Fetching metrics summary for time_range={time_range}")
    
    try:
        # Query total agent runs
        runs_query = f'sum(increase(adk_agent_runs_total[{time_range}])) or vector(0)'
        runs_result = await prometheus_client.query(runs_query)
        total_runs = 0
        if runs_result and runs_result.get("result"):
            for r in runs_result["result"]:
                val = float(r["value"][1]) if r.get("value") else 0
                total_runs += int(val)
        
        # Query total tool calls
        tool_calls_query = f'sum(increase(adk_tool_calls_total[{time_range}])) or vector(0)'
        tool_calls_result = await prometheus_client.query(tool_calls_query)
        total_tool_calls = 0
        if tool_calls_result and tool_calls_result.get("result"):
            for r in tool_calls_result["result"]:
                val = float(r["value"][1]) if r.get("value") else 0
                total_tool_calls += int(val)
        
        # Query average agent execution duration
        duration_query = f'avg(rate(adk_agent_run_duration_seconds_sum[{time_range}]) / rate(adk_agent_run_duration_seconds_count[{time_range}])) or vector(0)'
        duration_result = await prometheus_client.query(duration_query)
        avg_duration = 0.0
        if duration_result and duration_result.get("result"):
            for r in duration_result["result"]:
                val = _safe_float(float(r["value"][1])) if r.get("value") else 0.0
                if val > 0:
                    avg_duration = val
                    break
        
        # Query total cost from the actual cost metric
        cost_query = f'sum(increase(adk_llm_cost_dollars_total[{time_range}])) or vector(0)'
        cost_result = await prometheus_client.query(cost_query)
        total_cost = 0.0
        if cost_result and cost_result.get("result"):
            for r in cost_result["result"]:
                val = float(r["value"][1]) if r.get("value") else 0
                total_cost += val
        
        return MetricsSummary(
            total_cost=total_cost,
            total_runs=total_runs,
            total_tool_calls=total_tool_calls,
            avg_execution_duration=avg_duration,
            time_range=time_range
        )
        
    except Exception as e:
        logger.error(f"Error fetching metrics summary: {e}", exc_info=True)
        # Return zeros on error
        return MetricsSummary(
            total_cost=0.0,
            total_runs=0,
            total_tool_calls=0,
            avg_execution_duration=0.0,
            time_range=time_range
        )


@app.get("/api/metrics/by-agent", response_model=AgentMetricsResponse)
async def get_metrics_by_agent(time_range: str = "1h"):
    """Get metrics broken down by agent.
    
    Args:
        time_range: Time range string (e.g., '1h', '24h', '7d')
        
    Returns:
        AgentMetricsResponse with per-agent metrics
    """
    logger.info(f"Fetching metrics by agent for time_range={time_range}")
    
    try:
        agents_data: dict[str, AgentMetrics] = {}
        
        # Query agent runs by agent name
        runs_query = f'sum by (agent_name) (increase(adk_agent_runs_total[{time_range}]))'
        runs_result = await prometheus_client.query(runs_query)
        if runs_result and runs_result.get("result"):
            for r in runs_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                if agent_name not in agents_data:
                    agents_data[agent_name] = AgentMetrics(agent_id=agent_name)
        
        # Query agent duration by agent name
        duration_query = f'avg by (agent_name) (rate(adk_agent_run_duration_seconds_sum[{time_range}]) / rate(adk_agent_run_duration_seconds_count[{time_range}]))'
        duration_result = await prometheus_client.query(duration_query)
        if duration_result and duration_result.get("result"):
            for r in duration_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                val = _safe_float(float(r["value"][1])) if r.get("value") else 0.0
                if agent_name not in agents_data:
                    agents_data[agent_name] = AgentMetrics(agent_id=agent_name)
                agents_data[agent_name].duration = val
        
        # Query tool calls by agent_name
        tool_query = f'sum by (agent_name) (increase(adk_tool_calls_total[{time_range}]))'
        tool_result = await prometheus_client.query(tool_query)
        if tool_result and tool_result.get("result"):
            for r in tool_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                val = float(r["value"][1]) if r.get("value") else 0
                if agent_name not in agents_data:
                    agents_data[agent_name] = AgentMetrics(agent_id=agent_name)
                agents_data[agent_name].tool_calls = int(val)
        
        # Query LLM requests by agent_name
        llm_requests_query = f'sum by (agent_name) (increase(adk_llm_requests_total[{time_range}]))'
        llm_result = await prometheus_client.query(llm_requests_query)
        if llm_result and llm_result.get("result"):
            for r in llm_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                val = float(r["value"][1]) if r.get("value") else 0
                if agent_name not in agents_data:
                    agents_data[agent_name] = AgentMetrics(agent_id=agent_name)
                agents_data[agent_name].llm_requests = int(val)
        
        # Query tokens by agent_name (now available with agent_name label!)
        tokens_query = f'sum by (agent_name) (increase(adk_llm_tokens_total{{type="total"}}[{time_range}]))'
        tokens_result = await prometheus_client.query(tokens_query)
        if tokens_result and tokens_result.get("result"):
            for r in tokens_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                val = float(r["value"][1]) if r.get("value") else 0
                if agent_name not in agents_data:
                    agents_data[agent_name] = AgentMetrics(agent_id=agent_name)
                agents_data[agent_name].tokens = int(val)
        
        # Query cost by agent_name (now available with agent_name label!)
        cost_query = f'sum by (agent_name) (increase(adk_llm_cost_dollars_total[{time_range}]))'
        cost_result = await prometheus_client.query(cost_query)
        if cost_result and cost_result.get("result"):
            for r in cost_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                val = float(r["value"][1]) if r.get("value") else 0
                if agent_name not in agents_data:
                    agents_data[agent_name] = AgentMetrics(agent_id=agent_name)
                agents_data[agent_name].cost = val
        
        return AgentMetricsResponse(
            agents=list(agents_data.values()),
            time_range=time_range
        )
        
    except Exception as e:
        logger.error(f"Error fetching agent metrics: {e}", exc_info=True)
        return AgentMetricsResponse(agents=[], time_range=time_range)


@app.get("/api/metrics/agents/detail", response_model=AgentDetailResponse)
async def get_agent_detail_metrics(time_range: str = "1h"):
    """Get detailed metrics for each agent including tool breakdown.
    
    Args:
        time_range: Time range string (e.g., '1h', '24h', '7d')
        
    Returns:
        AgentDetailResponse with per-agent metrics and tool breakdown
    """
    logger.info(f"Fetching detailed agent metrics for time_range={time_range}")
    
    try:
        # First get static agent info (model, tools)
        agents_config: dict[str, AgentDetailMetrics] = {}
        
        # Query agent model info
        model_query = 'adk_agent_model_info'
        model_result = await prometheus_client.query(model_query)
        if model_result and model_result.get("result"):
            for r in model_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                model = r["metric"].get("model", "unknown")
                if agent_name not in agents_config:
                    agents_config[agent_name] = AgentDetailMetrics(name=agent_name, model=model)
                else:
                    agents_config[agent_name].model = model
        
        # Query cost by agent
        cost_query = f'sum by (agent_name) (increase(adk_llm_cost_dollars_total[{time_range}]))'
        cost_result = await prometheus_client.query(cost_query)
        if cost_result and cost_result.get("result"):
            for r in cost_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                val = float(r["value"][1]) if r.get("value") else 0
                if agent_name in agents_config:
                    agents_config[agent_name].cost = val
        
        # Query runs by agent
        runs_query = f'sum by (agent_name) (increase(adk_agent_runs_total[{time_range}]))'
        runs_result = await prometheus_client.query(runs_query)
        if runs_result and runs_result.get("result"):
            for r in runs_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                val = float(r["value"][1]) if r.get("value") else 0
                if agent_name in agents_config:
                    agents_config[agent_name].runs = int(val)
        
        # Query avg duration by agent
        duration_query = f'avg by (agent_name) (rate(adk_agent_run_duration_seconds_sum[{time_range}]) / rate(adk_agent_run_duration_seconds_count[{time_range}]))'
        duration_result = await prometheus_client.query(duration_query)
        if duration_result and duration_result.get("result"):
            for r in duration_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                val = _safe_float(float(r["value"][1])) if r.get("value") else 0.0
                if agent_name in agents_config:
                    agents_config[agent_name].avg_duration = val
        
        # Query tool calls by agent and tool
        tool_calls_query = f'sum by (agent_name, tool_name) (increase(adk_tool_calls_total[{time_range}]))'
        tool_calls_result = await prometheus_client.query(tool_calls_query)
        if tool_calls_result and tool_calls_result.get("result"):
            for r in tool_calls_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                tool_name = r["metric"].get("tool_name", "unknown")
                val = float(r["value"][1]) if r.get("value") else 0
                if agent_name in agents_config:
                    # Find or create tool metrics
                    tool_metrics = next(
                        (t for t in agents_config[agent_name].tools if t.name == tool_name),
                        None
                    )
                    if not tool_metrics:
                        tool_metrics = ToolMetrics(name=tool_name)
                        agents_config[agent_name].tools.append(tool_metrics)
                    tool_metrics.calls = int(val)
        
        # Query tool avg duration by agent and tool
        tool_duration_query = f'avg by (agent_name, tool_name) (rate(adk_tool_call_duration_seconds_sum[{time_range}]) / rate(adk_tool_call_duration_seconds_count[{time_range}]))'
        tool_duration_result = await prometheus_client.query(tool_duration_query)
        if tool_duration_result and tool_duration_result.get("result"):
            for r in tool_duration_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                tool_name = r["metric"].get("tool_name", "unknown")
                val = _safe_float(float(r["value"][1])) if r.get("value") else 0.0
                if agent_name in agents_config:
                    tool_metrics = next(
                        (t for t in agents_config[agent_name].tools if t.name == tool_name),
                        None
                    )
                    if tool_metrics:
                        tool_metrics.avg_duration = val
        
        return AgentDetailResponse(
            agents=list(agents_config.values()),
            time_range=time_range
        )
        
    except Exception as e:
        logger.error(f"Error fetching agent detail metrics: {e}", exc_info=True)
        return AgentDetailResponse(agents=[], time_range=time_range)


@app.get("/api/metrics/time-series", response_model=TimeSeriesResponse)
async def get_metrics_time_series(hours: int = 24, step: str = "5m"):
    """Get time series data for metrics.
    
    Args:
        hours: Number of hours of history to fetch
        step: Resolution step (e.g., '1m', '5m', '15m')
        
    Returns:
        TimeSeriesResponse with time series for each metric
    """
    logger.info(f"Fetching time series metrics for hours={hours}, step={step}")
    
    try:
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        
        time_series = TimeSeriesData()
        
        # Tokens over time (using type="total" to avoid double counting)
        tokens_query = 'sum(rate(adk_llm_tokens_total{type="total"}[5m])) or vector(0)'
        tokens_result = await prometheus_client.query_range(tokens_query, start_time, end_time, step)
        if tokens_result and tokens_result.get("result"):
            for series in tokens_result["result"]:
                for ts, val in series.get("values", []):
                    time_series.tokens.append(TimeSeriesPoint(
                        timestamp=datetime.fromtimestamp(ts).isoformat(),
                        value=float(val)
                    ))
        
        # Tool calls over time
        tool_query = 'sum(rate(adk_tool_calls_total[5m])) or vector(0)'
        tool_result = await prometheus_client.query_range(tool_query, start_time, end_time, step)
        if tool_result and tool_result.get("result"):
            for series in tool_result["result"]:
                for ts, val in series.get("values", []):
                    time_series.tool_calls.append(TimeSeriesPoint(
                        timestamp=datetime.fromtimestamp(ts).isoformat(),
                        value=float(val)
                    ))
        
        # Duration over time
        duration_query = 'avg(rate(adk_agent_run_duration_seconds_sum[5m]) / rate(adk_agent_run_duration_seconds_count[5m])) or vector(0)'
        duration_result = await prometheus_client.query_range(duration_query, start_time, end_time, step)
        if duration_result and duration_result.get("result"):
            for series in duration_result["result"]:
                for ts, val in series.get("values", []):
                    val_float = float(val) if val != "NaN" else 0.0
                    time_series.duration.append(TimeSeriesPoint(
                        timestamp=datetime.fromtimestamp(ts).isoformat(),
                        value=val_float
                    ))
        
        # Cost over time (from actual cost metric)
        cost_query = 'sum(rate(adk_llm_cost_dollars_total[5m])) or vector(0)'
        cost_result = await prometheus_client.query_range(cost_query, start_time, end_time, step)
        if cost_result and cost_result.get("result"):
            for series in cost_result["result"]:
                for ts, val in series.get("values", []):
                    time_series.cost.append(TimeSeriesPoint(
                        timestamp=datetime.fromtimestamp(ts).isoformat(),
                        value=float(val) if val != "NaN" else 0.0
                    ))
        
        return TimeSeriesResponse(
            time_series=time_series,
            hours=hours,
            step=step
        )
        
    except Exception as e:
        logger.error(f"Error fetching time series: {e}", exc_info=True)
        return TimeSeriesResponse(
            time_series=TimeSeriesData(),
            hours=hours,
            step=step
        )


@app.get("/api/agents/info", response_model=AgentConfigResponse)
async def get_agents_config():
    """Get static configuration info for all agents (tools and models).
    
    Returns:
        AgentConfigResponse with agent names, models, and tools
    """
    logger.info("Fetching agent configuration")
    
    try:
        agents_config: dict[str, AgentConfigInfo] = {}
        
        # Query agent tool info
        tool_query = 'adk_agent_tool_info'
        tool_result = await prometheus_client.query(tool_query)
        if tool_result and tool_result.get("result"):
            for r in tool_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                tool_name = r["metric"].get("tool_name", "")
                if agent_name not in agents_config:
                    agents_config[agent_name] = AgentConfigInfo(name=agent_name, model="", tools=[])
                if tool_name:
                    agents_config[agent_name].tools.append(tool_name)
        
        # Query agent model info
        model_query = 'adk_agent_model_info'
        model_result = await prometheus_client.query(model_query)
        if model_result and model_result.get("result"):
            for r in model_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                model = r["metric"].get("model", "unknown")
                if agent_name not in agents_config:
                    agents_config[agent_name] = AgentConfigInfo(name=agent_name, model=model, tools=[])
                else:
                    agents_config[agent_name].model = model
        
        return AgentConfigResponse(agents=list(agents_config.values()))
        
    except Exception as e:
        logger.error(f"Error fetching agent config: {e}", exc_info=True)
        return AgentConfigResponse(agents=[])


if __name__ == "__main__":
    logger.info("="*60)
    logger.info("Starting Agent API Server")
    logger.info("="*60)
    logger.info("Running server on http://0.0.0.0:8000")
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
