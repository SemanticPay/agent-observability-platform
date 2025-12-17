"""Type definitions for agent requests and responses."""
from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime


class FunctionPayload(BaseModel):
    """Payload from a function call response."""
    name: str
    payload: Any


class AgentCallRequest(BaseModel):
    """Request to call an agent."""
    question: str
    session_id: str


class AgentCallResponse(BaseModel):
    """Response from an agent call."""
    answer: str
    function_payloads: Optional[list[FunctionPayload]] = None


class Location(BaseModel):
    """Represents a geographic location."""
    address: str
    latitude: float
    longitude: float
    city: str = ""
    state: str = ""


class Clinic(BaseModel):
    """Represents a clinic with exam capabilities."""
    id: Optional[str]
    name: str
    address: str
    latitude: float
    longitude: float
    exam_types: list[str]
    distance_km: float = 0.0

    def deepcopy(self) -> "Clinic":
        dump = self.model_dump()
        return Clinic.model_validate(dump)


class Booking(BaseModel):
    """Represents an exam booking."""
    id: Optional[str] = None
    clinic_id: str
    exam_type: str
    datetime: datetime
    citizen_name: str


class QueryRequest(BaseModel):
    question: str
    session_id: Optional[str] = None


class QueryResponse(BaseModel):
    response: str
    status: str
    session_id: Optional[str] = None
    widgets: list[Any] = Field(default_factory=list)


class PhotoClassificationEnum(Enum):
    PASSPORT = "passport"
    DRIVING_LICENSE = "driving_license"
    UNKNOWN = "unknown"


class Photo(BaseModel):
    """Represents an uploaded photo with classification."""
    id: Optional[str] = None
    filename: str
    classification: PhotoClassificationEnum
    size: int
    content_type: str
    file_path: Optional[str] = None
    uploaded_at: datetime


class PhotoUploadResponse(BaseModel):
    """Response from photo upload endpoint."""
    status: str
    id: str
    filename: str
    classification: PhotoClassificationEnum
    size: int
    content_type: str


# --- Metrics Response Types ---

class MetricsSummary(BaseModel):
    """Summary of key metrics over a time range."""
    total_cost: float
    total_runs: int = 0
    total_tool_calls: int
    avg_execution_duration: float
    time_range: str


class ToolMetrics(BaseModel):
    """Metrics for a single tool."""
    name: str
    calls: int = 0
    avg_duration: float = 0.0
    success_rate: float = 1.0  # 0.0 to 1.0


class AgentMetrics(BaseModel):
    """Metrics for a single agent."""
    agent_id: str
    cost: float = 0.0
    tokens: int = 0
    tool_calls: int = 0
    llm_requests: int = 0
    duration: float = 0.0


class AgentDetailMetrics(BaseModel):
    """Detailed metrics for a single agent including tool breakdown."""
    name: str
    model: str
    cost: float = 0.0
    runs: int = 0
    avg_duration: float = 0.0
    success_rate: float = 1.0  # 0.0 to 1.0
    tools: list[ToolMetrics] = Field(default_factory=list)
    workflows: list[str] = Field(default_factory=list)
    subagents: list[str] = Field(default_factory=list)


class AgentMetricsResponse(BaseModel):
    """Response containing metrics by agent."""
    agents: list[AgentMetrics]
    time_range: str


class AgentDetailResponse(BaseModel):
    """Response containing detailed metrics for all agents."""
    agents: list[AgentDetailMetrics]
    time_range: str


class TimeSeriesPoint(BaseModel):
    """A single point in a time series."""
    timestamp: str
    value: float


class TimeSeriesData(BaseModel):
    """Time series data for multiple metrics."""
    cost: list[TimeSeriesPoint] = Field(default_factory=list)
    tokens: list[TimeSeriesPoint] = Field(default_factory=list)
    tool_calls: list[TimeSeriesPoint] = Field(default_factory=list)
    duration: list[TimeSeriesPoint] = Field(default_factory=list)


class TimeSeriesResponse(BaseModel):
    """Response containing time series metrics."""
    time_series: TimeSeriesData
    hours: int
    step: str


class AgentInfo(BaseModel):
    """Static configuration info for an agent."""
    name: str
    model: str
    tools: list[str]
    workflows: list[str] = Field(default_factory=list)


class AgentInfoResponse(BaseModel):
    """Response containing static agent configuration."""
    agents: list[AgentInfo]


class ConversationMetrics(BaseModel):
    """Metrics averaged per conversation."""
    total_conversations: int = 0
    avg_cost_per_conversation: float = 0.0
    avg_runs_per_conversation: float = 0.0
    avg_tool_calls_per_conversation: float = 0.0
    time_range: str


# --- Auth Request/Response Types ---

class RegisterRequest(BaseModel):
    """Request model for user registration."""
    email: str
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    """Request model for user login."""
    email: str
    password: str


class LoginResponse(BaseModel):
    """Response model for successful login."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenRefreshRequest(BaseModel):
    """Request model for token refresh."""
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    """Response model for token refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


# --- Ticket Request/Response Types ---

class CreateTicketRequest(BaseModel):
    """Request model for creating a ticket."""
    operation_id: int
    form_data: dict


class CreateTicketResponse(BaseModel):
    """Response model for ticket creation."""
    ticket_id: str  # UUID as string for JSON
    ln_invoice: str  # BOLT11 invoice
    amount_sats: int
    expires_at: datetime  # Invoice expiration timestamp

    class Config:
        from_attributes = True

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        return v

    def __init__(self, **data):
        # Convert UUID to string if needed
        if 'ticket_id' in data and not isinstance(data['ticket_id'], str):
            data['ticket_id'] = str(data['ticket_id'])
        super().__init__(**data)


class TicketResponse(BaseModel):
    """Response model for ticket details."""
    id: str  # UUID as string
    operation_id: int
    operation_name: str
    form_data: dict
    ln_invoice: Optional[str] = None
    amount_sats: int
    payment_status: str
    created_at: datetime

    class Config:
        from_attributes = True

    def __init__(self, **data):
        # Convert UUID to string if needed
        if 'id' in data and not isinstance(data['id'], str):
            data['id'] = str(data['id'])
        super().__init__(**data)


class TicketListResponse(BaseModel):
    """Response model for listing tickets."""
    tickets: list[TicketResponse]
    total: int


class ConfirmPaymentResponse(BaseModel):
    """Response model for payment confirmation."""
    status: str  # 'pending' | 'paid' | 'expired'
