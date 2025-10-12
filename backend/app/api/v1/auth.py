from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta

from ...core.database import get_db
from ...core.auth import authenticate_user, create_access_token, get_password_hash, get_current_user, verify_password
from ...core.config import JWT_ACCESS_TOKEN_EXPIRE_MINUTES
from ...models.models import User
from ...schemas.user import UserCreate, UserResponse, UserLogin, Token, UserUpdateProfile, UserUpdatePassword, UserDeleteConfirmation

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        # Validate password length (bcrypt limit is 72 bytes)
        if len(user.password.encode('utf-8')) > 72:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is too long. Maximum length is 72 bytes."
            )
        
        # Hash the password
        hashed_password = get_password_hash(user.password)
        
        # Create new user
        db_user = User(
            name=user.name,
            email=user.email,
            password_hash=hashed_password
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )


@router.post("/login", response_model=Token)
async def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    expires_delta = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=expires_delta)
    
    # Calculate expiration time
    expires_at = datetime.utcnow() + expires_delta
    expires_in = int(expires_delta.total_seconds())
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "expires_at": expires_at
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user profile"""
    return current_user


@router.put("/me/profile", response_model=UserResponse)
async def update_user_profile(
    profile_data: UserUpdateProfile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user profile (name and/or email)"""
    try:
        # Update name if provided
        if profile_data.name is not None:
            current_user.name = profile_data.name
        
        # Update email if provided
        if profile_data.email is not None:
            # Check if email is already taken by another user
            existing_user = db.query(User).filter(
                User.email == profile_data.email,
                User.user_id != current_user.user_id
            ).first()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            
            current_user.email = profile_data.email
        
        db.commit()
        db.refresh(current_user)
        
        return current_user
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )


@router.put("/me/password")
async def update_user_password(
    password_data: UserUpdatePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user password"""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password length (bcrypt limit is 72 bytes)
    if len(password_data.new_password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long. Maximum length is 72 bytes."
        )
    
    # Hash and update new password
    current_user.password_hash = get_password_hash(password_data.new_password)
    
    db.commit()
    
    return {"message": "Password updated successfully"}


@router.delete("/me")
async def delete_user_account(
    delete_data: UserDeleteConfirmation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user account (requires password confirmation)"""
    # Verify password
    if not verify_password(delete_data.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is incorrect"
        )
    
    # Delete user (cascade will handle related events, layouts, and custom elements)
    db.delete(current_user)
    db.commit()
    
    return {"message": "Account deleted successfully"}