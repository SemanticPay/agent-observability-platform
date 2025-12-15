import logging
import math
import sys
import time
import uuid
import os
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from prometheus_client import make_asgi_app
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from agent.backend.prometheus.client import PrometheusClient

from agent.backend.instrument import instrument
from agent.backend.agents.orchestrator.agent import call_agent
from agent.backend.copilotkit_agent import copilotkit_app, adk_copilot_agent
from agent.backend.types.types import (
    AgentCallRequest, QueryRequest, QueryResponse, 
    Photo, PhotoUploadResponse,
    MetricsSummary, AgentMetrics, AgentMetricsResponse,
    TimeSeriesPoint, TimeSeriesData, TimeSeriesResponse,
    AgentInfo, AgentInfoResponse,
    ToolMetrics, AgentDetailMetrics, AgentDetailResponse,
    ConversationMetrics
)
from agent.backend.database.photo import MockPhotoDatabase
from agent.backend.photo.classification import classify_photo
from agent.backend.routes.auth import router as auth_router
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

# Mount API routers
app.include_router(auth_router)
logger.info("Auth router mounted at /api/v1/auth")

# Create metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Mount CopilotKit AG-UI endpoint
logger.info("Mounting CopilotKit AG-UI endpoint at /copilot")
app.mount("/copilot", copilotkit_app)

# Add a simplified CopilotKit endpoint for direct frontend communication
@app.post("/api/copilotkit")
async def copilotkit_endpoint(request: Request):
    """CopilotKit-compatible endpoint using AG-UI protocol."""
    from fastapi.responses import StreamingResponse
    import json
    
    try:
        body = await request.json()
        logger.info(f"CopilotKit request received")
        
        # Check if this is AG-UI protocol (has "data" at top level with messages)
        # or GraphQL protocol (has "operationName")
        operation_name = body.get("operationName")
        
        if operation_name:
            # GraphQL protocol
            logger.info(f"GraphQL operation: {operation_name}")
            if operation_name == "availableAgents":
                return {
                    "data": {
                        "availableAgents": {
                            "agents": [{
                                "name": "orchestrator_agent",
                                "id": "orchestrator_agent", 
                                "description": "A citizen services assistant",
                                "__typename": "Agent"
                            }],
                            "__typename": "AvailableAgents"
                        }
                    }
                }
            elif operation_name == "loadAgentState":
                return {"data": {"loadAgentState": None}}
            elif operation_name == "generateCopilotResponse":
                # Extract data from GraphQL mutation
                variables = body.get("variables", {})
                data = variables.get("data", {})
                messages = data.get("messages", [])
                thread_id = data.get("threadId", str(uuid.uuid4()))
                
                logger.info(f"GraphQL generateCopilotResponse - Thread: {thread_id}, Messages: {len(messages)}")
                
                # Extract user messages
                user_messages = []
                for msg in messages:
                    text_msg = msg.get("textMessage", {})
                    if text_msg.get("role") == "user":
                        user_messages.append(text_msg.get("content", ""))
                
                if not user_messages:
                    logger.warning("No user messages in GraphQL request")
                    return {"data": {"generateCopilotResponse": None}}
                
                question = user_messages[-1]
                logger.info(f"User question: {question}")
                
                # Call agent and return streaming response
                async def generate_graphql_sse():
                    import asyncio
                    import json as json_mod
                    
                    message_id = str(uuid.uuid4())
                    run_id = str(uuid.uuid4())
                    created_at = datetime.now().isoformat() + "Z"
                    
                    try:
                        # Call the agent
                        logger.info("Calling agent...")
                        response = await call_agent(
                            AgentCallRequest(
                                question=question,
                                session_id=thread_id
                            )
                        )
                        logger.info(f"Agent response: {len(response.answer)} chars")
                        
                        # Stream word by word
                        words = response.answer.split()
                        current_content = ""
                        
                        for word in words:
                            current_content += word + " "
                            chunk = {
                                "data": {
                                    "generateCopilotResponse": {
                                        "threadId": thread_id,
                                        "runId": run_id,
                                        "messages": [{
                                            "__typename": "TextMessageOutput",
                                            "id": message_id,
                                            "createdAt": created_at,
                                            "content": current_content.strip(),
                                            "role": "assistant"
                                        }],
                                        "__typename": "CopilotResponse"
                                    }
                                }
                            }
                            yield f"data: {json_mod.dumps(chunk)}\n\n"
                            await asyncio.sleep(0.02)
                        
                        # Final message
                        final = {
                            "data": {
                                "generateCopilotResponse": {
                                    "threadId": thread_id,
                                    "runId": run_id,
                                    "messages": [{
                                        "__typename": "TextMessageOutput",
                                        "id": message_id,
                                        "createdAt": created_at,
                                        "content": response.answer,
                                        "role": "assistant",
                                        "status": {"__typename": "SuccessMessageStatus"}
                                    }],
                                    "status": {"__typename": "SuccessResponseStatus"},
                                    "__typename": "CopilotResponse"
                                }
                            }
                        }
                        yield f"data: {json_mod.dumps(final)}\n\n"
                        logger.info("GraphQL SSE complete")
                        
                    except Exception as e:
                        logger.error(f"Error: {e}", exc_info=True)
                        yield f"data: {json_mod.dumps({'errors': [{'message': str(e)}]})}\n\n"
                
                return StreamingResponse(
                    generate_graphql_sse(),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
                )
            else:
                logger.warning(f"Unknown GraphQL operation: {operation_name}")
                return {"data": None}
        
        # AG-UI protocol - data is at top level
        data = body.get("data", {})
        messages = data.get("messages", [])
        thread_id = data.get("threadId", str(uuid.uuid4()))
        
        logger.info(f"AG-UI request - Thread: {thread_id}, Messages: {len(messages)}")
        
        # Extract user messages
        user_messages = []
        for msg in messages:
            text_msg = msg.get("textMessage", {})
            if text_msg.get("role") == "user":
                user_messages.append(text_msg.get("content", ""))
        
        if not user_messages:
            logger.warning("No user messages found")
            return {"type": "error", "error": "No user message found"}
        
        question = user_messages[-1]
        logger.info(f"User question: {question}")
        
        # Stream response using AG-UI Server-Sent Events format
        async def generate_agui_response():
            try:
                import asyncio
                
                # Generate IDs
                message_id = str(uuid.uuid4())
                run_id = str(uuid.uuid4())
                
                # 1. Send run started event
                yield f"data: {json.dumps({'type': 'run_started', 'runId': run_id, 'threadId': thread_id})}\n\n"
                
                # 2. Send text message start
                yield f"data: {json.dumps({'type': 'text_message_start', 'messageId': message_id, 'role': 'assistant'})}\n\n"
                
                # Call the agent
                logger.info("Calling agent...")
                response = await call_agent(
                    AgentCallRequest(
                        question=question,
                        session_id=thread_id
                    )
                )
                logger.info(f"Agent response: {len(response.answer)} chars")
                
                # 3. Stream content in chunks
                words = response.answer.split()
                for i, word in enumerate(words):
                    chunk = word + (" " if i < len(words) - 1 else "")
                    yield f"data: {json.dumps({'type': 'text_message_content', 'messageId': message_id, 'delta': chunk})}\n\n"
                    await asyncio.sleep(0.02)
                
                # 4. Send text message end
                yield f"data: {json.dumps({'type': 'text_message_end', 'messageId': message_id})}\n\n"
                
                # 5. Send run finished event
                yield f"data: {json.dumps({'type': 'run_finished', 'runId': run_id, 'threadId': thread_id})}\n\n"
                
                logger.info("AG-UI streaming response complete")
                
            except Exception as e:
                logger.error(f"Error in AG-UI response: {e}", exc_info=True)
                yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_agui_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
            
    except Exception as e:
        logger.error(f"CopilotKit endpoint error: {e}", exc_info=True)
        return {"type": "error", "error": str(e)}

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

        logger.info("Agent response received")
        logger.info(f"Function payloads count: {len(agent_resp.function_payloads) if agent_resp.function_payloads else 0}")

        # Process function payloads to extract data for frontend widgets
        widgets = []
        if agent_resp.function_payloads:
            clinics_data = None
            user_location = None
            
            for payload in agent_resp.function_payloads:
                logger.info(f"Processing payload: {payload.name}")
                
                # Extract clinic results
                if payload.name == "search_nearby_clinics" and payload.payload:
                    if isinstance(payload.payload, list):
                        clinics_data = payload.payload
                        logger.info(f"Found {len(clinics_data)} clinics in payload")
                    elif hasattr(payload.payload, '__iter__'):
                        clinics_data = list(payload.payload)
                        logger.info(f"Converted clinics payload to list: {len(clinics_data)} items")
                
                # Extract user location from geocoding
                if payload.name in ["set_location_from_coordinates", "geocode_location"] and payload.payload:
                    if isinstance(payload.payload, dict):
                        user_location = {
                            "lat": payload.payload.get("latitude"),
                            "lng": payload.payload.get("longitude")
                        }
                    elif hasattr(payload.payload, "latitude"):
                        user_location = {
                            "lat": payload.payload.latitude,
                            "lng": payload.payload.longitude
                        }
                    logger.info(f"Found user location: {user_location}")
            
            # Create clinics map widget if we have clinic data
            if clinics_data:
                widgets.append({
                    "type": "clinics_map",
                    "data": {
                        "clinics": clinics_data,
                        "userLocation": user_location
                    }
                })
                logger.info(f"Added clinics_map widget with {len(clinics_data)} clinics")

        logger.info("Building query response")
        response = QueryResponse(
            response=agent_resp.answer if agent_resp else "No response generated",
            status="success",
            session_id=session_id,
            widgets=widgets,
        )
        logger.info(f"Query completed successfully with {len(widgets)} widgets")
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
        
        # Query cost by agent - try increase() first, fall back to instant value
        cost_query = f'sum by (agent_name) (increase(adk_llm_cost_dollars_total[{time_range}]))'
        cost_result = await prometheus_client.query(cost_query)
        cost_found = False
        if cost_result and cost_result.get("result"):
            for r in cost_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                val = float(r["value"][1]) if r.get("value") else 0
                if agent_name in agents_config and val > 0:
                    agents_config[agent_name].cost = val
                    cost_found = True
        # Fallback: use instant counter values if increase() returned nothing
        if not cost_found:
            cost_instant_query = 'sum by (agent_name) (adk_llm_cost_dollars_total)'
            cost_instant_result = await prometheus_client.query(cost_instant_query)
            if cost_instant_result and cost_instant_result.get("result"):
                for r in cost_instant_result["result"]:
                    agent_name = r["metric"].get("agent_name", "unknown")
                    val = float(r["value"][1]) if r.get("value") else 0
                    if agent_name in agents_config:
                        agents_config[agent_name].cost = val
        
        # Query runs by agent - try increase() first, fall back to instant value
        runs_query = f'sum by (agent_name) (increase(adk_agent_runs_total[{time_range}]))'
        runs_result = await prometheus_client.query(runs_query)
        runs_found = False
        if runs_result and runs_result.get("result"):
            for r in runs_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                val = float(r["value"][1]) if r.get("value") else 0
                if agent_name in agents_config and val > 0:
                    agents_config[agent_name].runs = int(val)
                    runs_found = True
        # Fallback: use instant counter values
        if not runs_found:
            runs_instant_query = 'sum by (agent_name) (adk_agent_runs_total)'
            runs_instant_result = await prometheus_client.query(runs_instant_query)
            if runs_instant_result and runs_instant_result.get("result"):
                for r in runs_instant_result["result"]:
                    agent_name = r["metric"].get("agent_name", "unknown")
                    val = float(r["value"][1]) if r.get("value") else 0
                    if agent_name in agents_config:
                        agents_config[agent_name].runs = int(val)
        
        # Query agent success rate (successful runs / total runs from metric)
        success_rate_query = f'sum by (agent_name) (increase(adk_agent_runs_total{{status="success"}}[{time_range}])) / sum by (agent_name) (increase(adk_agent_runs_total[{time_range}]))'
        success_rate_result = await prometheus_client.query(success_rate_query)
        success_rate_found = False
        if success_rate_result and success_rate_result.get("result"):
            for r in success_rate_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                val = _safe_float(float(r["value"][1])) if r.get("value") else 0.0
                if agent_name in agents_config and val > 0:
                    agents_config[agent_name].success_rate = min(val, 1.0)
                    success_rate_found = True
        # Fallback: use instant counter values
        if not success_rate_found:
            success_rate_instant_query = 'sum by (agent_name) (adk_agent_runs_total{status="success"}) / sum by (agent_name) (adk_agent_runs_total)'
            success_rate_instant_result = await prometheus_client.query(success_rate_instant_query)
            if success_rate_instant_result and success_rate_instant_result.get("result"):
                for r in success_rate_instant_result["result"]:
                    agent_name = r["metric"].get("agent_name", "unknown")
                    val = _safe_float(float(r["value"][1])) if r.get("value") else 0.0
                    if agent_name in agents_config:
                        agents_config[agent_name].success_rate = min(val, 1.0)
        
        # Query avg duration by agent
        duration_query = f'avg by (agent_name) (rate(adk_agent_run_duration_seconds_sum[{time_range}]) / rate(adk_agent_run_duration_seconds_count[{time_range}]))'
        duration_result = await prometheus_client.query(duration_query)
        duration_found = False
        if duration_result and duration_result.get("result"):
            for r in duration_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                val = _safe_float(float(r["value"][1])) if r.get("value") else 0.0
                if agent_name in agents_config and val > 0:
                    agents_config[agent_name].avg_duration = val
                    duration_found = True
        # Fallback: use instant histogram values (sum/count gives average)
        if not duration_found:
            duration_instant_query = 'sum by (agent_name) (adk_agent_run_duration_seconds_sum) / sum by (agent_name) (adk_agent_run_duration_seconds_count)'
            duration_instant_result = await prometheus_client.query(duration_instant_query)
            if duration_instant_result and duration_instant_result.get("result"):
                for r in duration_instant_result["result"]:
                    agent_name = r["metric"].get("agent_name", "unknown")
                    val = _safe_float(float(r["value"][1])) if r.get("value") else 0.0
                    if agent_name in agents_config:
                        agents_config[agent_name].avg_duration = val
        
        # Query tool calls by agent and tool - try increase() first
        tool_calls_query = f'sum by (agent_name, tool_name) (increase(adk_tool_calls_total[{time_range}]))'
        tool_calls_result = await prometheus_client.query(tool_calls_query)
        tool_calls_found = False
        if tool_calls_result and tool_calls_result.get("result"):
            for r in tool_calls_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                tool_name = r["metric"].get("tool_name", "unknown")
                val = float(r["value"][1]) if r.get("value") else 0
                if agent_name in agents_config and val > 0:
                    tool_metrics = next(
                        (t for t in agents_config[agent_name].tools if t.name == tool_name),
                        None
                    )
                    if not tool_metrics:
                        tool_metrics = ToolMetrics(name=tool_name)
                        agents_config[agent_name].tools.append(tool_metrics)
                    tool_metrics.calls = int(val)
                    tool_calls_found = True
        # Fallback: use instant counter values
        if not tool_calls_found:
            tool_calls_instant_query = 'sum by (agent_name, tool_name) (adk_tool_calls_total)'
            tool_calls_instant_result = await prometheus_client.query(tool_calls_instant_query)
            if tool_calls_instant_result and tool_calls_instant_result.get("result"):
                for r in tool_calls_instant_result["result"]:
                    agent_name = r["metric"].get("agent_name", "unknown")
                    tool_name = r["metric"].get("tool_name", "unknown")
                    val = float(r["value"][1]) if r.get("value") else 0
                    if agent_name in agents_config:
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
        tool_duration_found = False
        if tool_duration_result and tool_duration_result.get("result"):
            for r in tool_duration_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                tool_name = r["metric"].get("tool_name", "unknown")
                val = _safe_float(float(r["value"][1])) if r.get("value") else 0.0
                if agent_name in agents_config and val > 0:
                    tool_metrics = next(
                        (t for t in agents_config[agent_name].tools if t.name == tool_name),
                        None
                    )
                    if tool_metrics:
                        tool_metrics.avg_duration = val
                        tool_duration_found = True
        # Fallback: use instant histogram values
        if not tool_duration_found:
            tool_duration_instant_query = 'sum by (agent_name, tool_name) (adk_tool_call_duration_seconds_sum) / sum by (agent_name, tool_name) (adk_tool_call_duration_seconds_count)'
            tool_duration_instant_result = await prometheus_client.query(tool_duration_instant_query)
            if tool_duration_instant_result and tool_duration_instant_result.get("result"):
                for r in tool_duration_instant_result["result"]:
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
        
        # Query tool success rate by agent and tool
        tool_success_query = f'sum by (agent_name, tool_name) (increase(adk_tool_calls_total{{status="success"}}[{time_range}])) / sum by (agent_name, tool_name) (increase(adk_tool_calls_total[{time_range}]))'
        tool_success_result = await prometheus_client.query(tool_success_query)
        tool_success_found = False
        if tool_success_result and tool_success_result.get("result"):
            for r in tool_success_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                tool_name = r["metric"].get("tool_name", "unknown")
                val = _safe_float(float(r["value"][1])) if r.get("value") else 0.0
                if agent_name in agents_config and val > 0:
                    tool_metrics = next(
                        (t for t in agents_config[agent_name].tools if t.name == tool_name),
                        None
                    )
                    if tool_metrics:
                        tool_metrics.success_rate = min(val, 1.0)
                        tool_success_found = True
        # Fallback: use instant counter values
        if not tool_success_found:
            tool_success_instant_query = 'sum by (agent_name, tool_name) (adk_tool_calls_total{status="success"}) / sum by (agent_name, tool_name) (adk_tool_calls_total)'
            tool_success_instant_result = await prometheus_client.query(tool_success_instant_query)
            if tool_success_instant_result and tool_success_instant_result.get("result"):
                for r in tool_success_instant_result["result"]:
                    agent_name = r["metric"].get("agent_name", "unknown")
                    tool_name = r["metric"].get("tool_name", "unknown")
                    val = _safe_float(float(r["value"][1])) if r.get("value") else 0.0
                    if agent_name in agents_config:
                        tool_metrics = next(
                            (t for t in agents_config[agent_name].tools if t.name == tool_name),
                            None
                        )
                        if tool_metrics:
                            tool_metrics.success_rate = min(val, 1.0)
        
        # Query agent workflows info
        workflows_query = 'adk_agent_workflows_info'
        workflows_result = await prometheus_client.query(workflows_query)
        if workflows_result and workflows_result.get("result"):
            for r in workflows_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                workflows_str = r["metric"].get("workflows", "")
                if agent_name in agents_config and workflows_str:
                    agents_config[agent_name].workflows = workflows_str.split(",")
        
        # Query agent subagents info
        subagents_query = 'adk_agent_subagents_info'
        subagents_result = await prometheus_client.query(subagents_query)
        if subagents_result and subagents_result.get("result"):
            for r in subagents_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                subagents_str = r["metric"].get("subagents", "")
                if agent_name in agents_config and subagents_str:
                    agents_config[agent_name].subagents = subagents_str.split(",")
        
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


@app.get("/api/agents/info", response_model=AgentInfoResponse)
async def get_agents_info():
    """Get static configuration info for all agents (tools, models, workflows).
    
    Returns:
        AgentInfoResponse with agent names, models, tools, and workflows
    """
    logger.info("Fetching agent configuration")
    
    try:
        agents_config: dict[str, AgentInfo] = {}
        
        # Query agent tool info
        tool_query = 'adk_agent_tool_info'
        tool_result = await prometheus_client.query(tool_query)
        if tool_result and tool_result.get("result"):
            for r in tool_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                tool_name = r["metric"].get("tool_name", "")
                if agent_name not in agents_config:
                    agents_config[agent_name] = AgentInfo(name=agent_name, model="", tools=[])
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
                    agents_config[agent_name] = AgentInfo(name=agent_name, model=model, tools=[])
                else:
                    agents_config[agent_name].model = model
        
        # Query agent workflows info
        workflows_query = 'adk_agent_workflows_info'
        workflows_result = await prometheus_client.query(workflows_query)
        if workflows_result and workflows_result.get("result"):
            for r in workflows_result["result"]:
                agent_name = r["metric"].get("agent_name", "unknown")
                workflows_str = r["metric"].get("workflows", "")
                if agent_name not in agents_config:
                    agents_config[agent_name] = AgentInfo(name=agent_name, model="", tools=[])
                if workflows_str:
                    agents_config[agent_name].workflows = workflows_str.split(",")
        
        return AgentInfoResponse(agents=list(agents_config.values()))
        
    except Exception as e:
        logger.error(f"Error fetching agent config: {e}", exc_info=True)
        return AgentInfoResponse(agents=[])


@app.get("/api/metrics/conversations", response_model=ConversationMetrics)
async def get_conversation_metrics(time_range: str = "1h"):
    """Get conversation-level metrics (averages per conversation).
    
    Args:
        time_range: Time range string (e.g., '1h', '24h', '7d')
        
    Returns:
        ConversationMetrics with averages per conversation
    """
    logger.info(f"Fetching conversation metrics for time_range={time_range}")
    
    try:
        # Query total conversations
        conversations_query = f'sum(increase(adk_conversations_total[{time_range}])) or vector(0)'
        conversations_result = await prometheus_client.query(conversations_query)
        total_conversations = 0
        if conversations_result and conversations_result.get("result"):
            for r in conversations_result["result"]:
                val = float(r["value"][1]) if r.get("value") else 0
                total_conversations = int(val)
        
        # Query total cost
        cost_query = f'sum(increase(adk_llm_cost_dollars_total[{time_range}])) or vector(0)'
        cost_result = await prometheus_client.query(cost_query)
        total_cost = 0.0
        if cost_result and cost_result.get("result"):
            for r in cost_result["result"]:
                val = float(r["value"][1]) if r.get("value") else 0
                total_cost = val
        
        # Query total agent runs
        runs_query = f'sum(increase(adk_agent_runs_total[{time_range}])) or vector(0)'
        runs_result = await prometheus_client.query(runs_query)
        total_runs = 0
        if runs_result and runs_result.get("result"):
            for r in runs_result["result"]:
                val = float(r["value"][1]) if r.get("value") else 0
                total_runs = int(val)
        
        # Query total tool calls
        tool_calls_query = f'sum(increase(adk_tool_calls_total[{time_range}])) or vector(0)'
        tool_calls_result = await prometheus_client.query(tool_calls_query)
        total_tool_calls = 0
        if tool_calls_result and tool_calls_result.get("result"):
            for r in tool_calls_result["result"]:
                val = float(r["value"][1]) if r.get("value") else 0
                total_tool_calls = int(val)
        
        # Calculate averages (avoid division by zero)
        avg_cost = total_cost / total_conversations if total_conversations > 0 else 0.0
        avg_runs = total_runs / total_conversations if total_conversations > 0 else 0.0
        avg_tool_calls = total_tool_calls / total_conversations if total_conversations > 0 else 0.0
        
        return ConversationMetrics(
            total_conversations=total_conversations,
            avg_cost_per_conversation=avg_cost,
            avg_runs_per_conversation=avg_runs,
            avg_tool_calls_per_conversation=avg_tool_calls,
            time_range=time_range
        )
        
    except Exception as e:
        logger.error(f"Error fetching conversation metrics: {e}", exc_info=True)
        return ConversationMetrics(time_range=time_range)


if __name__ == "__main__":
    logger.info("="*60)
    logger.info("Starting Agent API Server")
    logger.info("="*60)
    logger.info("Running server on http://0.0.0.0:8000")
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
