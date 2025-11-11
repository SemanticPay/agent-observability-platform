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


class ExamType(Enum):
    MEDICAL = "medical"
    DRIVING = "driving"


class Clinic(BaseModel):
    """Represents a clinic with exam capabilities."""
    id: Optional[str]
    name: str
    address: str
    latitude: float
    longitude: float
    exam_types: list[ExamType]
    distance_km: float = 0.0

    def deepcopy(self) -> "Clinic":
        dump = self.model_dump()
        return Clinic.model_validate(dump)


class Booking(BaseModel):
    """Represents an exam booking."""
    id: Optional[str] = None
    clinic_id: str
    exam_type: ExamType
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
