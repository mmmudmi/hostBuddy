from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import Optional


# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password cannot be longer than 72 bytes')
        return v


class UserResponse(UserBase):
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int  # seconds until expiration
    expires_at: datetime  # absolute expiration time


class TokenData(BaseModel):
    email: Optional[str] = None