"""API route modules."""
from agent.backend.routes.auth import router as auth_router
from agent.backend.routes.operations import router as operations_router
from agent.backend.routes.tickets import router as tickets_router

__all__ = [
    "auth_router",
    "operations_router",
    "tickets_router",
]
