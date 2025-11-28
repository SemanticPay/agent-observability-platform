"""Google ADK Instrumentation for Phare

This module provides instrumentation for Google's Agent Development Kit (ADK).
It uses a patching approach to:
1. Disable ADK's built-in telemetry to prevent duplicate spans
2. Create Phare spans that mirror ADK's telemetry structure
3. Extract and properly index LLM messages and tool calls
"""

from __future__ import annotations
from typing import Dict, Any
import logging
from opentelemetry.metrics import Meter
from agent.backend.instrumentation.common.common import CommonInstrumentor, StandardMetrics, InstrumentorConfig
from agent.backend.instrumentation.patch import patch_adk, unpatch_adk

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


# Library info for tracer/meter
LIBRARY_NAME = "agent.backend.instrumentation"
LIBRARY_VERSION = "0.1.0"


class GoogleAdkInstrumentor(CommonInstrumentor):
    """An instrumentor for Google Agent Development Kit (ADK).

    This instrumentor patches Google ADK to:
    - Prevent ADK from creating its own telemetry spans
    - Create Phare spans for agent runs, LLM calls, and tool calls
    - Properly extract and index message content and tool interactions
    """

    def __init__(self):
        """Initialize the Google ADK instrumentor."""
        # Create instrumentor config
        config = InstrumentorConfig(
            library_name=LIBRARY_NAME,
            library_version=LIBRARY_VERSION,
            wrapped_methods=[],  # We use patching instead of wrapping
            metrics_enabled=True,
            dependencies=["google-adk >= 0.1.0"],
        )

        super().__init__(config)

    def _create_metrics(self, meter: Meter) -> Dict[str, Any]:
        """Create metrics for the instrumentor.

        Returns a dictionary of metric name to metric instance.
        """
        # Create standard metrics for LLM operations
        return StandardMetrics.create_standard_metrics(meter)

    def _custom_wrap(self, **kwargs):
        """Apply custom patching for Google ADK.

        This is called after normal wrapping, but we use it for patching
        since we don't have normal wrapped methods.
        """
        # Apply patches with our tracer
        patch_adk(self._tracer)
        logger.info("Google ADK instrumentation enabled")

    def _custom_unwrap(self, **kwargs):
        """Remove custom patching from Google ADK.

        This method removes all patches and restores ADK's original behavior.
        """
        unpatch_adk()
        logger.info("Google ADK instrumentation disabled")


"""
Phare enums for user-friendly API.

This module provides simple enums that users can import from phare
without needing to know about OpenTelemetry internals.
"""

from enum import Enum
from opentelemetry.trace.status import StatusCode


class TraceState(Enum):
    """
    Enum for trace end states.

    This provides a user-friendly interface that maps to OpenTelemetry StatusCode internally.
    Users can simply use phare.TraceState.SUCCESS instead of importing OpenTelemetry.
    """

    SUCCESS = StatusCode.OK
    ERROR = StatusCode.ERROR
    UNSET = StatusCode.UNSET

    def __str__(self) -> str:
        """Return the name for string representation."""
        return self.name

    def to_status_code(self) -> StatusCode:
        """Convert to OpenTelemetry StatusCode."""
        return self.value


# For backward compatibility, also provide these as module-level constants
SUCCESS = TraceState.SUCCESS
ERROR = TraceState.ERROR
UNSET = TraceState.UNSET



class TracingCore:
    """
    Central component for tracing in Phare.

    This class manages the creation, processing, and export of spans.
    It handles provider management, span creation, and context propagation.
    """

    def __init__(self) -> None:
        """Initialize the tracing core."""
        self.provider: Optional[TracerProvider] = None
        self._meter_provider: Optional[MeterProvider] = None
        self._initialized = False
        self._config: Optional[TracingConfig] = None
        self._span_processors: list = []
        self._active_traces: dict = {}
        self._traces_lock = threading.Lock()
        self._jwt_provider: Optional[Callable[[], Optional[str]]] = None

        # Register shutdown handler
        atexit.register(self.shutdown)

    def initialize(self, jwt_provider: Optional[Callable[[], Optional[str]]] = None, **kwargs: Any) -> None:
        """
        Initialize the tracing core with the given configuration.

        Args:
            jwt_provider: Function that returns the current JWT token
            **kwargs: Configuration parameters for tracing
                service_name: Name of the service
                exporter: Custom span exporter
                processor: Custom span processor
                exporter_endpoint: Endpoint for the span exporter
                max_queue_size: Maximum number of spans to queue before forcing a flush
                max_wait_time: Maximum time in milliseconds to wait before flushing
                api_key: API key for authentication (required for authenticated exporter)
                project_id: Project ID to include in resource attributes
        """
        if self._initialized:
            return

        # Store JWT provider for potential updates
        self._jwt_provider = jwt_provider

        # Set default values for required fields
        kwargs.setdefault("service_name", "phare")
        kwargs.setdefault("exporter_endpoint", "https://otlp.phare.ai/v1/traces")
        kwargs.setdefault("metrics_endpoint", "https://otlp.phare.ai/v1/metrics")
        kwargs.setdefault("max_queue_size", 512)
        kwargs.setdefault("max_wait_time", 5000)
        kwargs.setdefault("export_flush_interval", 1000)

        # Create a TracingConfig from kwargs with proper defaults
        config: TracingConfig = {
            "service_name": kwargs["service_name"],
            "exporter_endpoint": kwargs["exporter_endpoint"],
            "metrics_endpoint": kwargs["metrics_endpoint"],
            "max_queue_size": kwargs["max_queue_size"],
            "max_wait_time": kwargs["max_wait_time"],
            "export_flush_interval": kwargs["export_flush_interval"],
            "api_key": kwargs.get("api_key"),
            "project_id": kwargs.get("project_id"),
        }

        self._config = config

        # Setup telemetry using the extracted configuration
        provider, meter_provider = setup_telemetry(
            service_name=config["service_name"] or "",
            project_id=config.get("project_id"),
            exporter_endpoint=config["exporter_endpoint"],
            metrics_endpoint=config["metrics_endpoint"],
            max_queue_size=config["max_queue_size"],
            max_wait_time=config["max_wait_time"],
            export_flush_interval=config["export_flush_interval"],
            jwt_provider=jwt_provider,
        )

        self.provider = provider
        self._meter_provider = meter_provider

        self._initialized = True
        logger.debug("Tracing core initialized")

    def update_config(self, config_updates: Dict[str, Any]) -> None:
        """
        Update the tracing configuration.

        Args:
            config_updates: Dictionary of configuration updates
        """
        if not self._initialized:
            logger.warning("Cannot update config: tracer not initialized")
            return

        if self._config:
            # Update the stored config
            self._config.update(config_updates)

            # Update resource attributes if project_id changed
            if "project_id" in config_updates:
                new_project_id = config_updates["project_id"]
                if new_project_id and new_project_id != "temporary":
                    logger.debug(f"Updating tracer project_id to: {new_project_id}")
                    # Note: OpenTelemetry doesn't easily support updating resource attributes
                    # after initialization, but we can log the change for debugging

    @property
    def initialized(self) -> bool:
        """Check if the tracing core is initialized."""
        return self._initialized

    @property
    def config(self) -> TracingConfig:
        """Get the tracing configuration."""
        if self._config is None:
            # This case should ideally not be reached if initialized properly
            raise PhareClientNotInitializedException("Tracer config accessed before initialization.")
        return self._config

    def shutdown(self) -> None:
        """Shutdown the tracing core and clean up resources."""
        if not self._initialized:
            return

        try:
            # End all active traces
            with self._traces_lock:
                active_traces = list(self._active_traces.values())
                logger.debug(f"Shutting down tracer with {len(active_traces)} active traces")

            for trace_context in active_traces:
                try:
                    self._end_single_trace(trace_context, "Shutdown")
                except Exception as e:
                    logger.error(f"Error ending trace during shutdown: {e}")

            # Force flush all processors
            self._flush_span_processors()

            # Shutdown providers
            if self.provider:
                self.provider.shutdown()

            if self._meter_provider:
                self._meter_provider.shutdown()

            logger.debug("Tracing core shutdown complete")

        except Exception as e:
            logger.error(f"Error during tracing core shutdown: {e}")

        finally:
            self._initialized = False

    def _flush_span_processors(self) -> None:
        """Helper to force flush all span processors."""
        if not self.provider or not hasattr(self.provider, "force_flush"):
            logger.debug("No provider or provider cannot force_flush.")
            return

        try:
            self.provider.force_flush()  # type: ignore
            logger.debug("Provider force_flush completed.")
        except Exception as e:
            logger.warning(f"Failed to force flush provider's span processors: {e}", exc_info=True)

    def get_tracer(self, name: str = "phare") -> trace.Tracer:
        """
        Get a tracer with the given name.

        Args:
            name: Name of the tracer

        Returns:
            A tracer with the given name
        """
        if not self._initialized:
            raise PhareClientNotInitializedException

        return trace.get_tracer(name)

    @classmethod
    def initialize_from_config(
        cls, config_obj: Any, jwt_provider: Optional[Callable[[], Optional[str]]] = None, **kwargs: Any
    ) -> None:
        """
        Initialize the tracing core from a configuration object.

        Args:
            config: Configuration object (dict or object with dict method)
            jwt_provider: Function that returns the current JWT token
            **kwargs: Additional keyword arguments to pass to initialize
        """
        # Use the global tracer instance instead of getting singleton
        instance = tracer

        # Extract tracing-specific configuration
        # For TracingConfig, we can directly pass it to initialize
        if isinstance(config_obj, dict):
            # If it's already a dict (TracingConfig), use it directly
            tracing_kwargs = config_obj.copy()
        else:
            # For backward compatibility with old Config object
            # Extract tracing-specific configuration from the Config object
            # Use getattr with default values to ensure we don't pass None for required fields
            tracing_kwargs = {
                k: v
                for k, v in {
                    "exporter": getattr(config_obj, "exporter", None),
                    "processor": getattr(config_obj, "processor", None),
                    "exporter_endpoint": getattr(config_obj, "exporter_endpoint", None),
                    "max_queue_size": getattr(config_obj, "max_queue_size", 512),
                    "max_wait_time": getattr(config_obj, "max_wait_time", 5000),
                    "export_flush_interval": getattr(config_obj, "export_flush_interval", 1000),
                    "api_key": getattr(config_obj, "api_key", None),
                    "project_id": getattr(config_obj, "project_id", None),
                    "endpoint": getattr(config_obj, "endpoint", None),
                }.items()
                if v is not None
            }
        # Update with any additional kwargs
        tracing_kwargs.update(kwargs)

        # Initialize with the extracted configuration
        instance.initialize(jwt_provider=jwt_provider, **tracing_kwargs)

        # Span types are registered in the constructor
        # No need to register them here anymore

    def start_trace(
        self, trace_name: str = "session", tags: Optional[dict | list] = None, is_init_trace: bool = False
    ) -> Optional[TraceContext]:
        """
        Starts a new trace (root span) and returns its context.

        Args:
            trace_name: Name for the trace (e.g., "session", "my_custom_trace").
            tags: Optional tags to attach to the trace span.
            is_init_trace: Internal flag to mark if this is the automatically started init trace.

        Returns:
            A TraceContext object containing the span and context token, or None if not initialized.
        """
        if not self.initialized:
            logger.warning("Global tracer not initialized. Cannot start trace.")
            return None

        # Build trace attributes
        attributes = get_trace_attributes(tags=tags)
        # Include system metadata only for the default session trace
        if trace_name == "session":
            attributes.update(get_system_resource_attributes())

        # make_span creates and starts the span, and activates it in the current context
        # It returns: span, context_object, context_token
        span, _, context_token = self.make_span(trace_name, span_kind=SpanKind.SESSION, attributes=attributes)
        logger.debug(f"Trace '{trace_name}' started with span ID: {span.get_span_context().span_id}")

        # # Log the session replay URL for this new trace
        # try:
        #     log_trace_url(span, title=trace_name)
        # except Exception as e:
        #     logger.warning(f"Failed to log trace URL for '{trace_name}': {e}")

        trace_context = TraceContext(span, token=context_token, is_init_trace=is_init_trace)

        # Track the active trace
        with self._traces_lock:
            try:
                trace_id = f"{span.get_span_context().trace_id:x}"
            except (TypeError, ValueError):
                # Handle case where span is mocked or trace_id is not a valid integer
                trace_id = str(span.get_span_context().trace_id)
            self._active_traces[trace_id] = trace_context
            logger.debug(f"Added trace {trace_id} to active traces. Total active: {len(self._active_traces)}")

        return trace_context

    def end_trace(
        self, trace_context: Optional[TraceContext] = None, end_state: Union[Any, StatusCode, str] = None
    ) -> None:
        """
        Ends a trace (its root span) and finalizes it.
        If no trace_context is provided, ends all active session spans.

        Args:
            trace_context: The TraceContext object returned by start_trace. If None, ends all active traces.
            end_state: The final state of the trace (e.g., "Success", "Indeterminate", "Error").
        """
        if not self.initialized:
            logger.warning("Global tracer not initialized. Cannot end trace.")
            return

        # Set default if not provided
        if end_state is None:
            end_state = TraceState.SUCCESS

        # If no specific trace_context provided, end all active traces
        if trace_context is None:
            with self._traces_lock:
                active_traces = list(self._active_traces.values())
                logger.debug(f"Ending all {len(active_traces)} active traces with state: {end_state}")

            for active_trace in active_traces:
                self._end_single_trace(active_trace, end_state)
            return

        # End specific trace
        self._end_single_trace(trace_context, end_state)

    def _end_single_trace(self, trace_context: TraceContext, end_state: Union[Any, StatusCode, str]) -> None:
        """
        Internal method to end a single trace.

        Args:
            trace_context: The TraceContext object to end.
            end_state: The final state of the trace.
        """
        if not trace_context or not trace_context.span:
            logger.warning("Invalid TraceContext or span provided to end trace.")
            return

        span = trace_context.span
        token = trace_context.token
        try:
            trace_id = f"{span.get_span_context().trace_id:x}"
        except (TypeError, ValueError):
            # Handle case where span is mocked or trace_id is not a valid integer
            trace_id = str(span.get_span_context().trace_id)

        # Convert TraceState enum to StatusCode if needed
        if isinstance(end_state, TraceState):
            # It's a TraceState enum
            state_str = str(end_state)
        elif isinstance(end_state, StatusCode):
            # It's already a StatusCode
            state_str = str(end_state)
        else:
            # It's a string (legacy)
            state_str = str(end_state)

        logger.debug(f"Ending trace with span ID: {span.get_span_context().span_id}, end_state: {state_str}")

        try:
            # Build and set session end attributes
            end_attributes = get_session_end_attributes(end_state)
            for key, value in end_attributes.items():
                span.set_attribute(key, value)
            self.finalize_span(span, token=token)

            # Remove from active traces
            with self._traces_lock:
                if trace_id in self._active_traces:
                    del self._active_traces[trace_id]
                    logger.debug(f"Removed trace {trace_id} from active traces. Remaining: {len(self._active_traces)}")

            # For root spans (traces), we might want an immediate flush after they end.
            self._flush_span_processors()

            # Log the session replay URL again after the trace has ended
            # The span object should still contain the necessary context (trace_id)
            # try:
            #     # Use span.name as the title, which should reflect the original trace_name
            #     log_trace_url(span, title=span.name)
            # except Exception as e:
            #     logger.warning(f"Failed to log trace URL after ending trace '{span.name}': {e}")

        except Exception as e:
            logger.error(f"Error ending trace: {e}", exc_info=True)

    def make_span(
        self,
        operation_name: str,
        span_kind: str,
        version: Optional[int] = None,
        attributes: Optional[Dict[str, Any]] = None,
    ) -> tuple:
        """
        Create a span without context management for manual span lifecycle control.

        This function creates a span that will be properly nested within any parent span
        based on the current execution context, but requires manual ending via finalize_span.

        Args:
            operation_name: Name of the operation being traced
            span_kind: Type of operation (from SpanKind)
            version: Optional version identifier for the operation
            attributes: Optional dictionary of attributes to set on the span

        Returns:
            A tuple of (span, context, token) where:
            - span is the created span
            - context is the span context
            - token is the context token needed for detaching
        """
        # Create span with proper naming convention
        span_name = f"{operation_name}.{span_kind}"

        # Get tracer
        tracer = self.get_tracer()

        # Build span attributes using the attribute helper
        attributes = get_span_attributes(
            operation_name=operation_name,
            span_kind=span_kind,
            version=version,
            **(attributes or {}),
        )

        current_context = context_api.get_current()

        # Create the span with proper context management
        if span_kind == SpanKind.SESSION:
            # For session spans, create as a root span
            span = tracer.start_span(span_name, attributes=attributes)
        else:
            # For other spans, use the current context
            span = tracer.start_span(span_name, context=current_context, attributes=attributes)

        # Set as current context and get token for detachment
        ctx = trace.set_span_in_context(span)
        token = context_api.attach(ctx)

        return span, ctx, token

    def finalize_span(self, span: trace.Span, token: Any) -> None:
        """
        Finalizes a span and cleans up its context.

        This function performs three critical tasks needed for proper span lifecycle management:
        1. Ends the span to mark it complete and calculate its duration
        2. Detaches the context token to prevent memory leaks and maintain proper context hierarchy
        3. Forces immediate span export rather than waiting for batch processing

        Use cases:
        - Session span termination: Ensures root spans are properly ended and exported
        - Shutdown handling: Ensures spans are flushed during application termination
        - Async operations: Finalizes spans from asynchronous execution contexts

        Without proper finalization, spans may not trigger on_end events in processors,
        potentially resulting in missing or incomplete telemetry data.

        Args:
            span: The span to finalize
            token: The context token to detach
        """
        # End the span
        if span:
            try:
                span.end()
            except Exception as e:
                logger.warning(f"Error ending span: {e}")

        # Detach context token if provided
        if token:
            try:
                context_api.detach(token)
            except Exception:
                pass

        # Try to flush span processors
        # Note: force_flush() might not be available in certain scenarios:
        # - During application shutdown when the provider may be partially destroyed
        # We use try/except to gracefully handle these cases while ensuring spans are
        # flushed when possible, which is especially critical for session spans.
        try:
            if self.provider:
                self.provider.force_flush()
        except (AttributeError, Exception):
            # Either force_flush doesn't exist or there was an error calling it
            pass

    def get_active_traces(self) -> Dict[str, TraceContext]:
        """
        Get a copy of currently active traces.

        Returns:
            Dictionary mapping trace IDs to TraceContext objects.
        """
        with self._traces_lock:
            return self._active_traces.copy()

    def get_active_trace_count(self) -> int:
        """
        Get the number of currently active traces.

        Returns:
            Number of active traces.
        """
        with self._traces_lock:
            return len(self._active_traces)


# Global tracer instance; one per process runtime
tracer = TracingCore()

from dataclasses import dataclass
from packaging.version import Version, parse
from types import ModuleType
import importlib
from opentelemetry.instrumentation.instrumentor import BaseInstrumentor  # type: ignore


def get_library_version(package_name: str, default_version: str = "unknown") -> str:
    """Get the version of a library package.

    Attempts to retrieve the installed version of a package using importlib.metadata.
    Falls back to the default version if the version cannot be determined.

    Args:
        package_name: The name of the package to get the version for (as used in pip/importlib.metadata)
        default_version: The default version to return if the package version cannot be found

    Returns:
        The version string of the package or the default version

    Examples:
        >>> get_library_version("openai")
        "1.0.0"

        >>> get_library_version("nonexistent-package")
        "unknown"

        >>> get_library_version("ibm-watsonx-ai", "1.3.11")
        "1.3.11"  # If not found
    """
    try:
        from importlib.metadata import version

        return version(package_name)
    except (ImportError, Exception) as e:
        logger.debug(f"Could not find {package_name} version: {e}")
        return default_version



@dataclass
class InstrumentorLoader:
    """
    Represents a dynamically-loadable instrumentor.
    Handles version checking and instantiation of instrumentors.
    """

    """
        "module_name": "agent.backend.instrumentation.instrumentor",
        "class_name": "GoogleAdkInstrumentor"
        "min_version": "0.1.0"
    """
    module_name: str
    class_name: str
    min_version: str
    package_name: Optional[str] = None  # Optional: actual pip package name

    @property
    def module(self) -> ModuleType:
        """Get the instrumentor module."""
        return importlib.import_module(self.module_name)

    @property
    def should_activate(self) -> bool:
        """Check if the package is available and meets version requirements."""
        try:
            # Special case for stdlib modules (like concurrent.futures)
            if self.package_name == "python":
                import sys

                python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
                return Version(python_version) >= parse(self.min_version)

            # Use explicit package_name if provided, otherwise derive from module_name
            if self.package_name:
                provider_name = self.package_name
            else:
                provider_name = self.module_name.split(".")[-1]

            # Use common version utility
            module_version = get_library_version(provider_name)
            return module_version != "unknown" and Version(module_version) >= parse(self.min_version)
        except Exception:
            return False

    def get_instance(self) -> BaseInstrumentor:
        """Create and return a new instance of the instrumentor."""
        return getattr(self.module, self.class_name)()

import builtins

# Module-level state variables
_active_instrumentors: list[BaseInstrumentor] = []
_original_builtins_import = builtins.__import__  # Store original import
_instrumenting_packages: Set[str] = set()
_has_agentic_library: bool = False



# Configuration for supported LLM providers
PROVIDERS = {
    # "openai": {
    #     "module_name": "phare.instrumentation.providers.openai",
    #     "class_name": "OpenaiInstrumentor",
    #     "min_version": "1.0.0",
    # },
    # "anthropic": {
    #     "module_name": "phare.instrumentation.providers.anthropic",
    #     "class_name": "AnthropicInstrumentor",
    #     "min_version": "0.32.0",
    # },
    # "ibm_watsonx_ai": {
    #     "module_name": "phare.instrumentation.providers.ibm_watsonx_ai",
    #     "class_name": "WatsonxInstrumentor",
    #     "min_version": "0.1.0",
    # },
    # "google.genai": {
    #     "module_name": "phare.instrumentation.providers.google_genai",
    #     "class_name": "GoogleGenaiInstrumentor",
    #     "min_version": "0.1.0",
    #     "package_name": "google-genai",  # Actual pip package name
    # },
    # "mem0": {
    #     "module_name": "phare.instrumentation.providers.mem0",
    #     "class_name": "Mem0Instrumentor",
    #     "min_version": "0.1.0",
    #     "package_name": "mem0ai",
    # },
}

# Configuration for supported agentic libraries
AGENTIC_LIBRARIES = {
    # "crewai": {
    #     "module_name": "phare.instrumentation.agentic.crewai",
    #     "class_name": "CrewaiInstrumentor",
    #     "min_version": "0.56.0",
    # },
    # "autogen": {
    #     "module_name": "phare.instrumentation.agentic.ag2",
    #     "class_name": "AG2Instrumentor",
    #     "min_version": "0.3.2",
    # },
    # "agents": {
    #     "module_name": "phare.instrumentation.agentic.openai_agents",
    #     "class_name": "OpenAIAgentsInstrumentor",
    #     "min_version": "0.0.1",
    # },
    "google.adk": {
        "module_name": "agent.backend.instrumentation.instrumentor",
        "class_name": "GoogleAdkInstrumentor",
        "min_version": "0.1.0",
    },
    # "agno": {
    #     "module_name": "phare.instrumentation.agentic.agno",
    #     "class_name": "AgnoInstrumentor",
    #     "min_version": "1.5.8",
    # },
    # "smolagents": {
    #     "module_name": "phare.instrumentation.agentic.smolagents",
    #     "class_name": "SmolagentsInstrumentor",
    #     "min_version": "1.0.0",
    # },
    # "langgraph": {
    #     "module_name": "phare.instrumentation.agentic.langgraph",
    #     "class_name": "LanggraphInstrumentor",
    #     "min_version": "0.2.0",
    # },
    # "xpander_sdk": {
    #     "module_name": "phare.instrumentation.agentic.xpander",
    #     "class_name": "XpanderInstrumentor",
    #     "min_version": "1.0.0",
    #     "package_name": "xpander-sdk",
    # },
    # "haystack": {
    #     "module_name": "phare.instrumentation.agentic.haystack",
    #     "class_name": "HaystackInstrumentor",
    #     "min_version": "2.0.0",
    #     "package_name": "haystack-ai",
    # },
}

# Combine all target packages for monitoring
TARGET_PACKAGES = set(PROVIDERS.keys()) | set(AGENTIC_LIBRARIES.keys())

# Create a single instance of the manager
# _manager = InstrumentationManager() # Removed

# Module-level state variables
_active_instrumentors: list[BaseInstrumentor] = []
_original_builtins_import = builtins.__import__  # Store original import
_instrumenting_packages: Set[str] = set()
_has_agentic_library: bool = False

import site

# New helper function to check module origin
def _is_installed_package(module_obj: ModuleType, package_name_key: str) -> bool:
    """
    Determines if the given module object corresponds to an installed site-package
    rather than a local module, especially when names might collide.
    `package_name_key` is the key from TARGET_PACKAGES (e.g., 'agents', 'google.adk').
    """
    if not hasattr(module_obj, "__file__") or not module_obj.__file__:
        logger.debug(
            f"_is_installed_package: Module '{package_name_key}' has no __file__, assuming it might be an SDK namespace package. Returning True."
        )
        return True

    module_path = os.path.normcase(os.path.realpath(os.path.abspath(module_obj.__file__)))

    # Priority 1: Check if it's in any site-packages directory.
    site_packages_dirs = site.getsitepackages()
    if isinstance(site_packages_dirs, str):
        site_packages_dirs = [site_packages_dirs]

    if hasattr(site, "USER_SITE") and site.USER_SITE and os.path.exists(site.USER_SITE):
        site_packages_dirs.append(site.USER_SITE)

    normalized_site_packages_dirs = [
        os.path.normcase(os.path.realpath(p)) for p in site_packages_dirs if p and os.path.exists(p)
    ]

    for sp_dir in normalized_site_packages_dirs:
        if module_path.startswith(sp_dir):
            logger.debug(
                f"_is_installed_package: Module '{package_name_key}' is a library, instrumenting '{package_name_key}'."
            )
            return True

    # Priority 2: If not in site-packages, it's highly likely a local module or not an SDK we target.
    logger.debug(f"_is_installed_package: Module '{package_name_key}' is a local module, skipping instrumentation.")
    return False


def _is_package_instrumented(package_name: str) -> bool:
    """Check if a package is already instrumented by looking at active instrumentors."""
    # Handle package.module names by converting dots to underscores for comparison
    normalized_target_name = package_name.replace(".", "_").lower()
    for instrumentor in _active_instrumentors:
        # Check based on the key it was registered with
        if (
            hasattr(instrumentor, "_phare_instrumented_package_key")
            and instrumentor._phare_instrumented_package_key == package_name
        ):
            return True

        # Fallback to class name check (existing logic, less precise)
        # We use split('.')[-1] for cases like 'google.genai' to match GenAIInstrumentor
        instrumentor_class_name_prefix = instrumentor.__class__.__name__.lower().replace("instrumentor", "")
        target_base_name = package_name.split(".")[-1].lower()
        normalized_class_name_match = (
            normalized_target_name.startswith(instrumentor_class_name_prefix)
            or target_base_name == instrumentor_class_name_prefix
        )

        if normalized_class_name_match:
            # This fallback can be noisy, let's make it more specific or rely on the key above more
            # For now, if the key matches or this broad name match works, consider instrumented.
            # This helps if _phare_instrumented_package_key was somehow not set.
            return True

    return False


def _uninstrument_providers():
    """Uninstrument all provider instrumentors while keeping agentic libraries active."""
    global _active_instrumentors
    new_active_instrumentors = []
    uninstrumented_any = False
    for instrumentor in _active_instrumentors:
        instrumented_key = getattr(instrumentor, "_phare_instrumented_package_key", None)
        if instrumented_key and instrumented_key in PROVIDERS:
            try:
                instrumentor.uninstrument()
                logger.debug(
                    f"Phare: Uninstrumented provider: {instrumentor.__class__.__name__} (for package '{instrumented_key}') due to agentic library activation."
                )
                uninstrumented_any = True
            except Exception as e:
                logger.error(f"Error uninstrumenting provider {instrumentor.__class__.__name__}: {e}")
        else:
            # Keep non-provider instrumentors or those without our key (shouldn't happen for managed ones)
            new_active_instrumentors.append(instrumentor)

    if uninstrumented_any or not new_active_instrumentors and _active_instrumentors:
        logger.debug(
            f"_uninstrument_providers: Processed. Previous active: {len(_active_instrumentors)}, New active after filtering providers: {len(new_active_instrumentors)}"
        )
    _active_instrumentors = new_active_instrumentors


def _should_instrument_package(package_name: str) -> bool:
    """
    Determine if a package should be instrumented based on current state.
    Handles special cases for agentic libraries and providers.
    """
    global _has_agentic_library

    # If already instrumented by Phare (using our refined check), skip.
    if _is_package_instrumented(package_name):
        logger.debug(f"_should_instrument_package: '{package_name}' already instrumented by Phare. Skipping.")
        return False

    is_target_agentic = package_name in AGENTIC_LIBRARIES
    is_target_provider = package_name in PROVIDERS

    if not is_target_agentic and not is_target_provider:
        logger.debug(
            f"_should_instrument_package: '{package_name}' is not a targeted provider or agentic library. Skipping."
        )
        return False

    if _has_agentic_library:
        # An agentic library is already active.
        if is_target_agentic:
            logger.debug(
                f"Phare: An agentic library is active. Skipping instrumentation for subsequent agentic library '{package_name}'."
            )
            return False
        if is_target_provider:
            logger.debug(
                f"Phare: An agentic library is active. Skipping instrumentation for provider '{package_name}'."
            )
            return False
    else:
        # No agentic library is active yet.
        if is_target_agentic:
            logger.debug(
                f"Phare: '{package_name}' is the first-targeted agentic library. Will uninstrument providers if any are/become active."
            )
            _uninstrument_providers()
            return True
        if is_target_provider:
            logger.debug(
                f"_should_instrument_package: '{package_name}' is a provider, no agentic library active. Allowing."
            )
            return True

    logger.debug(
        f"_should_instrument_package: Defaulting to False for '{package_name}' (state: _has_agentic_library={_has_agentic_library})"
    )
    return False


def _perform_instrumentation(package_name: str):
    """Helper function to perform instrumentation for a given package."""
    global _instrumenting_packages, _active_instrumentors, _has_agentic_library
    if not _should_instrument_package(package_name):
        return

    # Get the appropriate configuration for the package
    # Ensure package_name is a key in either PROVIDERS or AGENTIC_LIBRARIES
    if package_name not in PROVIDERS and package_name not in AGENTIC_LIBRARIES:
        logger.debug(
            f"_perform_instrumentation: Package '{package_name}' not found in PROVIDERS or AGENTIC_LIBRARIES. Skipping."
        )
        return

    config = PROVIDERS.get(package_name) or AGENTIC_LIBRARIES.get(package_name)
    loader = InstrumentorLoader(**config)

    # instrument_one already checks loader.should_activate
    instrumentor_instance = instrument_one(loader)
    if instrumentor_instance is not None:
        # Check if it was *actually* instrumented by instrument_one by seeing if the instrument method was called successfully.
        # This relies on instrument_one returning None if its internal .instrument() call failed (if we revert that, this needs adjustment)
        # For now, assuming instrument_one returns instance only on full success.
        # User request was to return instrumentor even if .instrument() fails. So, we check if _phare_instrumented_package_key was set by us.

        # Let's assume instrument_one might return an instance whose .instrument() failed.
        # The key is set before _active_instrumentors.append, so if it's already there and matches, it means it's a re-attempt on the same package.
        # The _is_package_instrumented check at the start of _should_instrument_package should prevent most re-entry for the same package_name.

        # Store the package key this instrumentor is for, to aid _is_package_instrumented
        instrumentor_instance._phare_instrumented_package_key = package_name

        # Add to active_instrumentors only if it's not a duplicate in terms of package_key being instrumented
        # This is a safeguard, _is_package_instrumented should catch this earlier.
        is_newly_added = True
        for existing_inst in _active_instrumentors:
            if (
                hasattr(existing_inst, "_phare_instrumented_package_key")
                and existing_inst._phare_instrumented_package_key == package_name
            ):
                is_newly_added = False
                logger.debug(
                    f"_perform_instrumentation: Instrumentor for '{package_name}' already in _active_instrumentors. Not adding again."
                )
                break
        if is_newly_added:
            _active_instrumentors.append(instrumentor_instance)

        # If this was an agentic library AND it's newly effectively instrumented.
        if (
            package_name in AGENTIC_LIBRARIES and not _has_agentic_library
        ):  # Check _has_agentic_library to ensure this is the *first* one.
            # _uninstrument_providers() was already called in _should_instrument_package for the first agentic library.
            _has_agentic_library = True

        # # Special case: If mem0 is instrumented, also instrument concurrent.futures
        # if (package_name == "mem0" or package_name == "autogen") and is_newly_added:
        #     try:
        #         # Check if concurrent.futures module is available

        #         # Create config for concurrent.futures instrumentor
        #         concurrent_config = {
        #             module_name="phare.instrumentation.utilities.concurrent_futures",
        #             class_name="ConcurrentFuturesInstrumentor",
        #             min_version="3.7.0",  # Python 3.7+ (concurrent.futures is stdlib)
        #             package_name="python",  # Special case for stdlib modules
        #         }

        #         # Create and instrument concurrent.futures
        #         concurrent_loader = InstrumentorLoader(**concurrent_config)
        #         concurrent_instrumentor = instrument_one(concurrent_loader)

        #         if concurrent_instrumentor is not None:
        #             concurrent_instrumentor._phare_instrumented_package_key = "concurrent.futures"
        #             _active_instrumentors.append(concurrent_instrumentor)
        #             logger.debug("Phare: Instrumented concurrent.futures as a dependency of mem0.")
        #     except Exception as e:
        #         logger.debug(f"Could not instrument concurrent.futures for mem0: {e}")
    else:
        logger.debug(
            f"_perform_instrumentation: instrument_one for '{package_name}' returned None. Not added to active instrumentors."
        )



def _import_monitor(name: str, globals_dict=None, locals_dict=None, fromlist=(), level=0):
    """
    Monitor imports and instrument packages as they are imported.
    This replaces the built-in import function to intercept package imports.
    """
    global _instrumenting_packages, _has_agentic_library

    # If an agentic library is already instrumented, skip all further instrumentation
    if _has_agentic_library:
        return _original_builtins_import(name, globals_dict, locals_dict, fromlist, level)

    # First, do the actual import
    module = _original_builtins_import(name, globals_dict, locals_dict, fromlist, level)

    # Check for exact matches first (handles package.module like google.adk)
    packages_to_check = set()

    # Check the imported module itself
    if name in TARGET_PACKAGES:
        packages_to_check.add(name)
    else:
        # Check if any target package is a prefix of the import name
        for target in TARGET_PACKAGES:
            if name.startswith(target + ".") or name == target:
                packages_to_check.add(target)

    # For "from X import Y" style imports, also check submodules
    if fromlist:
        for item in fromlist:
            # Construct potential full name, e.g., "google.adk" from name="google", item="adk"
            # Or if name="os", item="path", full_name="os.path"
            # If the original name itself is a multi-part name like "a.b", and item is "c", then "a.b.c"
            # This logic needs to correctly identify the root package if 'name' is already a sub-package.
            # The existing TARGET_PACKAGES check is simpler: it checks against pre-defined full names.

            # Check full name if item forms part of a target package name
            full_item_name_candidate = f"{name}.{item}"

            if full_item_name_candidate in TARGET_PACKAGES:
                packages_to_check.add(full_item_name_candidate)
            else:  # Fallback to checking if 'name' itself is a target
                for target in TARGET_PACKAGES:
                    if name == target or name.startswith(target + "."):
                        packages_to_check.add(target)  # Check the base target if a submodule is imported from it.

    # Instrument all matching packages
    for package_to_check in packages_to_check:
        if package_to_check not in _instrumenting_packages and not _is_package_instrumented(package_to_check):
            target_module_obj = sys.modules.get(package_to_check)

            if target_module_obj:
                is_sdk = _is_installed_package(target_module_obj, package_to_check)
                if not is_sdk:
                    logger.debug(
                        f"Phare: Target '{package_to_check}' appears to be a local module/directory. Skipping Phare SDK instrumentation for it."
                    )
                    continue
            else:
                logger.debug(
                    f"_import_monitor: No module object found in sys.modules for '{package_to_check}', proceeding with SDK instrumentation attempt."
                )

            _instrumenting_packages.add(package_to_check)
            try:
                _perform_instrumentation(package_to_check)
                # If we just instrumented an agentic library, stop
                if _has_agentic_library:
                    break
            except Exception as e:
                logger.error(f"Error instrumenting {package_to_check}: {str(e)}")
            finally:
                _instrumenting_packages.discard(package_to_check)

    return module


def instrument_all():
    """Start monitoring and instrumenting packages if not already started."""
    # Check if active_instrumentors is empty, as a proxy for not started.
    if not _active_instrumentors:
        builtins.__import__ = _import_monitor
        global _instrumenting_packages, _has_agentic_library

        # If an agentic library is already instrumented, don't instrument anything else
        if _has_agentic_library:
            return

        for name in list(sys.modules.keys()):
            # Stop if an agentic library gets instrumented during the loop
            if _has_agentic_library:
                break

            module = sys.modules.get(name)
            if not isinstance(module, ModuleType):
                continue

            # Check for exact matches first (handles package.module like google.adk)
            package_to_check = None
            if name in TARGET_PACKAGES:
                package_to_check = name
            else:
                # Check if any target package is a prefix of the module name
                for target in TARGET_PACKAGES:
                    if name.startswith(target + ".") or name == target:
                        package_to_check = target
                        break

            if (
                package_to_check
                and package_to_check not in _instrumenting_packages
                and not _is_package_instrumented(package_to_check)
            ):
                target_module_obj = sys.modules.get(package_to_check)

                if target_module_obj:
                    is_sdk = _is_installed_package(target_module_obj, package_to_check)
                    if not is_sdk:
                        continue
                else:
                    logger.debug(
                        f"instrument_all: No module object found for '{package_to_check}' in sys.modules during startup scan. Proceeding cautiously."
                    )

                _instrumenting_packages.add(package_to_check)
                try:
                    _perform_instrumentation(package_to_check)
                except Exception as e:
                    logger.error(f"Error instrumenting {package_to_check}: {str(e)}")
                finally:
                    _instrumenting_packages.discard(package_to_check)



def instrument_one(loader: InstrumentorLoader) -> Optional[BaseInstrumentor]:
    """
    Instrument a single package using the provided loader.
    Returns the instrumentor instance if successful, None otherwise.
    """
    if not loader.should_activate:
        # This log is important for users to know why something wasn't instrumented.
        logger.debug(
            f"Phare: Package '{loader.package_name or loader.module_name}' not found or version is less than minimum required ('{loader.min_version}'). Skipping instrumentation."
        )
        return None

    instrumentor = loader.get_instance()
    try:
        # Use the provider directly from the global tracer instance
        instrumentor.instrument(tracer_provider=tracer.provider)
        logger.debug(
            f"Phare: Successfully instrumented '{loader.class_name}' for package '{loader.package_name or loader.module_name}'."
        )
    except Exception as e:
        logger.error(
            f"Failed to instrument {loader.class_name} for {loader.package_name or loader.module_name}: {e}",
            exc_info=True,
        )
    return instrumentor



import atexit
import threading
from typing import Optional, Any, Dict, Union, Callable

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider, Span
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry import context as context_api

from opentelemetry.trace.status import StatusCode


# """
# Helpers for interacting with the Phare dashboard.
# """

# from typing import Union, Optional
# from termcolor import colored
# from opentelemetry.sdk.trace import Span, ReadableSpan
# from phare.logging import logger


# def get_trace_url(span: Union[Span, ReadableSpan]) -> str:
#     """
#     Generate a trace URL for a direct link to the session on the Phare dashboard.

#     Args:
#         span: The span to generate the URL for.

#     Returns:
#         The session URL.
#     """
#     trace_id: Union[int, str] = span.context.trace_id

#     # Convert trace_id to hex string if it's not already
#     # We don't add dashes to this to format it as a UUID since the dashboard doesn't either
#     if isinstance(trace_id, int):
#         trace_id = format(trace_id, "032x")

#     # Get the app_url from the config - import here to avoid circular imports
#     from phare import get_client

#     app_url = get_client().config.app_url

#     return f"{app_url}/sessions?trace_id={trace_id}"


# def log_trace_url(span: Union[Span, ReadableSpan], title: Optional[str] = None) -> None:
#     """
#     Log the trace URL for the Phare dashboard.

#     Args:
#         span: The span to log the URL for.
#         title: Optional title for the trace.
#     """
#     from phare import get_client

#     try:
#         client = get_client()
#         if not client.config.log_session_replay_url:
#             return
#     except Exception:
#         return

#     session_url = get_trace_url(span)
#     logger.info(colored(f"\x1b[34mSession Replay for {title} trace: {session_url}\x1b[0m", "blue"))


from enum import Enum


class PhareSpanKindValues(Enum):
    """Standard span kind values for Phare."""

    WORKFLOW = "workflow"
    SESSION = "session"
    TASK = "task"
    OPERATION = "operation"
    AGENT = "agent"
    TOOL = "tool"
    LLM = "llm"
    CHAIN = "chain"
    TEXT = "text"
    GUARDRAIL = "guardrail"
    HTTP = "http"
    UNKNOWN = "unknown"

# Legacy SpanKind class for backward compatibility
class SpanKind:
    """Legacy span kind definitions - use PhareSpanKindValues instead."""

    # Agent action kinds
    AGENT_ACTION = "agent.action"  # Agent performing an action
    AGENT_THINKING = "agent.thinking"  # Agent reasoning/planning
    AGENT_DECISION = "agent.decision"  # Agent making a decision

    # LLM interaction kinds
    LLM_CALL = "llm.call"  # LLM API call

    # Workflow kinds
    WORKFLOW_STEP = "workflow.step"  # Step in a workflow
    WORKFLOW = PhareSpanKindValues.WORKFLOW.value
    SESSION = PhareSpanKindValues.SESSION.value
    TASK = PhareSpanKindValues.TASK.value
    OPERATION = PhareSpanKindValues.OPERATION.value
    AGENT = PhareSpanKindValues.AGENT.value
    TOOL = PhareSpanKindValues.TOOL.value
    LLM = PhareSpanKindValues.LLM.value
    UNKNOWN = PhareSpanKindValues.UNKNOWN.value
    CHAIN = PhareSpanKindValues.CHAIN.value
    TEXT = PhareSpanKindValues.TEXT.value
    GUARDRAIL = PhareSpanKindValues.GUARDRAIL.value
    HTTP = PhareSpanKindValues.HTTP.value



"""
Attribute management for Phare SDK.

This module contains functions that create attributes for various telemetry contexts,
isolating the knowledge of semantic conventions from the core tracing logic.
"""

import platform
import os
from typing import Any, Optional, Union

import psutil  #  type: ignore[import-untyped]

from agent.backend.instrumentation.common.common import ResourceAttributes, SpanAttributes, CoreAttributes
import sys


def get_imported_libraries():
    """
    Get the top-level imported libraries in the current script.

    Returns:
        list: List of imported libraries
    """
    user_libs = []

    builtin_modules = {
        "builtins",
        "sys",
        "os",
        "_thread",
        "abc",
        "io",
        "re",
        "types",
        "collections",
        "enum",
        "math",
        "datetime",
        "time",
        "warnings",
    }

    try:
        main_module = sys.modules.get("__main__")
        if main_module and hasattr(main_module, "__dict__"):
            for name, obj in main_module.__dict__.items():
                if isinstance(obj, type(sys)) and hasattr(obj, "__name__"):
                    mod_name = obj.__name__.split(".")[0]
                    if mod_name and not mod_name.startswith("_") and mod_name not in builtin_modules:
                        user_libs.append(mod_name)
    except Exception as e:
        logger.debug(f"Error getting imports: {e}")

    return user_libs


def get_system_resource_attributes() -> dict[str, Any]:
    """
    Get system resource attributes for telemetry.

    Returns:
        dictionary containing system information attributes
    """
    attributes: dict[str, Any] = {
        ResourceAttributes.HOST_MACHINE: platform.machine(),
        ResourceAttributes.HOST_NAME: platform.node(),
        ResourceAttributes.HOST_NODE: platform.node(),
        ResourceAttributes.HOST_PROCESSOR: platform.processor(),
        ResourceAttributes.HOST_SYSTEM: platform.system(),
        ResourceAttributes.HOST_VERSION: platform.version(),
        ResourceAttributes.HOST_OS_RELEASE: platform.release(),
    }

    # Add CPU stats
    try:
        attributes[ResourceAttributes.CPU_COUNT] = os.cpu_count() or 0
        attributes[ResourceAttributes.CPU_PERCENT] = psutil.cpu_percent(interval=0.1)
    except Exception as e:
        logger.debug(f"Error getting CPU stats: {e}")

    # Add memory stats
    try:
        memory = psutil.virtual_memory()
        attributes[ResourceAttributes.MEMORY_TOTAL] = memory.total
        attributes[ResourceAttributes.MEMORY_AVAILABLE] = memory.available
        attributes[ResourceAttributes.MEMORY_USED] = memory.used
        attributes[ResourceAttributes.MEMORY_PERCENT] = memory.percent
    except Exception as e:
        logger.debug(f"Error getting memory stats: {e}")

    return attributes


def get_global_resource_attributes(
    service_name: str,
    project_id: Optional[str] = None,
) -> dict[str, Any]:
    """
    Get all global resource attributes for telemetry.

    Combines service metadata and imported libraries into a complete
    resource attributes dictionary.

    Args:
        service_name: Name of the service
        project_id: Optional project ID

    Returns:
        dictionary containing all resource attributes
    """
    # Start with service attributes
    attributes: dict[str, Any] = {
        ResourceAttributes.SERVICE_NAME: service_name,
    }

    if project_id:
        attributes[ResourceAttributes.PROJECT_ID] = project_id

    if imported_libraries := get_imported_libraries():
        attributes[ResourceAttributes.IMPORTED_LIBRARIES] = imported_libraries

    return attributes


def get_trace_attributes(tags: Optional[Union[dict[str, Any], list[str]]] = None) -> dict[str, Any]:
    """
    Get attributes for trace spans.

    Args:
        tags: Optional tags to include (dict or list)

    Returns:
        dictionary containing trace attributes
    """
    attributes: dict[str, Any] = {}

    if tags:
        if isinstance(tags, list):
            attributes[CoreAttributes.TAGS] = tags
        elif isinstance(tags, dict):
            attributes.update(tags)  # Add dict tags directly
        else:
            logger.warning(f"Invalid tags format: {tags}. Must be list or dict.")

    return attributes


def get_span_attributes(
    operation_name: str, span_kind: str, version: Optional[int] = None, **kwargs: Any
) -> dict[str, Any]:
    """
    Get attributes for operation spans.

    Args:
        operation_name: Name of the operation being traced
        span_kind: Type of operation (from SpanKind)
        version: Optional version identifier for the operation
        **kwargs: Additional attributes to include

    Returns:
        dictionary containing span attributes
    """
    attributes: dict[str, Any] = {
        SpanAttributes.PHARE_SPAN_KIND: span_kind,
        SpanAttributes.OPERATION_NAME: operation_name,
    }

    if version is not None:
        attributes[SpanAttributes.OPERATION_VERSION] = version

    # Add any additional attributes passed as kwargs
    attributes.update(kwargs)

    return attributes


def get_session_end_attributes(end_state: str) -> dict[str, Any]:
    """
    Get attributes for session ending.

    Args:
        end_state: The final state of the session

    Returns:
        dictionary containing session end attributes
    """
    return {
        SpanAttributes.PHARE_SESSION_END_STATE: end_state,
    }


# No need to create shortcuts since we're using our own ResourceAttributes class now


# Define a separate class for the authenticated OTLP exporter
# This is imported conditionally to avoid dependency issues
import threading
from typing import Callable, Dict, Optional, Sequence
import time

import requests
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter, Compression
from opentelemetry.sdk.trace import ReadableSpan
from opentelemetry.sdk.trace.export import SpanExportResult

class PhareApiJwtExpiredException(Exception):
    def __init__(self, message="JWT token has expired"):
        super().__init__(message)


class ApiServerException(Exception):
    def __init__(self, message):
        super().__init__(message)


class AuthenticatedOTLPExporter(OTLPSpanExporter):
    """
    OTLP exporter with dynamic JWT authentication support.

    This exporter allows for updating JWT tokens dynamically without recreating
    the exporter. It maintains a reference to a JWT token that can be updated
    by external code, and automatically includes the latest token in requests.
    """

    def __init__(
        self,
        endpoint: str,
        jwt: Optional[str] = None,
        jwt_provider: Optional[Callable[[], Optional[str]]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[int] = None,
        compression: Optional[Compression] = None,
        **kwargs,
    ):
        """
        Initialize the authenticated OTLP exporter.

        Args:
            endpoint: The OTLP endpoint URL
            jwt: Initial JWT token (optional)
            jwt_provider: Function to get JWT token dynamically (optional)
            headers: Additional headers to include
            timeout: Request timeout
            compression: Compression type
            **kwargs: Additional arguments (stored but not passed to parent)
        """
        # Store JWT-related parameters separately
        self._jwt = jwt
        self._jwt_provider = jwt_provider
        self._lock = threading.Lock()
        self._last_auth_failure = 0
        self._auth_failure_threshold = 60  # Don't retry auth failures more than once per minute

        # Store any additional kwargs for potential future use
        self._custom_kwargs = kwargs

        # Filter headers to prevent override of critical headers
        filtered_headers = self._filter_user_headers(headers) if headers else None

        # Initialize parent with only known parameters
        parent_kwargs = {}
        if filtered_headers is not None:
            parent_kwargs["headers"] = filtered_headers
        if timeout is not None:
            parent_kwargs["timeout"] = timeout
        if compression is not None:
            parent_kwargs["compression"] = compression

        super().__init__(endpoint=endpoint, **parent_kwargs)

    def _get_current_jwt(self) -> Optional[str]:
        """Get the current JWT token from the provider or stored JWT."""
        if self._jwt_provider:
            try:
                return self._jwt_provider()
            except Exception as e:
                logger.warning(f"Failed to get JWT token: {e}")
        return self._jwt

    def _filter_user_headers(self, headers: Optional[Dict[str, str]]) -> Optional[Dict[str, str]]:
        """Filter user-supplied headers to prevent override of critical headers."""
        if not headers:
            return None

        # Define critical headers that cannot be overridden by user-supplied headers
        PROTECTED_HEADERS = {
            "authorization",
            "content-type",
            "user-agent",
            "x-api-key",
            "api-key",
            "bearer",
            "x-auth-token",
            "x-session-token",
        }

        filtered_headers = {}
        for key, value in headers.items():
            if key.lower() not in PROTECTED_HEADERS:
                filtered_headers[key] = value

        return filtered_headers if filtered_headers else None

    def _prepare_headers(self, headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """Prepare headers with current JWT token."""
        # Start with base headers
        prepared_headers = dict(self._headers)

        # Add any additional headers, but only allow non-critical headers
        filtered_headers = self._filter_user_headers(headers)
        if filtered_headers:
            prepared_headers.update(filtered_headers)

        # Add current JWT token if available (this ensures Authorization cannot be overridden)
        jwt_token = self._get_current_jwt()
        if jwt_token:
            prepared_headers["Authorization"] = f"Bearer {jwt_token}"

        return prepared_headers

    def export(self, spans: Sequence[ReadableSpan]) -> SpanExportResult:
        """
        Export spans with dynamic JWT authentication.

        This method overrides the parent's export to ensure we always use
        the latest JWT token and handle authentication failures gracefully.
        """
        # Check if we should skip due to recent auth failure
        with self._lock:
            current_time = time.time()
            if self._last_auth_failure > 0 and current_time - self._last_auth_failure < self._auth_failure_threshold:
                logger.debug("Skipping export due to recent authentication failure")
                return SpanExportResult.FAILURE

        try:
            # Get current JWT and prepare headers
            current_headers = self._prepare_headers()

            # Temporarily update the session headers for this request
            original_headers = dict(self._session.headers)
            self._session.headers.update(current_headers)

            try:
                # Call parent export method
                result = super().export(spans)

                # Reset auth failure timestamp on success
                if result == SpanExportResult.SUCCESS:
                    with self._lock:
                        self._last_auth_failure = 0

                return result

            finally:
                # Restore original headers
                self._session.headers.clear()
                self._session.headers.update(original_headers)

        except requests.exceptions.HTTPError as e:
            if e.response and e.response.status_code in (401, 403):
                # Authentication error - record timestamp and warn
                with self._lock:
                    self._last_auth_failure = time.time()

                logger.warning(
                    f"Authentication failed during span export: {e}. "
                    f"Will retry in {self._auth_failure_threshold} seconds."
                )
                return SpanExportResult.FAILURE
            else:
                logger.error(f"HTTP error during span export: {e}")
                return SpanExportResult.FAILURE

        except PhareApiJwtExpiredException as e:
            # JWT expired - record timestamp and warn
            with self._lock:
                self._last_auth_failure = time.time()

            logger.warning(
                f"JWT token expired during span export: {e}. Will retry in {self._auth_failure_threshold} seconds."
            )
            return SpanExportResult.FAILURE

        except ApiServerException as e:
            # Server-side error
            logger.error(f"API server error during span export: {e}")
            return SpanExportResult.FAILURE

        except requests.RequestException as e:
            # Network or HTTP error
            logger.error(f"Network error during span export: {e}")
            return SpanExportResult.FAILURE

        except Exception as e:
            # Any other error
            logger.error(f"Unexpected error during span export: {e}")
            return SpanExportResult.FAILURE

    def clear(self):
        """
        Clear any stored spans.

        This method is added for compatibility with test fixtures.
        The OTLP exporter doesn't store spans, so this is a no-op.
        """
        pass



"""
Span processors for Phare SDK.

This module contains processors for OpenTelemetry spans.
"""

from typing import Optional

from opentelemetry.context import Context
from opentelemetry.sdk.trace import ReadableSpan, Span, SpanProcessor

from typing import Annotated, Optional, TypedDict

from opentelemetry.sdk.trace import SpanProcessor
from opentelemetry.sdk.trace.export import SpanExporter

ISOTimeStamp = Annotated[str, "ISO 8601 formatted timestamp string (e.g. '2023-04-15T12:30:45.123456+00:00')"]


class TracingConfig(TypedDict, total=False):
    """Configuration for the tracing core."""

    service_name: Optional[str]
    exporter: Optional[SpanExporter]
    processor: Optional[SpanProcessor]
    exporter_endpoint: Optional[str]
    metrics_endpoint: Optional[str]
    api_key: Optional[str]  # API key for authentication with Phare services
    project_id: Optional[str]  # Project ID to include in resource attributes
    max_queue_size: int  # Required with a default value
    max_wait_time: int  # Required with a default value
    export_flush_interval: int  # Time interval between automatic exports

class InternalSpanProcessor(SpanProcessor):
    """
    A span processor that prints information about spans.

    This processor is particularly useful for debugging and monitoring
    as it prints information about spans as they are created and ended.
    For session spans, it prints a URL to the Phare dashboard.

    Note about span kinds:
    - OpenTelemetry spans have a native 'kind' property (INTERNAL, CLIENT, CONSUMER, etc.)
    - Phare also uses a semantic convention attribute PHARE_SPAN_KIND for domain-specific kinds
    - This processor tries to use the native kind first, then falls back to the attribute
    """

    _root_span_id: Optional[int] = None

    def on_start(self, span: Span, parent_context: Optional[Context] = None) -> None:
        """
        Called when a span is started.

        Args:
            span: The span that was started.
            parent_context: The parent context, if any.
        """
        # Skip if span is not sampled
        if not span.context or not span.context.trace_flags.sampled:
            return

        if not self._root_span_id:
            self._root_span_id = span.context.span_id
            logger.debug(f"[phare.InternalSpanProcessor] Found root span: {span.name}")

    def on_end(self, span: ReadableSpan) -> None:
        """
        Called when a span is ended.

        Args:
            span: The span that was ended.
        """
        # Skip if span is not sampled
        if not span.context or not span.context.trace_flags.sampled:
            return

        if self._root_span_id and (span.context.span_id is self._root_span_id):
            logger.debug(f"[phare.InternalSpanProcessor] Ending root span: {span.name}")
            # try:
            #     upload_logfile(span.context.trace_id)
            # except Exception as e:
            #     logger.error(f"[phare.InternalSpanProcessor] Error uploading logfile: {e}")

    def shutdown(self) -> None:
        """Shutdown the processor."""
        self._root_span_id = None

    def force_flush(self, timeout_millis: int = 30000) -> bool:
        """Force flush the processor."""
        return True



class PhareClientNotInitializedException(RuntimeError):
    def __init__(self, message="Phare client must be initialized before using this feature"):
        super().__init__(message)


# Define TraceContext to hold span and token
class TraceContext:
    def __init__(self, span: Span, token: Optional[context_api.Token] = None, is_init_trace: bool = False):
        self.span = span
        self.token = token
        self.is_init_trace = is_init_trace  # Flag to identify the auto-started trace
        self._end_state = StatusCode.UNSET  # Default end state because we don't know yet

    def __enter__(self) -> "TraceContext":
        """Enter the trace context."""
        return self

    def __exit__(self, exc_type: Optional[type], exc_val: Optional[Exception], exc_tb: Optional[Any]) -> bool:
        """Exit the trace context and end the trace.

        Automatically sets the trace status based on whether an exception occurred:
        - If an exception is present, sets status to ERROR
        - If no exception occurred, sets status to OK

        Returns:
            False: Always returns False to propagate any exceptions that occurred
                  within the context manager block, following Python's
                  context manager protocol for proper exception handling.
        """
        if exc_type is not None:
            self._end_state = StatusCode.ERROR
            if exc_val:
                logger.debug(f"Trace exiting with exception: {exc_val}")
        else:
            # No exception occurred, set to OK
            self._end_state = StatusCode.OK

        try:
            tracer.end_trace(self, self._end_state)
        except Exception as e:
            logger.error(f"Error ending trace in context manager: {e}")

        return False


# get_imported_libraries moved to phare.helpers.system


def setup_telemetry(
    service_name: str = "phare",
    project_id: Optional[str] = None,
    exporter_endpoint: str = "https://otlp.phare.ai/v1/traces",
    metrics_endpoint: str = "https://otlp.phare.ai/v1/metrics",
    max_queue_size: int = 512,
    max_wait_time: int = 5000,
    export_flush_interval: int = 1000,
    jwt_provider: Optional[Callable[[], Optional[str]]] = None,
) -> tuple[TracerProvider, MeterProvider]:
    """
    Setup the telemetry system.

    Args:
        service_name: Name of the OpenTelemetry service
        project_id: Project ID to include in resource attributes
        exporter_endpoint: Endpoint for the span exporter
        metrics_endpoint: Endpoint for the metrics exporter
        max_queue_size: Maximum number of spans to queue before forcing a flush
        max_wait_time: Maximum time in milliseconds to wait before flushing
        export_flush_interval: Time interval in milliseconds between automatic exports of telemetry data
        jwt_provider: Function that returns the current JWT token

    Returns:
        Tuple of (TracerProvider, MeterProvider)
    """
    # Build resource attributes
    resource_attrs = get_global_resource_attributes(
        service_name=service_name,
        project_id=project_id,
    )

    resource = Resource(resource_attrs)
    provider = TracerProvider(resource=resource)

    # Set as global provider
    trace.set_tracer_provider(provider)

    # Create exporter with dynamic JWT support
    exporter = AuthenticatedOTLPExporter(endpoint=exporter_endpoint, jwt_provider=jwt_provider)

    # Regular processor for normal spans and immediate export
    processor = BatchSpanProcessor(
        exporter,
        max_export_batch_size=max_queue_size,
        schedule_delay_millis=export_flush_interval,
    )
    provider.add_span_processor(processor)
    internal_processor = InternalSpanProcessor()  # Catches spans for Phare on-terminal printing
    provider.add_span_processor(internal_processor)

    # Setup metrics with JWT provider
    def get_metrics_headers():
        token = jwt_provider() if jwt_provider else None
        return {"Authorization": f"Bearer {token}"} if token else {}

    metric_exporter = OTLPMetricExporter(endpoint=metrics_endpoint, headers=get_metrics_headers())

    metric_reader = PeriodicExportingMetricReader(metric_exporter)
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    ### Logging
    # setup_print_logger()

    # Initialize root context
    # context_api.get_current() # It's better to manage context explicitly with traces

    logger.debug("Telemetry system initialized")

    return provider, meter_provider




from importlib.metadata import PackageNotFoundError, version

import requests



def get_phare_version():
    try:
        pkg_version = version("phare")
        return pkg_version
    except Exception as e:
        logger.warning("Error reading package version: %s", e)
        return None


def check_phare_update():
    try:
        response = requests.get("https://pypi.org/pypi/phare/json")

        if response.status_code == 200:
            json_data = response.json()
            latest_version = json_data["info"]["version"]

            try:
                current_version = version("phare")
            except PackageNotFoundError:
                return None

            if not latest_version == current_version:
                logger.warning(
                    " WARNING: phare is out of date. Please update with the command: 'pip install --upgrade phare'"
                )
    except Exception as e:
        logger.debug(f"Failed to check for updates: {e}")
        return None




from typing import Optional

from requests.adapters import HTTPAdapter
from urllib3.util import Retry

# from phare.client.auth_manager import AuthManager


class BaseHTTPAdapter(HTTPAdapter):
    """Base HTTP adapter with enhanced connection pooling and retry logic"""

    def __init__(
        self,
        pool_connections: int = 15,
        pool_maxsize: int = 256,
        max_retries: Optional[Retry] = None,
    ):
        """
        Initialize the base HTTP adapter.

        Args:
            pool_connections: Number of connection pools to cache
            pool_maxsize: Maximum number of connections to save in the pool
            max_retries: Retry configuration for failed requests
        """
        if max_retries is None:
            max_retries = Retry(
                total=3,
                backoff_factor=0.1,
                status_forcelist=[500, 502, 503, 504],
            )

        super().__init__(pool_connections=pool_connections, pool_maxsize=pool_maxsize, max_retries=max_retries)



from typing import Dict, Optional
import threading

import requests


# Import aiohttp for async requests
try:
    import aiohttp

    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    # Don't log warning here, only when actually trying to use async functionality


class HttpClient:
    """HTTP client with async-first design and optional sync fallback for log uploads"""

    _session: Optional[requests.Session] = None
    _async_session: Optional[aiohttp.ClientSession] = None
    _project_id: Optional[str] = None
    _session_lock = threading.Lock()

    @classmethod
    def get_project_id(cls) -> Optional[str]:
        """Get the stored project ID"""
        return cls._project_id

    @classmethod
    def set_project_id(cls, project_id: str) -> None:
        """Set the project ID"""
        cls._project_id = project_id

    @classmethod
    def get_session(cls) -> requests.Session:
        """
        Get or create the global session with optimized connection pooling.

        Note: This method is deprecated. Use async_request() instead.
        Only kept for log upload module compatibility.
        """
        if cls._session is None:
            with cls._session_lock:
                if cls._session is None:  # Double-check locking
                    cls._session = requests.Session()

                    # Configure connection pooling
                    adapter = BaseHTTPAdapter()

                    # Mount adapter for both HTTP and HTTPS
                    cls._session.mount("http://", adapter)
                    cls._session.mount("https://", adapter)

                    # Set default headers
                    cls._session.headers.update(
                        {
                            "Connection": "keep-alive",
                            "Keep-Alive": "timeout=10, max=1000",
                            "Content-Type": "application/json",
                            "User-Agent": f"phare-python/{get_phare_version() or 'unknown'}",
                        }
                    )
                    logger.debug(f"Phare version: phare-python/{get_phare_version() or 'unknown'}")
        return cls._session

    @classmethod
    async def get_async_session(cls) -> Optional[aiohttp.ClientSession]:
        """Get or create the global async session with optimized connection pooling"""
        if not AIOHTTP_AVAILABLE:
            logger.warning("aiohttp not available, cannot create async session")
            return None

        # Always create a new session if the current one is None or closed
        if cls._async_session is None or cls._async_session.closed:
            # Close the old session if it exists but is closed
            if cls._async_session is not None and cls._async_session.closed:
                cls._async_session = None

            # Create connector with connection pooling
            connector = aiohttp.TCPConnector(
                limit=100,  # Total connection pool size
                limit_per_host=30,  # Per-host connection limit
                ttl_dns_cache=300,  # DNS cache TTL
                use_dns_cache=True,
                enable_cleanup_closed=True,
            )

            # Create session with default headers
            headers = {
                "Content-Type": "application/json",
                "User-Agent": f"phare-python/{get_phare_version() or 'unknown'}",
            }

            cls._async_session = aiohttp.ClientSession(
                connector=connector, headers=headers, timeout=aiohttp.ClientTimeout(total=30)
            )

        return cls._async_session

    @classmethod
    async def close_async_session(cls):
        """Close the async session"""
        if cls._async_session and not cls._async_session.closed:
            await cls._async_session.close()
            cls._async_session = None

    @classmethod
    async def async_request(
        cls,
        method: str,
        url: str,
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        timeout: int = 30,
    ) -> Optional[Dict]:
        """
        Make an async HTTP request and return JSON response

        Args:
            method: HTTP method (e.g., 'get', 'post', 'put', 'delete')
            url: Full URL for the request
            data: Request payload (for POST, PUT methods)
            headers: Request headers
            timeout: Request timeout in seconds

        Returns:
            JSON response as dictionary, or None if request failed
        """
        if not AIOHTTP_AVAILABLE:
            logger.warning("aiohttp not available, cannot make async request")
            return None

        try:
            session = await cls.get_async_session()
            if not session:
                return None

            logger.debug(f"Making async {method} request to {url}")

            # Prepare request parameters
            kwargs = {"timeout": aiohttp.ClientTimeout(total=timeout), "headers": headers or {}}

            if data and method.lower() in ["post", "put", "patch"]:
                kwargs["json"] = data

            # Make the request
            async with session.request(method.upper(), url, **kwargs) as response:
                logger.debug(f"Async request response status: {response.status}")

                # Check if response is successful
                if response.status >= 400:
                    return None

                # Parse JSON response
                try:
                    response_data = await response.json()
                    logger.debug(
                        f"Async request successful, response keys: {list(response_data.keys()) if response_data else 'None'}"
                    )
                    return response_data
                except Exception:
                    return None

        except Exception:
            return None



"""
Base API client classes for making HTTP requests.

This module provides the foundation for all API clients in the Phare SDK.
"""

from typing import Any, Dict, Optional, Protocol

import requests


class TokenFetcher(Protocol):
    """Protocol for token fetching functions"""

    def __call__(self, api_key: str) -> str: ...


class BaseApiClient:
    """
    Base class for API communication with async HTTP methods.

    This class provides the core HTTP functionality without authentication.
    All HTTP methods are asynchronous.
    """

    def __init__(self, endpoint: str):
        """
        Initialize the base API client.

        Args:
            endpoint: The base URL for the API
        """
        self.endpoint = endpoint
        self.http_client = HttpClient()
        self.last_response: Optional[requests.Response] = None

    def prepare_headers(self, custom_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """
        Prepare headers for API requests.

        Args:
            custom_headers: Additional headers to include

        Returns:
            Headers dictionary with standard headers and any custom headers
        """
        headers = {
            "Content-Type": "application/json",
            "Connection": "keep-alive",
            "Keep-Alive": "timeout=10, max=1000",
            "User-Agent": f"phare-python/{get_phare_version() or 'unknown'}",
        }

        if custom_headers:
            headers.update(custom_headers)

        return headers

    def _get_full_url(self, path: str) -> str:
        """
        Get the full URL for a path.

        Args:
            path: The API endpoint path

        Returns:
            The full URL
        """
        return f"{self.endpoint}{path}"

    async def async_request(
        self,
        method: str,
        path: str,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 30,
    ) -> Optional[Dict[str, Any]]:
        """
        Make a generic async HTTP request

        Args:
            method: HTTP method (e.g., 'get', 'post', 'put', 'delete')
            path: API endpoint path
            data: Request payload (for POST, PUT methods)
            headers: Request headers
            timeout: Request timeout in seconds

        Returns:
            JSON response as dictionary, or None if request failed

        Raises:
            Exception: If the request fails
        """
        url = self._get_full_url(path)

        try:
            response_data = await self.http_client.async_request(
                method=method, url=url, data=data, headers=headers, timeout=timeout
            )
            return response_data
        except Exception as e:
            raise Exception(f"{method.upper()} request failed: {str(e)}") from e

    async def post(self, path: str, data: Dict[str, Any], headers: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """
        Make async POST request

        Args:
            path: API endpoint path
            data: Request payload
            headers: Request headers

        Returns:
            JSON response as dictionary, or None if request failed
        """
        return await self.async_request("post", path, data=data, headers=headers)

    async def get(self, path: str, headers: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """
        Make async GET request

        Args:
            path: API endpoint path
            headers: Request headers

        Returns:
            JSON response as dictionary, or None if request failed
        """
        return await self.async_request("get", path, headers=headers)

    async def put(self, path: str, data: Dict[str, Any], headers: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """
        Make async PUT request

        Args:
            path: API endpoint path
            data: Request payload
            headers: Request headers

        Returns:
            JSON response as dictionary, or None if request failed
        """
        return await self.async_request("put", path, data=data, headers=headers)

    async def delete(self, path: str, headers: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """
        Make async DELETE request

        Args:
            path: API endpoint path
            headers: Request headers

        Returns:
            JSON response as dictionary, or None if request failed
        """
        return await self.async_request("delete", path, headers=headers)



"""
Common types used across API client modules.

This module contains type definitions used by multiple API client modules.
"""

from typing import TypedDict


class AuthTokenResponse(TypedDict):
    """Response from the auth/token endpoint"""

    token: str
    project_id: str


class UploadedObjectResponse(TypedDict):
    """Response from the v4/objects/upload endpoint"""

    url: str
    size: int



"""
V3 API client for the Phare API.

This module provides the client for the V3 version of the Phare API.
"""


class V3Client(BaseApiClient):
    """Client for the Phare V3 API"""

    def __init__(self, endpoint: str):
        """
        Initialize the V3 API client.

        Args:
            endpoint: The base URL for the API
        """
        # Set up with V3-specific auth endpoint
        super().__init__(endpoint)

    async def fetch_auth_token(self, api_key: str) -> AuthTokenResponse:
        """
        Asynchronously fetch authentication token.

        Args:
            api_key: The API key to authenticate with

        Returns:
            AuthTokenResponse containing token and project information, or None if failed
        """
        try:
            path = "/v3/auth/token"
            data = {"api_key": api_key}
            headers = self.prepare_headers()

            # Build full URL
            url = self._get_full_url(path)

            # Make async request
            response_data = await HttpClient.async_request(
                method="POST", url=url, data=data, headers=headers, timeout=30
            )

            token = response_data.get("token")
            if not token:
                logger.warning("Authentication failed: Perhaps an invalid API key?")
                return None

            # Check project premium status
            if response_data.get("project_prem_status") != "pro":
                # logger.info(
                #     colored(
                #         "\x1b[34mYou're on the phare free plan 🤔\x1b[0m",
                #         "blue",
                #     )
                # )

            return response_data

        except Exception:
            return None

    # Add V3-specific API methods here



"""
V4 API client for the Phare API.

This module provides the client for the V4 version of the Phare API.
"""

from typing import Optional, Union, Dict, Any

import requests


class V4Client(BaseApiClient):
    """Client for the Phare V4 API"""

    def __init__(self, endpoint: str):
        """Initialize the V4 API client."""
        super().__init__(endpoint)
        self.auth_token: Optional[str] = None

    def set_auth_token(self, token: str):
        """
        Set the authentication token for API requests.

        Args:
            token: The authentication token to set
        """
        self.auth_token = token

    def prepare_headers(self, custom_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """
        Prepare headers for API requests.

        Args:
            custom_headers: Additional headers to include
        Returns:
            Headers dictionary with standard headers and any custom headers
        """
        headers = {
            "User-Agent": f"phare-python/{get_phare_version() or 'unknown'}",
        }

        # Only add Authorization header if we have a token
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        if custom_headers:
            headers.update(custom_headers)
        return headers

    def post(self, path: str, body: Union[str, bytes], headers: Optional[Dict[str, str]] = None) -> requests.Response:
        """
        Make a POST request to the V4 API.

        Args:
            path: The API path to POST to
            body: The request body (string or bytes)
            headers: Optional headers to include

        Returns:
            The response object
        """
        url = self._get_full_url(path)
        request_headers = headers or self.prepare_headers()

        return HttpClient.get_session().post(url, json={"body": body}, headers=request_headers, timeout=30)

    def upload_object(self, body: Union[str, bytes]) -> Dict[str, Any]:
        """
        Upload an object to the V4 API.

        Args:
            body: The object body to upload

        Returns:
            Dictionary containing upload response data

        Raises:
            ApiServerException: If the upload fails
        """
        try:
            # Convert bytes to string for consistency with test expectations
            if isinstance(body, bytes):
                body = body.decode("utf-8")

            response = self.post("/v4/objects/upload/", body, self.prepare_headers())

            if response.status_code != 200:
                error_msg = f"Upload failed: {response.status_code}"
                try:
                    error_data = response.json()
                    if "error" in error_data:
                        error_msg = error_data["error"]
                except:
                    pass
                raise ApiServerException(error_msg)

            try:
                return response.json()
            except Exception as e:
                raise ApiServerException(f"Failed to process upload response: {str(e)}")
        except requests.exceptions.RequestException as e:
            raise ApiServerException(f"Failed to upload object: {e}")

    def upload_logfile(self, body: Union[str, bytes], trace_id: str) -> Dict[str, Any]:
        """
        Upload a logfile to the V4 API.

        Args:
            body: The logfile content to upload
            trace_id: The trace ID associated with the logfile

        Returns:
            Dictionary containing upload response data

        Raises:
            ApiServerException: If the upload fails
        """
        try:
            # Convert bytes to string for consistency with test expectations
            if isinstance(body, bytes):
                body = body.decode("utf-8")

            headers = {**self.prepare_headers(), "Trace-Id": str(trace_id)}
            response = self.post("/v4/logs/upload/", body, headers)

            if response.status_code != 200:
                error_msg = f"Upload failed: {response.status_code}"
                try:
                    error_data = response.json()
                    if "error" in error_data:
                        error_msg = error_data["error"]
                except:
                    pass
                raise ApiServerException(error_msg)

            try:
                return response.json()
            except Exception as e:
                raise ApiServerException(f"Failed to process upload response: {str(e)}")
        except requests.exceptions.RequestException as e:
            raise ApiServerException(f"Failed to upload logfile: {e}")




"""
API client for the Phare API.

This module provides the client for the Phare API.
"""

from typing import Dict, Type, TypeVar, cast

# Define a type variable for client classes
T = TypeVar("T", bound=BaseApiClient)

__all__ = ["ApiClient", "BaseApiClient", "AuthTokenResponse"]


class ApiClient:
    """
    Master API client that contains all version-specific clients.

    This client provides a unified interface for accessing different API versions.
    It lazily initializes version-specific clients when they are first accessed.
    """

    def __init__(self, endpoint: str = "https://api.phare.ai"):
        """
        Initialize the master API client.

        Args:
            endpoint: The base URL for the API
        """
        self.endpoint = endpoint
        self._clients: Dict[str, BaseApiClient] = {}

    @property
    def v3(self) -> V3Client:
        """
        Get the V3 API client.

        Returns:
            The V3 API client
        """
        return self._get_client("v3", V3Client)

    @property
    def v4(self) -> V4Client:
        """
        Get the V4 API client.

        Returns:
            The V4 API client
        """
        return self._get_client("v4", V4Client)

    def _get_client(self, version: str, client_class: Type[T]) -> T:
        """
        Get or create a version-specific client.

        Args:
            version: The API version
            client_class: The client class to instantiate

        Returns:
            The version-specific client
        """
        if version not in self._clients:
            self._clients[version] = client_class(self.endpoint)
        return cast(T, self._clients[version])



"""Environment variable helper functions"""

import os
from typing import List, Optional, Set


def get_env_bool(key: str, default: bool) -> bool:
    """Get boolean from environment variable

    Args:
        key: Environment variable name
        default: Default value if not set

    Returns:
        bool: Parsed boolean value
    """
    val = os.getenv(key)
    if val is None:
        return default
    return val.lower() in ("true", "1", "t", "yes")


def get_env_int(key: str, default: int) -> int:
    """Get integer from environment variable

    Args:
        key: Environment variable name
        default: Default value if not set

    Returns:
        int: Parsed integer value
    """
    try:
        return int(os.getenv(key, default))
    except (TypeError, ValueError):
        return default


def get_env_list(key: str, default: Optional[List[str]] = None) -> Set[str]:
    """Get comma-separated list from environment variable

    Args:
        key: Environment variable name
        default: Default list if not set

    Returns:
        Set[str]: Set of parsed values
    """
    val = os.getenv(key)
    if val is None:
        return set(default or [])
    return set(val.split(","))

import json
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID


class PhareJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for Phare types"""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, set):
            return list(obj)
        if hasattr(obj, "to_json"):
            return obj.to_json()
        if isinstance(obj, Enum):
            return obj.value
        return str(obj)


import json
import logging
import os
import sys
from dataclasses import dataclass, field
from typing import List, Optional, Set, TypedDict, Union
from uuid import UUID

from opentelemetry.sdk.trace import SpanProcessor
from opentelemetry.sdk.trace.export import SpanExporter


class ConfigDict(TypedDict):
    api_key: Optional[str]
    endpoint: Optional[str]
    app_url: Optional[str]
    max_wait_time: Optional[int]
    export_flush_interval: Optional[int]
    max_queue_size: Optional[int]
    default_tags: Optional[List[str]]
    trace_name: Optional[str]
    instrument_llm_calls: Optional[bool]
    auto_start_session: Optional[bool]
    auto_init: Optional[bool]
    skip_auto_end_session: Optional[bool]
    env_data_opt_out: Optional[bool]
    log_level: Optional[Union[str, int]]
    fail_safe: Optional[bool]
    prefetch_jwt_token: Optional[bool]
    log_session_replay_url: Optional[bool]


@dataclass
class Config:
    api_key: Optional[str] = field(
        default_factory=lambda: os.getenv("PHARE_API_KEY"),
        metadata={"description": "API key for authentication with Phare services"},
    )

    endpoint: str = field(
        default_factory=lambda: os.getenv("PHARE_API_ENDPOINT", "https://api.phare.ai"),
        metadata={"description": "Base URL for the Phare API"},
    )

    app_url: str = field(
        default_factory=lambda: os.getenv("PHARE_APP_URL", "https://app.phare.ai"),
        metadata={"description": "Dashboard URL for the Phare application"},
    )

    max_wait_time: int = field(
        default_factory=lambda: get_env_int("PHARE_MAX_WAIT_TIME", 5000),
        metadata={"description": "Maximum time in milliseconds to wait for API responses"},
    )

    export_flush_interval: int = field(
        default_factory=lambda: get_env_int("PHARE_EXPORT_FLUSH_INTERVAL", 1000),
        metadata={"description": "Time interval in milliseconds between automatic exports of telemetry data"},
    )

    max_queue_size: int = field(
        default_factory=lambda: get_env_int("PHARE_MAX_QUEUE_SIZE", 512),
        metadata={"description": "Maximum number of events to queue before forcing a flush"},
    )

    default_tags: Set[str] = field(
        default_factory=lambda: get_env_list("PHARE_DEFAULT_TAGS"),
        metadata={"description": "Default tags to apply to all sessions"},
    )

    trace_name: Optional[str] = field(
        default_factory=lambda: os.getenv("PHARE_TRACE_NAME"),
        metadata={"description": "Default name for the trace/session"},
    )

    instrument_llm_calls: bool = field(
        default_factory=lambda: get_env_bool("PHARE_INSTRUMENT_LLM_CALLS", True),
        metadata={"description": "Whether to automatically instrument and track LLM API calls"},
    )

    auto_start_session: bool = field(
        default_factory=lambda: get_env_bool("PHARE_AUTO_START_SESSION", True),
        metadata={"description": "Whether to automatically start a session when initializing"},
    )

    auto_init: bool = field(
        default_factory=lambda: get_env_bool("PHARE_AUTO_INIT", True),
        metadata={"description": "Whether to automatically initialize the client on import"},
    )

    skip_auto_end_session: bool = field(
        default_factory=lambda: get_env_bool("PHARE_SKIP_AUTO_END_SESSION", False),
        metadata={"description": "Whether to skip automatically ending sessions on program exit"},
    )

    env_data_opt_out: bool = field(
        default_factory=lambda: get_env_bool("PHARE_ENV_DATA_OPT_OUT", False),
        metadata={"description": "Whether to opt out of collecting environment data"},
    )

    log_level: Union[str, int] = field(
        default_factory=lambda: os.getenv("PHARE_LOG_LEVEL", "INFO"),
        metadata={"description": "Logging level for Phare logs"},
    )

    fail_safe: bool = field(
        default_factory=lambda: get_env_bool("PHARE_FAIL_SAFE", False),
        metadata={"description": "Whether to suppress errors and continue execution when possible"},
    )

    prefetch_jwt_token: bool = field(
        default_factory=lambda: get_env_bool("PHARE_PREFETCH_JWT_TOKEN", True),
        metadata={"description": "Whether to prefetch JWT token during initialization"},
    )

    log_session_replay_url: bool = field(
        default_factory=lambda: get_env_bool("PHARE_LOG_SESSION_REPLAY_URL", True),
        metadata={"description": "Whether to log session replay URLs to the console"},
    )

    exporter_endpoint: Optional[str] = field(
        default_factory=lambda: os.getenv("PHARE_EXPORTER_ENDPOINT", "https://otlp.phare.ai/v1/traces"),
        metadata={
            "description": "Endpoint for the span exporter. When not provided, the default Phare endpoint will be used."
        },
    )

    exporter: Optional[SpanExporter] = field(
        default_factory=lambda: None, metadata={"description": "Custom span exporter for OpenTelemetry trace data"}
    )

    processor: Optional[SpanProcessor] = field(
        default_factory=lambda: None, metadata={"description": "Custom span processor for OpenTelemetry trace data"}
    )

    def configure(
        self,
        api_key: Optional[str] = None,
        endpoint: Optional[str] = None,
        app_url: Optional[str] = None,
        max_wait_time: Optional[int] = None,
        export_flush_interval: Optional[int] = None,
        max_queue_size: Optional[int] = None,
        default_tags: Optional[List[str]] = None,
        trace_name: Optional[str] = None,
        instrument_llm_calls: Optional[bool] = None,
        auto_start_session: Optional[bool] = None,
        auto_init: Optional[bool] = None,
        skip_auto_end_session: Optional[bool] = None,
        env_data_opt_out: Optional[bool] = None,
        log_level: Optional[Union[str, int]] = None,
        fail_safe: Optional[bool] = None,
        prefetch_jwt_token: Optional[bool] = None,
        log_session_replay_url: Optional[bool] = None,
        exporter: Optional[SpanExporter] = None,
        processor: Optional[SpanProcessor] = None,
        exporter_endpoint: Optional[str] = None,
    ):
        """Configure settings from kwargs, validating where necessary"""
        if api_key is not None:
            self.api_key = api_key
            if not TESTING:  # Allow setting dummy keys in tests
                try:
                    UUID(api_key)
                except ValueError:
                    # Log warning but don't throw exception - let async auth handle it

                    logger.warning(
                        f"API key format appears invalid: {api_key[:8]}... "
                        f"Authentication may fail. Find your API key at {self.endpoint}/settings/projects"
                    )
                    # Continue with the invalid key - async auth will handle the failure gracefully

        if endpoint is not None:
            self.endpoint = endpoint

        if app_url is not None:
            self.app_url = app_url

        if max_wait_time is not None:
            self.max_wait_time = max_wait_time

        if export_flush_interval is not None:
            self.export_flush_interval = export_flush_interval

        if max_queue_size is not None:
            self.max_queue_size = max_queue_size

        if default_tags is not None:
            self.default_tags = set(default_tags)

        if trace_name is not None:
            self.trace_name = trace_name

        if instrument_llm_calls is not None:
            self.instrument_llm_calls = instrument_llm_calls

        if auto_start_session is not None:
            self.auto_start_session = auto_start_session

        if auto_init is not None:
            self.auto_init = auto_init

        if skip_auto_end_session is not None:
            self.skip_auto_end_session = skip_auto_end_session

        if env_data_opt_out is not None:
            self.env_data_opt_out = env_data_opt_out

        if log_level is not None:
            if isinstance(log_level, str):
                log_level_str = log_level.upper()
                if hasattr(logging, log_level_str):
                    self.log_level = getattr(logging, log_level_str)
                else:
                    self.log_level = logging.INFO
            else:
                self.log_level = log_level

        if fail_safe is not None:
            self.fail_safe = fail_safe

        if prefetch_jwt_token is not None:
            self.prefetch_jwt_token = prefetch_jwt_token

        if log_session_replay_url is not None:
            self.log_session_replay_url = log_session_replay_url

        if exporter is not None:
            self.exporter = exporter

        if processor is not None:
            self.processor = processor

        if exporter_endpoint is not None:
            self.exporter_endpoint = exporter_endpoint
        # else:
        #     self.exporter_endpoint = self.endpoint

    def dict(self):
        """Return a dictionary representation of the config"""
        return {
            "api_key": self.api_key,
            "endpoint": self.endpoint,
            "app_url": self.app_url,
            "max_wait_time": self.max_wait_time,
            "export_flush_interval": self.export_flush_interval,
            "max_queue_size": self.max_queue_size,
            "default_tags": self.default_tags,
            "trace_name": self.trace_name,
            "instrument_llm_calls": self.instrument_llm_calls,
            "auto_start_session": self.auto_start_session,
            "auto_init": self.auto_init,
            "skip_auto_end_session": self.skip_auto_end_session,
            "env_data_opt_out": self.env_data_opt_out,
            "log_level": self.log_level,
            "fail_safe": self.fail_safe,
            "prefetch_jwt_token": self.prefetch_jwt_token,
            "log_session_replay_url": self.log_session_replay_url,
            "exporter": self.exporter,
            "processor": self.processor,
            "exporter_endpoint": self.exporter_endpoint,
        }

    def json(self):
        """Return a JSON representation of the config"""
        return json.dumps(self.dict(), cls=PhareJSONEncoder)


# checks if pytest is imported
TESTING = "pytest" in sys.modules


import atexit
import asyncio
import threading
from typing import Optional, Any

# from phare.logging.config import configure_logging, intercept_opentelemetry_logging
# from phare.legacy import Session

# Global variables to hold the client's auto-started trace and its legacy session wrapper
_client_init_trace_context: Optional[TraceContext] = None
# _client_legacy_session_for_init_trace: Optional[Session] = None

# Single atexit handler registered flag
_atexit_registered = False


def _end_init_trace_atexit():
    """Global atexit handler to end the client's auto-initialized trace during shutdown."""
    global _client_init_trace_context, _client_legacy_session_for_init_trace
    if _client_init_trace_context is not None:
        logger.debug("Auto-ending client's init trace during shutdown.")
        try:
            # Use global tracer to end the trace directly
            if tracer.initialized and _client_init_trace_context.span.is_recording():
                tracer.end_trace(_client_init_trace_context, end_state="Shutdown")
        except Exception as e:
            logger.warning(f"Error ending client's init trace during shutdown: {e}")
        finally:
            _client_init_trace_context = None
            # _client_legacy_session_for_init_trace = None  # Clear its legacy wrapper too


class Client:
    """Singleton client for Phare service"""

    config: Config
    _initialized: bool
    _init_trace_context: Optional[TraceContext] = None  # Stores the context of the auto-started trace
    # _legacy_session_for_init_trace: Optional[Session] = (
    #     None  # Stores the legacy Session wrapper for the auto-started trace
    # )

    __instance = None  # Class variable for singleton pattern

    api: ApiClient
    _auth_token: Optional[str] = None
    _project_id: Optional[str] = None
    _auth_lock = threading.Lock()
    _auth_task: Optional[asyncio.Task] = None

    def __new__(cls, *args: Any, **kwargs: Any) -> "Client":
        if cls.__instance is None:
            cls.__instance = super(Client, cls).__new__(cls)
            # Initialize instance variables that should only be set once per instance
            cls.__instance._init_trace_context = None
            cls.__instance._legacy_session_for_init_trace = None
            cls.__instance._auth_token = None
            cls.__instance._project_id = None
            cls.__instance._auth_lock = threading.Lock()
            cls.__instance._auth_task = None
        return cls.__instance

    def __init__(self):
        # Initialization of attributes like config, _initialized should happen here if they are instance-specific
        # and not shared via __new__ for a true singleton that can be re-configured.
        # However, the current pattern re-initializes config in init().
        if (
            not hasattr(self, "_initialized") or not self._initialized
        ):  # Ensure init logic runs only once per actual initialization intent
            self.config = Config()  # Initialize config here for the instance
            self._initialized = False
            # self._init_trace_context = None # Already done in __new__
            # self._legacy_session_for_init_trace = None # Already done in __new__

    def get_current_jwt(self) -> Optional[str]:
        """Get the current JWT token."""
        with self._auth_lock:
            return self._auth_token

    def _set_auth_data(self, token: str, project_id: str):
        """Set authentication data thread-safely."""
        with self._auth_lock:
            self._auth_token = token
            self._project_id = project_id

        # Update the HTTP client's project ID
        HttpClient.set_project_id(project_id)

    async def _fetch_auth_async(self, api_key: str) -> Optional[dict]:
        """Asynchronously fetch authentication token."""
        try:
            response = await self.api.v3.fetch_auth_token(api_key)
            if response:
                self._set_auth_data(response["token"], response["project_id"])

                # Update V4 client with token
                self.api.v4.set_auth_token(response["token"])

                # Update tracer config with real project ID
                tracing_config = {"project_id": response["project_id"]}
                tracer.update_config(tracing_config)

                logger.debug("Successfully fetched authentication token asynchronously")
                return response
            else:
                logger.debug("Authentication failed - will continue without authentication")
                return None
        except Exception:
            return None

    def _start_auth_task(self, api_key: str):
        """Start the async authentication task."""
        if self._auth_task and not self._auth_task.done():
            return  # Task already running

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Use existing event loop
                self._auth_task = loop.create_task(self._fetch_auth_async(api_key))
            else:
                # Create new event loop in background thread
                def run_async_auth():
                    asyncio.run(self._fetch_auth_async(api_key))

                import threading

                auth_thread = threading.Thread(target=run_async_auth, daemon=True)
                auth_thread.start()
        except RuntimeError:
            # Create new event loop in background thread
            def run_async_auth():
                asyncio.run(self._fetch_auth_async(api_key))

            import threading

            auth_thread = threading.Thread(target=run_async_auth, daemon=True)
            auth_thread.start()

    def init(self, **kwargs: Any) -> None:  # Return type updated to None
        # Recreate the Config object to parse environment variables at the time of initialization
        # This allows re-init with new env vars if needed, though true singletons usually init once.
        self.config = Config()
        self.configure(**kwargs)

        # Only treat as re-initialization if a different non-None API key is explicitly provided
        provided_api_key = kwargs.get("api_key")
        if self.initialized and provided_api_key is not None and provided_api_key != self.config.api_key:
            logger.warning("Phare Client being re-initialized with a different API key. This is unusual.")
            # Reset initialization status to allow re-init with new key/config
            self._initialized = False
            if self._init_trace_context and self._init_trace_context.span.is_recording():
                logger.warning("Ending previously auto-started trace due to re-initialization.")
                tracer.end_trace(self._init_trace_context, "Reinitialized")
            self._init_trace_context = None
            self._legacy_session_for_init_trace = None

        if self.initialized:
            logger.debug("Phare Client already initialized.")
            # If auto_start_session was true, return the existing legacy session wrapper
            if self.config.auto_start_session:
                return self._legacy_session_for_init_trace
            return None  # If not auto-starting, and already initialized, return None

        if not self.config.api_key:
            logger.warning(
                "No API key provided. Phare will initialize but authentication will fail. "
                "Set PHARE_API_KEY environment variable or pass api_key parameter."
            )
            # Continue without API key - spans will be created but exports will fail gracefully

        # configure_logging(self.config)
        # intercept_opentelemetry_logging()

        self.api = ApiClient(self.config.endpoint)

        # Initialize tracer with JWT provider for dynamic updates
        tracing_config = self.config.dict()
        tracing_config["project_id"] = "temporary"  # Will be updated when auth completes

        # Create JWT provider function for dynamic updates
        def jwt_provider():
            return self.get_current_jwt()

        # Initialize tracer with JWT provider
        tracer.initialize_from_config(tracing_config, jwt_provider=jwt_provider)

        if self.config.instrument_llm_calls:
            instrument_all()

        # Start authentication task only if we have an API key
        if self.config.api_key:
            self._start_auth_task(self.config.api_key)
        else:
            logger.debug("No API key available - skipping authentication task")

        global _atexit_registered
        if not _atexit_registered:
            atexit.register(_end_init_trace_atexit)  # Register new atexit handler
            _atexit_registered = True

        # Auto-start trace if configured
        if self.config.auto_start_session:
            if self._init_trace_context is None or not self._init_trace_context.span.is_recording():
                logger.debug("Auto-starting init trace.")
                trace_name = self.config.trace_name or "default"
                self._init_trace_context = tracer.start_trace(
                    trace_name=trace_name,
                    tags=list(self.config.default_tags) if self.config.default_tags else None,
                    is_init_trace=True,
                )
                if self._init_trace_context:
                    # self._legacy_session_for_init_trace = Session(self._init_trace_context)

                    # For backward compatibility, also update the global references in legacy and client modules
                    # These globals are what old code might have been using via phare.legacy.get_session() or similar indirect access.
                    global _client_init_trace_context, _client_legacy_session_for_init_trace
                    _client_init_trace_context = self._init_trace_context
                    # _client_legacy_session_for_init_trace = self._legacy_session_for_init_trace

                    # Update legacy module's _current_session and _current_trace_context
                    # This is tricky; direct access to another module's globals is not ideal.
                    # Prefer explicit calls if possible, but for maximum BC:
                    # try:
                    #     import phare.legacy

                    #     phare.legacy._current_session = self._legacy_session_for_init_trace
                    #     phare.legacy._current_trace_context = self._init_trace_context
                    # except ImportError:
                    #     pass  # Should not happen

                else:
                    logger.error("Failed to start the auto-init trace.")
                    # Even if auto-start fails, core services up to the tracer might be initialized.
                    # Set self.initialized to True if tracer is up, but return None.
                    self._initialized = tracer.initialized
                    return None  # Failed to start trace

            self._initialized = True  # Successfully initialized and auto-trace started (if configured)
            # For backward compatibility, return the legacy session wrapper when auto_start_session=True
            return self._legacy_session_for_init_trace
        else:
            logger.debug("Auto-start session is disabled. No init trace started by client.")
            self._initialized = True  # Successfully initialized, just no auto-trace
            return None  # No auto-session, so return None

    def configure(self, **kwargs: Any) -> None:
        """Update client configuration"""
        self.config.configure(**kwargs)

    @property
    def initialized(self) -> bool:
        return self._initialized

    @initialized.setter
    def initialized(self, value: bool) -> None:
        if self._initialized and self._initialized != value:
            # Allow re-setting to False if we are intentionally re-initializing
            # This logic is now partly in init() to handle re-init cases
            pass
        self._initialized = value

    # ------------------------------------------------------------
    # Remove the old __instance = None at the end of the class definition if it's a repeat
    # __instance = None # This was a class variable, should be defined once

    # Make _init_trace_context and _legacy_session_for_init_trace accessible
    # to the atexit handler if it becomes a static/class method or needs access
    # For now, the atexit handler is global and uses global vars copied from these.

    # Deprecate and remove the old global _active_session from this module.
    # Consumers should use phare.start_trace() or rely on the auto-init trace.
    # For a transition, the auto-init trace's legacy wrapper is set to legacy module's globals.



if __name__ == "__main__":
    # Example usage
    inst = instrument_one(loader=InstrumentorLoader(
        module_name="agent.backend.instrumentation.instrumentor",
        class_name="GoogleAdkInstrumentor",
        min_version="0.1.0",
    )) 


