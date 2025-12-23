"""User repository for database operations."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from agent.backend.auth.models import UserCreate, UserInDB
from agent.backend.auth.utils import hash_password


async def create_user(db: AsyncSession, user: UserCreate) -> UserInDB:
    """
    Create a new user in the database.
    
    Args:
        db: Database session
        user: User creation data (email, password)
        
    Returns:
        Created user with ID and timestamp
        
    Raises:
        IntegrityError: If email already exists
    """
    # password_hash = hash_password(user.password)
    # TODO: hash password
    password_hash = user.password
    
    result = await db.execute(
        text("""
            INSERT INTO users (email, password_hash)
            VALUES (:email, :password_hash)
            RETURNING id, email, password_hash, created_at
        """),
        {"email": user.email, "password_hash": password_hash}
    )
    
    row = result.fetchone()
    await db.commit()
    
    return UserInDB(
        id=row.id,
        email=row.email,
        password_hash=row.password_hash,
        created_at=row.created_at
    )


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[UserInDB]:
    """
    Get a user by email address.
    
    Args:
        db: Database session
        email: User's email address
        
    Returns:
        UserInDB if found, None otherwise
    """
    result = await db.execute(
        text("""
            SELECT id, email, password_hash, created_at
            FROM users
            WHERE email = :email
        """),
        {"email": email}
    )
    
    row = result.fetchone()
    
    if row is None:
        return None
    
    return UserInDB(
        id=row.id,
        email=row.email,
        password_hash=row.password_hash,
        created_at=row.created_at
    )


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[UserInDB]:
    """
    Get a user by UUID.
    
    Args:
        db: Database session
        user_id: User's UUID
        
    Returns:
        UserInDB if found, None otherwise
    """
    result = await db.execute(
        text("""
            SELECT id, email, password_hash, created_at
            FROM users
            WHERE id = :user_id
        """),
        {"user_id": str(user_id)}
    )
    
    row = result.fetchone()
    
    if row is None:
        return None
    
    return UserInDB(
        id=row.id,
        email=row.email,
        password_hash=row.password_hash,
        created_at=row.created_at
    )
