"""Type definitions for agent requests and responses."""
from typing import List, Optional, Any, Dict
from dataclasses import dataclass


@dataclass
class FunctionPayload:
    """Payload from a function call response."""
    name: str
    payload: Any


@dataclass
class AgentCallRequest:
    """Request to call an agent."""
    question: str
    session_id: str


@dataclass
class AgentCallResponse:
    """Response from an agent call."""
    answer: str
    function_payloads: List[FunctionPayload] = None
    
    def __post_init__(self):
        if self.function_payloads is None:
            self.function_payloads = []

