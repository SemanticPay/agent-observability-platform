"""FastAPI dependencies for authentication."""
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from agent.backend.auth.models import TokenData, UserInDB
from agent.backend.auth.utils import decode_token
from agent.backend.database.postgres import get_db

# OAuth2 scheme for token extraction from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> UserInDB:
    """
    FastAPI dependency to get the current authenticated user.
    
    Extracts and validates JWT token from Authorization header,
    then fetches user from database.
    
    Args:
        token: JWT token from Authorization header
        db: Database session
        
    Returns:
        UserInDB object for authenticated user
        
    Raises:
        HTTPException: 401 if token invalid or user not found
    """
    print("dependencies get_current_user")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="unauthorized",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None:
            raise credentials_exception
            
        # Only accept access tokens, not refresh tokens
        if token_type != "access":
            raise credentials_exception
            
        token_data = TokenData(user_id=user_id, token_type=token_type)
        
    except JWTError:
        raise credentials_exception
    
    # Import here to avoid circular imports
    from agent.backend.repositories.users import get_user_by_id
    
    user = await get_user_by_id(db, UUID(token_data.user_id))
    
    if user is None:
        raise credentials_exception
        
    return user


async def get_current_user_optional(
    token: Annotated[str | None, Depends(OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False))],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> UserInDB | None:
    """
    Optional version of get_current_user.
    Returns None if no token provided instead of raising exception.
    """
    if token is None:
        return None
    
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None
