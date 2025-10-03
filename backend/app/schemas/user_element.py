from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class UserElementBase(BaseModel):
    name: str
    element_data: Dict[str, Any]  # Stores the element configuration
    thumbnail: Optional[str] = None  # Base64 encoded thumbnail


class UserElementCreate(UserElementBase):
    pass


class UserElementUpdate(BaseModel):
    name: Optional[str] = None
    element_data: Optional[Dict[str, Any]] = None
    thumbnail: Optional[str] = None


class UserElementResponse(UserElementBase):
    element_id: int
    user_id: int

    class Config:
        from_attributes = True


class UserElementLibrary(BaseModel):
    """Response model for user's custom element library"""
    elements: List[UserElementResponse]
    total_count: int


class ElementUsageUpdate(BaseModel):
    """Model for updating element usage count"""
    element_id: int