"""
Authentication endpoints for user login, registration, and token management.
"""
import logging
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_token
)
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    TokenRefresh,
    PasswordResetRequest,
    PasswordReset
)
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.

    Args:
        user_data: User registration data
        db: Database session

    Returns:
        Created user object

    Raises:
        HTTPException: If email or username already exists
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        role="user"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"New user registered: {new_user.email}")

    return new_user


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user and return access/refresh tokens.

    Args:
        credentials: User login credentials
        db: Database session

    Returns:
        Access and refresh tokens

    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not user.hashed_password or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Create tokens
    token_data = {
        "sub": user.id,
        "email": user.email,
        "role": user.role
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"sub": user.id})

    logger.info(f"User logged in: {user.email}")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    """
    Refresh access token using a valid refresh token.

    Args:
        token_data: Refresh token
        db: Database session

    Returns:
        New access and refresh tokens

    Raises:
        HTTPException: If refresh token is invalid
    """
    # Verify refresh token
    payload = verify_token(token_data.refresh_token, expected_type="refresh")
    user_id: str = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Fetch user
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Create new tokens
    token_data = {
        "sub": user.id,
        "email": user.email,
        "role": user.role
    }

    access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token({"sub": user.id})

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information.

    Args:
        current_user: Current authenticated user from dependency

    Returns:
        Current user object
    """
    return current_user


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout current user.
    Note: In JWT auth, logout is primarily handled client-side by deleting tokens.
    This endpoint is provided for logging purposes and future server-side token blacklisting.

    Args:
        current_user: Current authenticated user

    Returns:
        Logout confirmation message
    """
    logger.info(f"User logged out: {current_user.email}")

    return {
        "message": "Successfully logged out",
        "detail": "Please delete your access and refresh tokens on the client side"
    }


@router.post("/password-reset/request")
async def request_password_reset(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Request a password reset token.

    Args:
        request: Email address for password reset
        db: Database session

    Returns:
        Reset token (in production, this would be emailed)
    """
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        # Return success even if user doesn't exist (security best practice)
        # to prevent email enumeration
        return {
            "message": "If the email exists, a reset token has been generated",
            "reset_token": None
        }

    # Generate reset token
    reset_token = secrets.token_urlsafe(32)

    # Store reset token and expiry in user record
    user.reset_token = reset_token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)

    db.commit()

    logger.info(f"Password reset requested for: {user.email}")

    # In production, send this token via email
    # For demo purposes, we return it directly
    return {
        "message": "Reset token generated successfully",
        "reset_token": reset_token,
        "expires_in": "1 hour"
    }


@router.post("/password-reset/confirm")
async def reset_password(reset_data: PasswordReset, db: Session = Depends(get_db)):
    """
    Reset password using a valid reset token.

    Args:
        reset_data: Reset token and new password
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If token is invalid or expired
    """
    # Find user with matching reset token
    user = db.query(User).filter(User.reset_token == reset_data.reset_token).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )

    # Check if token is expired
    if not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )

    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)

    # Clear reset token
    user.reset_token = None
    user.reset_token_expires = None

    db.commit()

    logger.info(f"Password reset completed for: {user.email}")

    return {
        "message": "Password has been reset successfully"
    }
