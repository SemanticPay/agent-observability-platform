# `AttributeMap` is a dictionary that maps target attribute keys to source attribute keys.
# It is used to extract and transform attributes from a span or trace data object
# into a standardized format following OpenTelemetry semantic conventions.
#
# Key-Value Format:
# - Key (str): The target attribute key in the standardized output format
# - Value (str): The source attribute key in the input data object
#
# Example Usage:
# --------------
#
# Create your mapping:
#     attribute_mapping: AttributeMap = {
#         CoreAttributes.TRACE_ID: "trace_id",
#         CoreAttributes.SPAN_ID: "span_id"
#     }
#
# Extract the attributes:
#     span_data = {
#         "trace_id": "12345",
#         "span_id": "67890",
#     }
#
#     attributes = _extract_attributes_from_mapping(span_data, attribute_mapping)
#     # >> {"trace.id": "12345", "span.id": "67890"}
AttributeMap = Dict[str, str]  # target_attribute_key: source_attribute


"""Common wrapper utilities for OpenTelemetry instrumentation.

This module provides common utilities for creating and managing wrappers
around functions and methods for OpenTelemetry instrumentation. It includes
a configuration class for wrapping methods, helper functions for updating
spans with attributes, and functions for creating and applying wrappers.
"""

from typing import Any, Optional, Tuple, Dict, Callable
from dataclasses import dataclass
import logging
from wrapt import wrap_function_wrapper  # type: ignore
from opentelemetry.instrumentation.utils import unwrap as _unwrap
from opentelemetry.trace import Tracer
from opentelemetry.trace import Span, SpanKind, Status, StatusCode
from opentelemetry import context as context_api
from opentelemetry.instrumentation.utils import _SUPPRESS_INSTRUMENTATION_KEY

logger = logging.getLogger(__name__)

AttributeHandler = Callable[[Optional[Tuple], Optional[Dict], Optional[Any]], AttributeMap]


@dataclass
class WrapConfig:
    """Configuration for wrapping a method with OpenTelemetry instrumentation.

    This class defines how a method should be wrapped for instrumentation,
    including what package, class, and method to wrap, what span attributes
    to set, and how to name the resulting trace spans.

    Attributes:
        trace_name: The name to use for the trace span
        package: The package containing the target class
        class_name: The name of the class containing the method
        method_name: The name of the method to wrap
        handler: A function that extracts attributes from args, kwargs, or return value
        is_async: Whether the method is asynchronous (default: False)
            We explicitly specify async methods since `asyncio.iscoroutinefunction`
            is not reliable in this context.
        span_kind: The kind of span to create (default: CLIENT)
    """

    trace_name: str
    package: str
    class_name: str
    method_name: str
    handler: AttributeHandler
    is_async: bool = False
    span_kind: SpanKind = SpanKind.CLIENT

    def __repr__(self):
        return f"{self.package}.{self.class_name}.{self.method_name}"


def _update_span(span: Span, attributes: AttributeMap) -> None:
    """Update a span with the provided attributes.

    Args:
        span: The OpenTelemetry span to update
        attributes: A dictionary of attributes to set on the span
    """
    for key, value in attributes.items():
        span.set_attribute(key, value)


def _finish_span_success(span: Span) -> None:
    """Mark a span as successful by setting its status to OK.

    Args:
        span: The OpenTelemetry span to update
    """
    span.set_status(Status(StatusCode.OK))


def _finish_span_error(span: Span, exception: Exception) -> None:
    """Mark a span as failed by recording the exception and setting error status.

    Args:
        span: The OpenTelemetry span to update
        exception: The exception that caused the error
    """
    span.record_exception(exception)
    span.set_status(Status(StatusCode.ERROR, str(exception)))


def _create_wrapper(wrap_config: WrapConfig, tracer: Tracer) -> Callable:
    """Create a wrapper function for the specified configuration.

    This function creates a wrapper that:
    1. Creates a new span for the wrapped method
    2. Sets attributes on the span based on input arguments
    3. Calls the wrapped method
    4. Sets attributes on the span based on the return value
    5. Handles exceptions by recording them on the span

    Args:
        wrap_config: Configuration for the wrapper
        tracer: The OpenTelemetry tracer to use for creating spans

    Returns:
        A wrapper function compatible with wrapt.wrap_function_wrapper
    """
    handler = wrap_config.handler

    async def awrapper(wrapped, instance, args, kwargs):
        # Skip instrumentation if it's suppressed in the current context
        # TODO I don't understand what this actually does
        if context_api.get_value(_SUPPRESS_INSTRUMENTATION_KEY):
            return wrapped(*args, **kwargs)

        return_value = None

        with tracer.start_as_current_span(
            wrap_config.trace_name,
            kind=wrap_config.span_kind,
        ) as span:
            try:
                # Add the input attributes to the span before execution
                attributes = handler(args=args, kwargs=kwargs)
                _update_span(span, attributes)

                return_value = await wrapped(*args, **kwargs)

                # Add the output attributes to the span after execution
                attributes = handler(return_value=return_value)
                _update_span(span, attributes)
                _finish_span_success(span)
            except Exception as e:
                # Add everything we have in the case of an error
                attributes = handler(args=args, kwargs=kwargs, return_value=return_value)
                _update_span(span, attributes)
                _finish_span_error(span, e)
                raise

        return return_value

    def wrapper(wrapped, instance, args, kwargs):
        # Skip instrumentation if it's suppressed in the current context
        # TODO I don't understand what this actually does
        if context_api.get_value(_SUPPRESS_INSTRUMENTATION_KEY):
            return wrapped(*args, **kwargs)

        return_value = None

        with tracer.start_as_current_span(
            wrap_config.trace_name,
            kind=wrap_config.span_kind,
        ) as span:
            try:
                # Add the input attributes to the span before execution
                attributes = handler(args=args, kwargs=kwargs)
                _update_span(span, attributes)

                return_value = wrapped(*args, **kwargs)

                # Add the output attributes to the span after execution
                attributes = handler(return_value=return_value)
                _update_span(span, attributes)
                _finish_span_success(span)
            except Exception as e:
                # Add everything we have in the case of an error
                attributes = handler(args=args, kwargs=kwargs, return_value=return_value)
                _update_span(span, attributes)
                _finish_span_error(span, e)
                raise

        return return_value

    if wrap_config.is_async:
        return awrapper
    else:
        return wrapper


def wrap(wrap_config: WrapConfig, tracer: Tracer) -> Callable:
    """Wrap a method with OpenTelemetry instrumentation.

    This function applies the wrapper created by _create_wrapper
    to the method specified in the wrap_config.

    Args:
        wrap_config: Configuration specifying what to wrap and how
        tracer: The OpenTelemetry tracer to use for creating spans

    Returns:
        The result of wrap_function_wrapper (typically None)
    """
    return wrap_function_wrapper(
        wrap_config.package,
        f"{wrap_config.class_name}.{wrap_config.method_name}",
        _create_wrapper(wrap_config, tracer),
    )


def unwrap(wrap_config: WrapConfig):
    """Remove instrumentation wrapper from a method.

    This function removes the wrapper applied by wrap().

    Args:
        wrap_config: Configuration specifying what to unwrap

    Returns:
        The result of the unwrap operation (typically None)
    """
    return _unwrap(
        f"{wrap_config.package}.{wrap_config.class_name}",
        wrap_config.method_name,
    )


"""Base instrumentor utilities for Phare instrumentation.

This module provides base classes and utilities for creating instrumentors,
reducing boilerplate code across different provider instrumentations.
"""

from abc import ABC, abstractmethod
from typing import Collection, Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
import logging
from opentelemetry.instrumentation.instrumentor import BaseInstrumentor
from opentelemetry.trace import Tracer, get_tracer
from opentelemetry.metrics import Meter, get_meter

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


@dataclass
class InstrumentorConfig:
    """Configuration for an instrumentor."""

    library_name: str
    library_version: str
    wrapped_methods: List[WrapConfig] = field(default_factory=list)
    metrics_enabled: bool = True
    dependencies: Collection[str] = field(default_factory=list)


class CommonInstrumentor(BaseInstrumentor, ABC):
    """Base class for Phare instrumentors with common functionality."""

    def __init__(self, config: InstrumentorConfig):
        super().__init__()
        self.config = config
        self._tracer: Optional[Tracer] = None
        self._meter: Optional[Meter] = None
        self._metrics: Dict[str, Any] = {}

    def instrumentation_dependencies(self) -> Collection[str]:
        """Return required dependencies."""
        return self.config.dependencies

    def _instrument(self, **kwargs):
        """Instrument the target library."""
        # Initialize tracer
        tracer_provider = kwargs.get("tracer_provider")
        self._tracer = get_tracer(self.config.library_name, self.config.library_version, tracer_provider)

        # Initialize meter if metrics enabled
        if self.config.metrics_enabled:
            meter_provider = kwargs.get("meter_provider")
            self._meter = get_meter(self.config.library_name, self.config.library_version, meter_provider)
            self._metrics = self._create_metrics(self._meter)

        # Perform custom initialization
        self._initialize(**kwargs)

        # Wrap all configured methods
        self._wrap_methods()

        # Perform custom wrapping
        self._custom_wrap(**kwargs)

    def _uninstrument(self, **kwargs):
        """Remove instrumentation."""
        # Unwrap all configured methods
        for wrap_config in self.config.wrapped_methods:
            try:
                unwrap(wrap_config)
            except Exception as e:
                logger.debug(
                    f"Failed to unwrap {wrap_config.package}.{wrap_config.class_name}.{wrap_config.method_name}: {e}"
                )

        # Perform custom unwrapping
        self._custom_unwrap(**kwargs)

        # Clear references
        self._tracer = None
        self._meter = None
        self._metrics.clear()

    def _wrap_methods(self):
        """Wrap all configured methods."""
        for wrap_config in self.config.wrapped_methods:
            try:
                wrap(wrap_config, self._tracer)
            except (AttributeError, ModuleNotFoundError) as e:
                logger.debug(
                    f"Could not wrap {wrap_config.package}.{wrap_config.class_name}.{wrap_config.method_name}: {e}"
                )

    @abstractmethod
    def _create_metrics(self, meter: Meter) -> Dict[str, Any]:
        """Create metrics for the instrumentor.

        Returns a dictionary of metric name to metric instance.
        """
        pass

    def _initialize(self, **kwargs):
        """Perform custom initialization.

        Override in subclasses for custom initialization logic.
        """
        pass

    def _custom_wrap(self, **kwargs):
        """Perform custom wrapping beyond configured methods.

        Override in subclasses for special wrapping needs.
        """
        pass

    def _custom_unwrap(self, **kwargs):
        """Perform custom unwrapping beyond configured methods.

        Override in subclasses for special unwrapping needs.
        """
        pass


"""Metrics for OpenTelemetry semantic conventions."""


class Meters:
    # Gen AI metrics (OpenTelemetry standard)
    LLM_GENERATION_CHOICES = "gen_ai.client.generation.choices"
    LLM_TOKEN_USAGE = "gen_ai.client.token.usage"
    LLM_OPERATION_DURATION = "gen_ai.client.operation.duration"

    # OpenAI specific metrics
    LLM_COMPLETIONS_EXCEPTIONS = "gen_ai.openai.chat_completions.exceptions"
    LLM_STREAMING_TIME_TO_FIRST_TOKEN = "gen_ai.openai.chat_completions.streaming_time_to_first_token"
    LLM_STREAMING_TIME_TO_GENERATE = "gen_ai.openai.chat_completions.streaming_time_to_generate"
    LLM_EMBEDDINGS_EXCEPTIONS = "gen_ai.openai.embeddings.exceptions"
    LLM_EMBEDDINGS_VECTOR_SIZE = "gen_ai.openai.embeddings.vector_size"
    LLM_IMAGE_GENERATIONS_EXCEPTIONS = "gen_ai.openai.image_generations.exceptions"

    # Anthropic specific metrics
    LLM_ANTHROPIC_COMPLETION_EXCEPTIONS = "gen_ai.anthropic.completion.exceptions"

    # Agent metrics
    AGENT_RUNS = "gen_ai.agent.runs"
    AGENT_TURNS = "gen_ai.agent.turns"
    AGENT_EXECUTION_TIME = "gen_ai.agent.execution_time"



from typing import Dict, Any, Optional
from opentelemetry.metrics import Meter, Histogram, Counter

class StandardMetrics:
    """Factory for creating standard metrics used across instrumentations."""

    @staticmethod
    def create_token_histogram(meter: Meter) -> Histogram:
        """Create a histogram for token usage."""
        return meter.create_histogram(
            name=Meters.LLM_TOKEN_USAGE, unit="token", description="Measures number of input and output tokens used"
        )

    @staticmethod
    def create_duration_histogram(meter: Meter) -> Histogram:
        """Create a histogram for operation duration."""
        return meter.create_histogram(
            name=Meters.LLM_OPERATION_DURATION, unit="s", description="GenAI operation duration"
        )

    @staticmethod
    def create_exception_counter(meter: Meter, name: str = Meters.LLM_COMPLETIONS_EXCEPTIONS) -> Counter:
        """Create a counter for exceptions."""
        return meter.create_counter(
            name=name, unit="time", description="Number of exceptions occurred during operations"
        )

    @staticmethod
    def create_choice_counter(meter: Meter) -> Counter:
        """Create a counter for generation choices."""
        return meter.create_counter(
            name=Meters.LLM_GENERATION_CHOICES,
            unit="choice",
            description="Number of choices returned by completions call",
        )

    @staticmethod
    def create_standard_metrics(meter: Meter) -> Dict[str, Any]:
        """Create a standard set of metrics for LLM operations.

        Returns:
            Dictionary with metric names as keys and metric instances as values
        """
        return {
            "token_histogram": StandardMetrics.create_token_histogram(meter),
            "duration_histogram": StandardMetrics.create_duration_histogram(meter),
            "exception_counter": StandardMetrics.create_exception_counter(meter),
        }



"""Span attributes for OpenTelemetry semantic conventions."""


class SpanAttributes:
    # Semantic Conventions for LLM requests based on OpenTelemetry Gen AI conventions
    # Refer to https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-spans.md
    #
    # TODO: There is an important deviation from the OpenTelemetry spec in our current implementation.
    # In our OpenAI instrumentation, we're mapping from source→target keys incorrectly in the _token_type function
    # in shared/__init__.py. According to our established pattern, mapping dictionaries should consistently use
    # target→source format (where keys are target attributes and values are source fields).
    #
    # Current implementation (incorrect):
    # def _token_type(token_type: str):
    #     if token_type == "prompt_tokens":  # source
    #         return "input"  # target
    #
    # Correct implementation should be:
    # token_type_mapping = {
    #     "input": "prompt_tokens",  # target → source
    #     "output": "completion_tokens"
    # }
    #
    # Then we have to adapt code using the function to handle the inverted mapping.

    # System
    LLM_SYSTEM = "gen_ai.system"

    # Request attributes
    LLM_REQUEST_MODEL = "gen_ai.request.model"
    LLM_REQUEST_MAX_TOKENS = "gen_ai.request.max_tokens"
    LLM_REQUEST_TEMPERATURE = "gen_ai.request.temperature"
    LLM_REQUEST_TOP_P = "gen_ai.request.top_p"
    LLM_REQUEST_TOP_K = "gen_ai.request.top_k"
    LLM_REQUEST_SEED = "gen_ai.request.seed"
    LLM_REQUEST_SYSTEM_INSTRUCTION = "gen_ai.request.system_instruction"
    LLM_REQUEST_CANDIDATE_COUNT = "gen_ai.request.candidate_count"
    LLM_REQUEST_STOP_SEQUENCES = "gen_ai.request.stop_sequences"
    LLM_REQUEST_TYPE = "gen_ai.request.type"
    LLM_REQUEST_STREAMING = "gen_ai.request.streaming"
    LLM_REQUEST_FREQUENCY_PENALTY = "gen_ai.request.frequency_penalty"
    LLM_REQUEST_PRESENCE_PENALTY = "gen_ai.request.presence_penalty"
    LLM_REQUEST_FUNCTIONS = "gen_ai.request.functions"
    LLM_REQUEST_HEADERS = "gen_ai.request.headers"
    LLM_REQUEST_INSTRUCTIONS = "gen_ai.request.instructions"
    LLM_REQUEST_VOICE = "gen_ai.request.voice"
    LLM_REQUEST_SPEED = "gen_ai.request.speed"

    # Content
    LLM_PROMPTS = "gen_ai.prompt"
    LLM_COMPLETIONS = "gen_ai.completion"  # DO NOT SET THIS DIRECTLY
    LLM_CONTENT_COMPLETION_CHUNK = "gen_ai.completion.chunk"

    # Response attributes
    LLM_RESPONSE_MODEL = "gen_ai.response.model"
    LLM_RESPONSE_FINISH_REASON = "gen_ai.response.finish_reason"
    LLM_RESPONSE_STOP_REASON = "gen_ai.response.stop_reason"
    LLM_RESPONSE_ID = "gen_ai.response.id"

    # Usage metrics
    LLM_USAGE_COMPLETION_TOKENS = "gen_ai.usage.completion_tokens"
    LLM_USAGE_PROMPT_TOKENS = "gen_ai.usage.prompt_tokens"
    LLM_USAGE_TOTAL_TOKENS = "gen_ai.usage.total_tokens"
    LLM_USAGE_CACHE_CREATION_INPUT_TOKENS = "gen_ai.usage.cache_creation_input_tokens"
    LLM_USAGE_CACHE_READ_INPUT_TOKENS = "gen_ai.usage.cache_read_input_tokens"
    LLM_USAGE_REASONING_TOKENS = "gen_ai.usage.reasoning_tokens"
    LLM_USAGE_STREAMING_TOKENS = "gen_ai.usage.streaming_tokens"
    LLM_USAGE_TOOL_COST = "gen_ai.usage.total_cost"

    # Message attributes
    # see ./message.py for message-related attributes

    # Token type
    LLM_TOKEN_TYPE = "gen_ai.token.type"

    # User
    LLM_USER = "gen_ai.user"

    # OpenAI specific
    LLM_OPENAI_RESPONSE_SYSTEM_FINGERPRINT = "gen_ai.openai.system_fingerprint"
    LLM_OPENAI_RESPONSE_INSTRUCTIONS = "gen_ai.openai.instructions"
    LLM_OPENAI_API_BASE = "gen_ai.openai.api_base"
    LLM_OPENAI_API_VERSION = "gen_ai.openai.api_version"
    LLM_OPENAI_API_TYPE = "gen_ai.openai.api_type"

    # Phare specific attributes
    PHARE_ENTITY_OUTPUT = "phare.entity.output"
    PHARE_ENTITY_INPUT = "phare.entity.input"
    PHARE_SPAN_KIND = "phare.span.kind"
    PHARE_ENTITY_NAME = "phare.entity.name"
    PHARE_DECORATOR_SPEC = "phare.{entity_kind}.spec"
    PHARE_DECORATOR_INPUT = "phare.{entity_kind}.input"
    PHARE_DECORATOR_OUTPUT = "phare.{entity_kind}.output"

    # Operation attributes
    OPERATION_NAME = "operation.name"
    OPERATION_VERSION = "operation.version"

    # Session/Trace attributes
    PHARE_SESSION_END_STATE = "phare.session.end_state"

    # Streaming-specific attributes
    LLM_STREAMING_TIME_TO_FIRST_TOKEN = "gen_ai.streaming.time_to_first_token"
    LLM_STREAMING_TIME_TO_GENERATE = "gen_ai.streaming.time_to_generate"
    LLM_STREAMING_DURATION = "gen_ai.streaming_duration"
    LLM_STREAMING_CHUNK_COUNT = "gen_ai.streaming.chunk_count"

    # HTTP-specific attributes
    HTTP_METHOD = "http.method"
    HTTP_URL = "http.url"
    HTTP_ROUTE = "http.route"
    HTTP_STATUS_CODE = "http.status_code"
    HTTP_REQUEST_HEADERS = "http.request.headers"
    HTTP_RESPONSE_HEADERS = "http.response.headers"
    HTTP_REQUEST_BODY = "http.request.body"
    HTTP_RESPONSE_BODY = "http.response.body"
    HTTP_USER_AGENT = "http.user_agent"
    HTTP_REQUEST_ID = "http.request_id"


"""
Resource attribute semantic conventions for Phare.

This module defines standard resource attributes used to identify resources in
Phare telemetry data.
"""


class ResourceAttributes:
    """
    Resource attributes for Phare.

    These attributes provide standard identifiers for resources being monitored
    or interacted with by Phare.
    """

    # Project identifier - uniquely identifies an Phare project
    PROJECT_ID = "phare.project.id"

    # Service attributes
    SERVICE_NAME = "service.name"
    SERVICE_VERSION = "service.version"

    # Environment attributes
    ENVIRONMENT = "phare.environment"
    DEPLOYMENT_ENVIRONMENT = "deployment.environment"

    # SDK attributes
    SDK_NAME = "phare.sdk.name"
    SDK_VERSION = "phare.sdk.version"

    # Host machine attributes
    HOST_MACHINE = "host.machine"
    HOST_NAME = "host.name"
    HOST_NODE = "host.node"
    HOST_OS_RELEASE = "host.os_release"
    HOST_PROCESSOR = "host.processor"
    HOST_SYSTEM = "host.system"
    HOST_VERSION = "host.version"

    # CPU attributes
    CPU_COUNT = "cpu.count"
    CPU_PERCENT = "cpu.percent"

    # Memory attributes
    MEMORY_TOTAL = "memory.total"
    MEMORY_AVAILABLE = "memory.available"
    MEMORY_USED = "memory.used"
    MEMORY_PERCENT = "memory.percent"

    # Libraries
    IMPORTED_LIBRARIES = "imported_libraries"


"""Core attributes applicable to all spans."""


class CoreAttributes:
    """Core attributes applicable to all spans."""

    # Error attributes
    ERROR_TYPE = "error.type"  # Type of error if status is error
    ERROR_MESSAGE = "error.message"  # Error message if status is error

    TAGS = "phare.tags"  # Tags passed to phare.init

    # Trace context attributes
    TRACE_ID = "trace.id"  # Trace ID
    SPAN_ID = "span.id"  # Span ID
    PARENT_ID = "parent.id"  # Parent ID
    GROUP_ID = "group.id"  # Group ID

    # Note: WORKFLOW_NAME is defined in WorkflowAttributes to avoid duplication



"""Attributes specific to tool spans."""


class ToolAttributes:
    """Attributes specific to tool spans."""

    # Identity
    TOOL_ID = "tool.id"  # Unique identifier for the tool
    TOOL_NAME = "tool.name"  # Name of the tool
    TOOL_DESCRIPTION = "tool.description"  # Description of the tool

    # Execution
    TOOL_PARAMETERS = "tool.parameters"  # Parameters passed to the tool
    TOOL_RESULT = "tool.result"  # Result returned by the tool
    TOOL_STATUS = "tool.status"  # Status of tool execution


"""Semantic conventions for message-related attributes in AI systems."""


class MessageAttributes:
    """Semantic conventions for message-related attributes in AI systems."""

    PROMPT_ROLE = "gen_ai.prompt.{i}.role"  # Role of the prompt message
    PROMPT_CONTENT = "gen_ai.prompt.{i}.content"  # Content of the prompt message
    PROMPT_TYPE = "gen_ai.prompt.{i}.type"  # Type of the prompt message
    PROMPT_SPEAKER = "gen_ai.prompt.{i}.speaker"  # Speaker/agent name for the prompt message

    # Indexed function calls (with {i} for interpolation)
    TOOL_CALL_ID = "gen_ai.request.tools.{i}.id"  # Unique identifier for the function call at index {i}
    TOOL_CALL_TYPE = "gen_ai.request.tools.{i}.type"  # Type of the function call at index {i}
    TOOL_CALL_NAME = "gen_ai.request.tools.{i}.name"  # Name of the function call at index {i}
    TOOL_CALL_DESCRIPTION = "gen_ai.request.tools.{i}.description"  # Description of the function call at index {i}
    TOOL_CALL_ARGUMENTS = "gen_ai.request.tools.{i}.arguments"  # Arguments for function call at index {i}

    # Indexed completions (with {i} for interpolation)
    COMPLETION_ID = "gen_ai.completion.{i}.id"  # Unique identifier for the completion
    COMPLETION_TYPE = "gen_ai.completion.{i}.type"  # Type of the completion at index {i}
    COMPLETION_ROLE = "gen_ai.completion.{i}.role"  # Role of the completion message at index {i}
    COMPLETION_CONTENT = "gen_ai.completion.{i}.content"  # Content of the completion message at index {i}
    COMPLETION_FINISH_REASON = "gen_ai.completion.{i}.finish_reason"  # Finish reason for completion at index {i}
    COMPLETION_SPEAKER = "gen_ai.completion.{i}.speaker"  # Speaker/agent name for the completion message

    # Indexed tool calls (with {i}/{j} for nested interpolation)
    COMPLETION_TOOL_CALL_ID = "gen_ai.completion.{i}.tool_calls.{j}.id"  # ID of tool call {j} in completion {i}
    COMPLETION_TOOL_CALL_TYPE = "gen_ai.completion.{i}.tool_calls.{j}.type"  # Type of tool call {j} in completion {i}
    COMPLETION_TOOL_CALL_STATUS = (
        "gen_ai.completion.{i}.tool_calls.{j}.status"  # Status of tool call {j} in completion {i}
    )
    COMPLETION_TOOL_CALL_NAME = (
        "gen_ai.completion.{i}.tool_calls.{j}.name"  # Name of the tool called in tool call {j} in completion {i}
    )
    COMPLETION_TOOL_CALL_DESCRIPTION = (
        "gen_ai.completion.{i}.tool_calls.{j}.description"  # Description of the tool call {j} in completion {i}
    )
    COMPLETION_TOOL_CALL_STATUS = (
        "gen_ai.completion.{i}.tool_calls.{j}.status"  # Status of the tool call {j} in completion {i}
    )
    COMPLETION_TOOL_CALL_ARGUMENTS = (
        "gen_ai.completion.{i}.tool_calls.{j}.arguments"  # Arguments for tool call {j} in completion {i}
    )

    # Indexed annotations of the internal tools (with {i}/{j} for nested interpolation)
    COMPLETION_ANNOTATION_START_INDEX = (
        "gen_ai.completion.{i}.annotations.{j}.start_index"  # Start index of the URL annotation {j} in completion {i}
    )
    COMPLETION_ANNOTATION_END_INDEX = (
        "gen_ai.completion.{i}.annotations.{j}.end_index"  # End index of the URL annotation {j} in completion {i}
    )
    COMPLETION_ANNOTATION_TITLE = (
        "gen_ai.completion.{i}.annotations.{j}.title"  # Title of the URL annotation {j} in completion {i}
    )
    COMPLETION_ANNOTATION_TYPE = (
        "gen_ai.completion.{i}.annotations.{j}.type"  # Type of the URL annotation {j} in completion {i}
    )
    COMPLETION_ANNOTATION_URL = (
        "gen_ai.completion.{i}.annotations.{j}.url"  # URL link of the URL annotation {j} in completion {i}
    )


"""Attributes specific to agent spans."""


class AgentAttributes:
    """Attributes specific to agent spans."""

    # Identity
    AGENT_ID = "agent.id"  # Unique identifier for the agent
    AGENT_NAME = "agent.name"  # Name of the agent
    AGENT_ROLE = "agent.role"  # Role of the agent

    # Capabilities
    AGENT_TOOLS = "agent.tools"  # Tools available to the agent
    AGENT_MODELS = "agent.models"  # Models available to the agent

    TOOLS = "tools"
    HANDOFFS = "handoffs"

    # NOTE: This attribute deviates from the OpenTelemetry GenAI semantic conventions.
    # According to OpenTelemetry GenAI conventions, this should be named "gen_ai.agent.source"
    # or follow a similar pattern under the "gen_ai" namespace.
    FROM_AGENT = "from_agent"

    # NOTE: This attribute deviates from the OpenTelemetry GenAI semantic conventions.
    # According to OpenTelemetry GenAI conventions, this should be named "gen_ai.agent.destination"
    # or follow a similar pattern under the "gen_ai" namespace.
    TO_AGENT = "to_agent"

    AGENT_REASONING = "agent.reasoning"
