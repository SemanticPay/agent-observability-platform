"""Google ADK Instrumentation for Phare

This module provides instrumentation for Google's Agent Development Kit (ADK).
It uses a patching approach to:
1. Disable ADK's built-in telemetry to prevent duplicate spans
2. Create Phare spans that mirror ADK's telemetry structure
3. Extract and properly index LLM messages and tool calls
"""

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


class GooogleAdkInstrumentor(CommonInstrumentor):
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
