"""
Simple Google ADK Prometheus Instrumentation
==========================================
A standalone, single-file solution to instrument Google ADK with Prometheus metrics.
No AgentOps or complex dependencies required.
Usage:
    from simple_adk_metrics import instrument, get_metrics_router
    
    # 1. Instrument ADK (call this before running agents)
    instrument()
    
    # 2. Add metrics endpoint to your FastAPI app
    app.include_router(get_metrics_router())
"""

import time
import functools
import inspect
import logging
import sys
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST, Gauge
from fastapi import APIRouter, Response


logger = logging.getLogger("adk_metrics")

# --- Model Pricing (per 1M tokens) ---
# https://github.com/google/adk-python/discussions/3273
# https://ai.google.dev/pricing
MODEL_PRICING = {
    "gemini-2.5-flash": {
        "prompt": 0.30,      # $0.30 per 1M input tokens
        "completion": 2.5,  # $2.5 per 1M output tokens
    },
    "gemini-2.5-pro": {
        "prompt": 1.25,
        "completion": 10.00,
    },
    "gemini-2.0-flash": {
        "prompt": 0.10,
        "completion": 0.40,
    },
}
DEFAULT_PRICING = {"prompt": 0.10, "completion": 0.40}

# --- Metrics Definitions ---
# Agent Metrics

AGENT_TOOL_INFO = Gauge(
    "adk_agent_tool_info",
    "Static info metric indicating which tools belong to which agent",
    ["agent_name", "tool_name"]
)

AGENT_MODEL_INFO = Gauge(
    "adk_agent_model_info",
    "Static info metric indicating which model each agent uses",
    ["agent_name", "model"]
)

AGENT_RUNS = Counter(
    "adk_agent_runs_total", 
    "Total number of agent executions",
    ["agent_name", "status"]
)
AGENT_DURATION = Histogram(
    "adk_agent_run_duration_seconds",
    "Time taken for agent execution",
    ["agent_name"]
)
# LLM Metrics
LLM_REQUESTS = Counter(
    "adk_llm_requests_total",
    "Total LLM requests made",
    ["model", "agent_name", "status"]
)
LLM_DURATION = Histogram(
    "adk_llm_request_duration_seconds",
    "Latency of LLM requests",
    ["model", "agent_name"]
)
LLM_TOKENS = Counter(
    "adk_llm_tokens_total",
    "Token usage",
    ["model", "agent_name", "type"]
)
LLM_COST = Counter(
    "adk_llm_cost_dollars",
    "Estimated LLM cost in dollars",
    ["model", "agent_name"]
)
# Tool Metrics
TOOL_CALLS = Counter(
    "adk_tool_calls_total",
    "Total tool invocations",
    ["tool_name", "agent_name", "status"]
)
TOOL_DURATION = Histogram(
    "adk_tool_call_duration_seconds",
    "Latency of tool calls",
    ["tool_name", "agent_name"]
)


# --- Patching Helpers ---
def _safe_get_attr(obj, attr, default="unknown"):
    """Safely get an attribute from an object."""
    return getattr(obj, attr, default)


def _patch_method(module_name: str, class_name: str, method_name: str, wrapper_factory):
    """Patches a method on a class in a module."""
    try:
        module = sys.modules.get(module_name)
        if not module:
            # Try importing if not already loaded
            try:
                module = __import__(module_name, fromlist=[class_name])
            except ImportError:
                logger.warning(f"Could not import {module_name} for patching")
                return
        cls = getattr(module, class_name, None)
        if not cls:
            logger.warning(f"Class {class_name} not found in {module_name}")
            return
        original_method = getattr(cls, method_name, None)
        if not original_method:
            logger.warning(f"Method {method_name} not found in {class_name}")
            return
            
        # Check if already patched to avoid double wrapping
        if getattr(original_method, "_is_adk_metrics_patch", False):
            return
        wrapped_method = wrapper_factory(original_method)
        wrapped_method._is_adk_metrics_patch = True
        setattr(cls, method_name, wrapped_method)
        logger.info(f"Patched {module_name}.{class_name}.{method_name}")
        
    except Exception as e:
        logger.error(f"Failed to patch {module_name}.{class_name}.{method_name}: {e}")


def _patch_function(module_name: str, func_name: str, wrapper_factory):
    """Patches a module-level function."""
    try:
        module = sys.modules.get(module_name)
        if not module:
            try:
                module = __import__(module_name, fromlist=[func_name])
            except ImportError:
                logger.warning(f"Could not import {module_name} for patching")
                return
        original_func = getattr(module, func_name, None)
        if not original_func:
            logger.warning(f"Function {func_name} not found in {module_name}")
            return
        if getattr(original_func, "_is_adk_metrics_patch", False):
            return
        wrapped_func = wrapper_factory(original_func)
        wrapped_func._is_adk_metrics_patch = True
        setattr(module, func_name, wrapped_func)
        logger.info(f"Patched {module_name}.{func_name}")
    except Exception as e:
        logger.error(f"Failed to patch {module_name}.{func_name}: {e}")


# --- Wrappers ---
def run_async_wrapper(original_method):
    @functools.wraps(original_method)
    async def wrapper(self, *args, **kwargs):
        agent_name = _safe_get_attr(self, "name", "unknown_agent")
        start_time = time.time()
        status = "success"
        
        try:
            # Execute original method
            # Handle async generator if that's what run_async returns (it usually does in ADK)
            result = original_method(self, *args, **kwargs)
            
            if inspect.isasyncgen(result):
                async for item in result:
                    yield item
            else:
                # If it's a coroutine
                yield await result
                
        except Exception:
            status = "error"
            raise
        finally:
            duration = time.time() - start_time
            AGENT_RUNS.labels(agent_name=agent_name, status=status).inc()
            AGENT_DURATION.labels(agent_name=agent_name).observe(duration)
            
    return wrapper


def _call_llm_async_wrapper(original_method):
    @functools.wraps(original_method)
    async def wrapper(self, *args, **kwargs):
        # Args: (invocation_context, llm_request, model_response_event)
        invocation_context = args[0] if len(args) > 0 else kwargs.get("invocation_context")
        llm_request = args[1] if len(args) > 1 else kwargs.get("llm_request")
        
        model_name = "unknown_model"
        if llm_request and hasattr(llm_request, "model"):
            model_name = llm_request.model

        agent_name = "unknown_agent"
        if invocation_context and hasattr(invocation_context, "agent"):
            agent_name = invocation_context.agent.name

        start_time = time.time()
        status = "success"
        
        try:
            # _call_llm_async returns an async generator yielding LlmResponse
            result = original_method(self, *args, **kwargs)
            
            if inspect.isasyncgen(result):
                async for llm_response in result:
                    # Extract token usage from each LlmResponse
                    if llm_response and hasattr(llm_response, "usage_metadata"):
                        usage = llm_response.usage_metadata
                        if usage:
                            if isinstance(usage, dict):
                                prompt_tokens = usage.get("prompt_token_count", 0)
                                completion_tokens = usage.get("candidates_token_count", 0)
                                total_tokens = usage.get("total_token_count", 0)
                            else:
                                prompt_tokens = getattr(usage, "prompt_token_count", 0) or 0
                                completion_tokens = getattr(usage, "candidates_token_count", 0) or 0
                                total_tokens = getattr(usage, "total_token_count", 0) or 0
                            
                            # Emit token metrics with agent_name
                            if prompt_tokens:
                                LLM_TOKENS.labels(model=model_name, agent_name=agent_name, type="prompt").inc(prompt_tokens)
                            if completion_tokens:
                                LLM_TOKENS.labels(model=model_name, agent_name=agent_name, type="completion").inc(completion_tokens)
                            if total_tokens:
                                LLM_TOKENS.labels(model=model_name, agent_name=agent_name, type="total").inc(total_tokens)
                            
                            # Calculate and emit cost with agent_name
                            pricing = MODEL_PRICING.get(model_name, DEFAULT_PRICING)
                            prompt_cost = (prompt_tokens / 1_000_000) * pricing["prompt"]
                            completion_cost = (completion_tokens / 1_000_000) * pricing["completion"]
                            total_cost = prompt_cost + completion_cost
                            if total_cost > 0:
                                LLM_COST.labels(model=model_name, agent_name=agent_name).inc(total_cost)
                    
                    yield llm_response
            else:
                yield await result
                
        except Exception:
            status = "error"
            raise
        finally:
            duration = time.time() - start_time
            LLM_REQUESTS.labels(model=model_name, agent_name=agent_name, status=status).inc()
            LLM_DURATION.labels(model=model_name, agent_name=agent_name).observe(duration)
            
    return wrapper


def __call_tool_async_wrapper(original_func):
    @functools.wraps(original_func)
    async def wrapper(*args, **kwargs):
        # Args: (tool, args, tool_context)
        tool = args[0] if args else kwargs.get("tool")
        tool_context = args[2] if len(args) > 2 else kwargs.get("tool_context")

        tool_name = _safe_get_attr(tool, "name", "unknown_tool")
        agent_name = _safe_get_attr(tool_context, "agent_name", "unknown_agent") 
        
        start_time = time.time()
        status = "success"
        
        try:
            return await original_func(*args, **kwargs)
        except Exception:
            status = "error"
            raise
        finally:
            duration = time.time() - start_time
            TOOL_CALLS.labels(tool_name=tool_name, agent_name=agent_name, status=status).inc()
            TOOL_DURATION.labels(tool_name=tool_name, agent_name=agent_name).observe(duration)
            
    return wrapper


# --- Main Instrument Function ---

def _register_agent_tool_metrics():
    """Walk agent hierarchy and emit info metrics for each agent's tools and models."""
    try:
        from agent.backend.agents.orchestrator.agent import ORCHESTRATOR_AGENT
        
        def _process_agent(agent):
            agent_name = getattr(agent, 'name', 'unknown')
            tools = getattr(agent, 'tools', [])
            model = getattr(agent, 'model', 'unknown')
            
            # Register model info for every agent
            AGENT_MODEL_INFO.labels(agent_name=agent_name, model=model).set(1)
            logger.info(f"Registered model metric: agent={agent_name}, model={model}")
            
            # Register tool info (skip agents with no tools)
            if tools:
                for tool in tools:
                    tool_name = getattr(tool, '__name__', str(tool))
                    AGENT_TOOL_INFO.labels(agent_name=agent_name, tool_name=tool_name).set(1)
                    logger.info(f"Registered tool metric: agent={agent_name}, tool={tool_name}")
            
            # Recurse into sub_agents
            for sub_agent in getattr(agent, 'sub_agents', []):
                _process_agent(sub_agent)
        
        _process_agent(ORCHESTRATOR_AGENT)
        logger.info("Agent tool metrics registered.")
    except Exception as e:
        logger.error(f"Failed to register agent tool metrics: {e}")


def instrument():
    """
    Apply patches to Google ADK to enable Prometheus metrics.
    Call this once at application startup.
    """
    logger.info("Initializing Google ADK Prometheus instrumentation...")
    
    # 0. Register static agent-tool info metrics
    _register_agent_tool_metrics()
    
    # 1. Patch Agent Execution
    _patch_method(
        "google.adk.agents.base_agent",
        "BaseAgent",
        "run_async",
        run_async_wrapper
    )
    
    # 2. Patch LLM Calls (Request/Duration/Tokens/Cost - all with agent_name)
    _patch_method(
        "google.adk.flows.llm_flows.base_llm_flow",
        "BaseLlmFlow",
        "_call_llm_async",
        _call_llm_async_wrapper
    )
    
    # 3. Patch Tool Execution
    # Note: This is an internal function in ADK, path might vary by version
    _patch_function(
        "google.adk.flows.llm_flows.functions",
        "__call_tool_async",
        __call_tool_async_wrapper
    )
    
    logger.info("Google ADK instrumentation applied.")


# # --- FastAPI Router ---
# def get_metrics_router() -> APIRouter:
#     """
#     Returns a FastAPI router with a /metrics endpoint.
#     """
#     router = APIRouter()
#     @router.get("/metrics")
#     async def metrics():
#         return Response(
#             content=generate_latest(),
#             media_type=CONTENT_TYPE_LATEST
#         )
        
#     return router
