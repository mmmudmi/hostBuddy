from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


# Event Schemas
class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: datetime
    location: Optional[str] = None


class EventCreate(EventBase):
    images: Optional[List[str]] = []


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    images: Optional[List[str]] = None


class EventResponse(EventBase):
    event_id: int
    user_id: int
    images: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Image Upload Schema
class ImageUpload(BaseModel):
    event_id: int
    image_url: str