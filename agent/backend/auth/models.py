"""Pydantic models for authentication."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Request model for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")


class UserInDB(BaseModel):
    """User model as stored in database."""
    id: UUID
    email: str
    password_hash: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """User response model (without password hash)."""
    id: UUID
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT token response model."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires


class TokenData(BaseModel):
    """Data extracted from JWT token."""
    user_id: Optional[str] = None
    email: Optional[str] = None
    token_type: Optional[str] = None  # "access" or "refresh"
