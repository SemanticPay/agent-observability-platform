import logging
import sys
import time
import uuid
import os
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from prometheus_client import make_asgi_app
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from agent.backend.agents.orchestrator.agent import call_agent
from agent.backend.types.types import (
    AgentCallRequest, QueryRequest, QueryResponse, 
    Photo, PhotoUploadResponse
)
from agent.backend.database.photo import MockPhotoDatabase
from agent.backend.photo.classification import classify_photo
from agent.backend.prometheus_client import PrometheusClient
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

# Initialize Prometheus client
prometheus_client = PrometheusClient()

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
        logger.info(f"Agent answer: {agent_resp.answer if agent_resp else 'No response'}")
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


@app.get("/api/metrics/summary")
async def get_metrics_summary(time_range: str = "1h"):
    """Get summary metrics from Prometheus."""
    try:
        summary = {
            "total_cost": await prometheus_client.get_total_cost(time_range),
            "total_tokens": await prometheus_client.get_total_tokens(time_range),
            "total_tool_calls": await prometheus_client.get_total_tool_calls(time_range),
            "avg_execution_duration": await prometheus_client.get_avg_execution_duration(time_range),
            "time_range": time_range
        }
        return summary
    except Exception as e:
        logger.error(f"Error fetching metrics summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching metrics: {str(e)}")


@app.get("/api/metrics/by-agent")
async def get_metrics_by_agent(time_range: str = "1h"):
    """Get metrics grouped by agent."""
    try:
        metrics = await prometheus_client.get_metrics_by_agent(time_range)
        return {"agents": metrics, "time_range": time_range}
    except Exception as e:
        logger.error(f"Error fetching agent metrics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching agent metrics: {str(e)}")


@app.get("/api/metrics/time-series")
async def get_metrics_time_series(hours: int = 24, step: str = "5m"):
    """Get time series data for metrics."""
    try:
        time_series = await prometheus_client.get_metrics_time_series(hours, step)
        return {"time_series": time_series, "hours": hours, "step": step}
    except Exception as e:
        logger.error(f"Error fetching time series: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching time series: {str(e)}")


if __name__ == "__main__":
    logger.info("="*60)
    logger.info("Starting Agent API Server")
    logger.info("="*60)
    logger.info("Running server on http://0.0.0.0:8000")
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
