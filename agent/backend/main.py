import logging
import sys
import time
import uuid
import os
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
from prometheus_client import make_asgi_app
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from agent.backend.prometheus.client import PrometheusClient
from copilotkit.integrations.fastapi import add_fastapi_endpoint
from copilotkit import CopilotKitSDK, Action

from agent.backend.instrument import instrument
from agent.backend.agents.orchestrator.agent import call_agent
from agent.backend.types.types import (
    AgentCallRequest, QueryRequest, QueryResponse, 
    Photo, PhotoUploadResponse,
    MetricsSummary, AgentMetrics, AgentMetricsResponse,
    TimeSeriesPoint, TimeSeriesData, TimeSeriesResponse
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

# --- CopilotKit SDK Setup ---
async def query_agent_action(question: str) -> str:
    """Process a user query through the orchestrator agent."""
    logger.info(f"CopilotKit action called with question: {question}")
    try:
        session_id = str(uuid.uuid4())
        agent_resp = await call_agent(
            req=AgentCallRequest(
                question=question,
                session_id=session_id,
            ),
        )
        return agent_resp.answer if agent_resp and agent_resp.answer else "I couldn't generate a response."
    except Exception as e:
        logger.error(f"Error in CopilotKit action: {e}", exc_info=True)
        return f"Error processing your question: {str(e)}"

sdk = CopilotKitSDK(
    actions=[
        Action(
            name="queryAgent",
            description="Query the AI orchestrator agent to help with driver's license related questions, scheduling appointments, and general assistance.",
            handler=query_agent_action,
            parameters=[
                {
                    "name": "question",
                    "type": "string",
                    "description": "The user's question or request",
                    "required": True
                }
            ]
        ),
    ],
)

# Add CopilotKit endpoint
add_fastapi_endpoint(app, sdk, "/copilotkit")

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
        range_seconds = _parse_time_range(time_range)
        
        # Query total tokens (prompt + completion)
        tokens_query = f'sum(increase(adk_llm_tokens_total[{time_range}])) or vector(0)'
        tokens_result = await prometheus_client.query(tokens_query)
        total_tokens = 0
        if tokens_result and tokens_result.get("result"):
            for r in tokens_result["result"]:
                val = float(r["value"][1]) if r.get("value") else 0
                total_tokens += int(val)
        
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
                val = float(r["value"][1]) if r.get("value") else 0
                if val > 0:
                    avg_duration = val
                    break
        
        # Estimate cost based on tokens (rough estimation: $0.00001 per token)
        cost_per_token = 0.00001
        total_cost = total_tokens * cost_per_token
        
        return MetricsSummary(
            total_cost=total_cost,
            total_tokens=total_tokens,
            total_tool_calls=total_tool_calls,
            avg_execution_duration=avg_duration,
            time_range=time_range
        )
        
    except Exception as e:
        logger.error(f"Error fetching metrics summary: {e}", exc_info=True)
        # Return zeros on error
        return MetricsSummary(
            total_cost=0.0,
            total_tokens=0,
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
                val = float(r["value"][1]) if r.get("value") else 0
                if agent_name not in agents_data:
                    agents_data[agent_name] = AgentMetrics(agent_id=agent_name)
                agents_data[agent_name].duration = val
        
        # Query tool calls (grouped by tool, we aggregate)
        tool_query = f'sum(increase(adk_tool_calls_total[{time_range}])) or vector(0)'
        tool_result = await prometheus_client.query(tool_query)
        total_tool_calls = 0
        if tool_result and tool_result.get("result"):
            for r in tool_result["result"]:
                val = float(r["value"][1]) if r.get("value") else 0
                total_tool_calls = int(val)
        
        # Query tokens by model
        tokens_query = f'sum(increase(adk_llm_tokens_total[{time_range}])) or vector(0)'
        tokens_result = await prometheus_client.query(tokens_query)
        total_tokens = 0
        if tokens_result and tokens_result.get("result"):
            for r in tokens_result["result"]:
                val = float(r["value"][1]) if r.get("value") else 0
                total_tokens = int(val)
        
        # Distribute tokens and tool calls proportionally across agents
        # TODO: label tool call metrics with agent_name (currently not supported by ADK)
        num_agents = len(agents_data) or 1
        for agent in agents_data.values():
            agent.tokens = total_tokens // num_agents
            agent.tool_calls = total_tool_calls // num_agents
            agent.cost = agent.tokens * 0.00001
        
        return AgentMetricsResponse(
            agents=list(agents_data.values()),
            time_range=time_range
        )
        
    except Exception as e:
        logger.error(f"Error fetching agent metrics: {e}", exc_info=True)
        return AgentMetricsResponse(agents=[], time_range=time_range)


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
        
        # Tokens over time
        tokens_query = 'sum(rate(adk_llm_tokens_total[5m])) or vector(0)'
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
        
        # Cost over time (derived from tokens)
        for point in time_series.tokens:
            time_series.cost.append(TimeSeriesPoint(
                timestamp=point.timestamp,
                value=point.value * 0.00001
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


if __name__ == "__main__":
    logger.info("="*60)
    logger.info("Starting Agent API Server")
    logger.info("="*60)
    logger.info("Running server on http://0.0.0.0:8000")
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
