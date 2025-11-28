"""Orchestrator Agent - Root agent that routes questions to appropriate sub-agents."""
import asyncio
import json
import logging
import sys
import time
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from opentelemetry import trace


from agent.backend.agents.drivers_license.agent import drivers_license_agent
from agent.backend.agents.scheduler.agent import scheduler_agent
from agent.backend.agents.orchestrator.prompt import PROMPT
from agent.backend.types.types import AgentCallRequest, AgentCallResponse, FunctionPayload
from agent.backend.telemetry import (
    total_cost_counter,
    total_tokens_counter,
    tool_calls_counter,
    execution_duration_histogram,
    tracer
)

# Configure logging to stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
logger.info("Loading environment variables for agent")
load_dotenv()
logger.info("Environment variables loaded")

logger.info("Creating orchestrator-agent")
ORCHESTRATOR_AGENT = Agent(
    model="gemini-2.5-flash",
    name="orchestrator_agent",
    description="A citizen services assistant orchestrator",
    instruction=PROMPT,
    sub_agents=[
        drivers_license_agent,
        scheduler_agent,
    ],
)
logger.info("orchestrator-agent created successfully")

APP_NAME = "drivers-license-assistant"
logger.info(f"Initializing services for app: {APP_NAME}")
SESSION_SERVICE = InMemorySessionService()
logger.info("InMemorySessionService initialized")
ARTIFACT_SERVICE = InMemoryArtifactService()
logger.info("InMemoryArtifactService initialized")

logger.info("Creating Runner instance")
RUNNER = Runner(
    app_name=APP_NAME,
    agent=ORCHESTRATOR_AGENT,
    artifact_service=ARTIFACT_SERVICE,
    session_service=SESSION_SERVICE,
)
logger.info("Runner created successfully")

user_id_to_session_id = {}


@tracer.start_as_current_span("call_agent")
async def call_agent(req: AgentCallRequest) -> AgentCallResponse:
    """Executes one turn of the agent with a query and full chat context."""
    logger.info("="*60)
    logger.info("call_agent function invoked")
    logger.info(f"Question: {req.question}")
    logger.info(f"Session ID: {req.session_id}")
    
    start_time = time.time()
    labels = {
        "agent_id": ORCHESTRATOR_AGENT.name,
        "model": ORCHESTRATOR_AGENT.model,
        "customer_id": req.session_id or "unknown"
    }
    
    try:
        span = trace.get_current_span()
        if span.is_recording():
            span.set_attribute("question", req.question)
            span.set_attribute("session_id", req.session_id or "unknown")

        assert req.session_id, "Session ID must be provided"

        user_id = req.session_id
        logger.info(f"User ID: {user_id}")

        if user_id_to_session_id.get(user_id):
            session_id = user_id_to_session_id[user_id]
            session = await SESSION_SERVICE.get_session(
                app_name=APP_NAME, session_id=session_id, user_id=user_id,
            )
            if session is None:
                raise ValueError(f"Session with ID {session_id} not found for user {user_id}")
            logger.info(f"Session found with ID: {session_id}")
        else:
            logger.info("Creating session")
            session = await SESSION_SERVICE.create_session(
                state={}, app_name=APP_NAME, user_id=user_id
            )
            session_id = session.id
            user_id_to_session_id[user_id] = session_id
            logger.info(f"Session created with ID: {session_id}")

        query = f"[user]: {req.question}"
        logger.info(f"[user]: {req.question}")

        logger.info("Creating content object for agent")
        content = types.Content(role="user", parts=[types.Part(text=query)])
        logger.info("Content object created")

        logger.info("Starting async runner execution")
        events_async = RUNNER.run_async(
            session_id=session.id, user_id=user_id, new_message=content
        )
        logger.info("Runner started, processing events stream")

        full_response = ""
        func_payloads = []
        event_count = 0

        logger.info("Beginning event stream processing")
        async for event in events_async:
            event_count += 1
            logger.debug(f"Processing event {event_count}")
            if not event.content or not event.content.parts:
                logger.debug("Skipping event with no content or parts")
                continue

            author = event.author
            logger.debug(f"Event from author: {author}")

            # Update labels with author if available
            current_labels = labels.copy()
            if author:
                current_labels["agent_id"] = author

            # Instrument tokens and cost
            if hasattr(event, "usage_metadata") and event.usage_metadata:
                input_tokens = event.usage_metadata.prompt_token_count or 0
                output_tokens = event.usage_metadata.candidates_token_count or 0
                total = event.usage_metadata.total_token_count or (input_tokens + output_tokens)
                
                total_tokens_counter.add(total, current_labels)
                
                # Cost calculation (approximate for Gemini 2.5 Flash)
                # Input: $0.075 / 1M tokens
                # Output: $0.30 / 1M tokens
                cost = (input_tokens * 0.075 / 1_000_000) + (output_tokens * 0.30 / 1_000_000)
                total_cost_counter.add(cost, current_labels)

            logger.debug("Extracting function calls and responses from event")
            function_calls = [
                e.function_call for e in event.content.parts if e.function_call
            ]
            function_responses = [
                e.function_response for e in event.content.parts if e.function_response
            ]
            logger.debug(f"Found {len(function_calls)} function call(s) and {len(function_responses)} function response(s)")

            if event.content.parts[0].text:
                text_response = event.content.parts[0].text
                logger.info(f"[{author}]: {text_response}")
                full_response += text_response

            for func_call in function_calls:
                tool_calls_counter.add(1, {**current_labels, "function_name": func_call.name}) #  type: ignore
                logger.info(f"FUNC CALLS: [{author}]: {func_call.name}({json.dumps(func_call.args)})")
                
            for func_resp in function_responses:
                func_payload = None

                if func_resp.response is None:
                    logger.warning(f"Empty function response for {func_resp.name}")
                    continue

                logger.info(f"Processing function response for {func_resp.name} - {func_resp.response}")
                try:
                    func_payload = func_resp.response["result"]
                    logger.info(f"FUNC RESPONSE: [{author}]: {func_resp.name} -> {func_payload}")
                except Exception as e:
                    logger.error(f"Error parsing function response JSON: {str(e)}")

                if func_payload:
                    func_payloads.append(FunctionPayload(
                        name=func_resp.name or "UNKNOWN",
                        payload=func_payload,
                    ))
                    logger.info(f"Added function payload for {func_resp.name}")
        
        logger.info(f"Event stream processing complete. Processed {event_count} events")
        logger.info(f"Collected {len(func_payloads)} function payload(s)")
        logger.info(f"Full response length: {len(full_response)} characters")
        logger.info(f"Final response: {full_response}")
        
        logger.info("Creating AgentCallResponse")
        response = AgentCallResponse(
            answer=full_response,
            function_payloads=func_payloads,
        )
        logger.info("call_agent execution completed successfully")
        logger.info("="*60)
        
        duration = time.time() - start_time
        execution_duration_histogram.record(duration, labels)

        return response
    except Exception as e:
        logger.error(f"Error in call_agent: {str(e)}", exc_info=True)
        raise


if __name__ == "__main__":
    logger.info("Running agent in standalone mode")
    import os
    asyncio.run(call_agent(AgentCallRequest(question="Preciso fazer exame médico para renovar minha carteira?", session_id="test-session-1")))

