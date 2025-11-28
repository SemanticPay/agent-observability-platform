from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource

# Initialize Prometheus Metric Reader
# This reader will register itself with the default prometheus_client registry
reader = PrometheusMetricReader()
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)
meter = metrics.get_meter("agent-observability")

# Define metrics
total_cost_counter = meter.create_counter(
    "total_cost",
    description="Total cost of LLM usage",
    unit="USD"
)

total_tokens_counter = meter.create_counter(
    "total_tokens",
    description="Total tokens used",
    unit="tokens"
)

tool_calls_counter = meter.create_counter(
    "tool_calls",
    description="Number of tool calls",
    unit="1"
)

execution_duration_histogram = meter.create_histogram(
    "execution_duration",
    description="Execution duration of agent calls",
    unit="s"
)

# Initialize Tracer Provider
resource = Resource.create({"service.name": "agent-observability-platform"})
tracer_provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(ConsoleSpanExporter())
tracer_provider.add_span_processor(processor)
trace.set_tracer_provider(tracer_provider)

tracer = trace.get_tracer("agent-observability")
