from pydantic import BaseModel, Field
from datetime import datetime, date, time
from typing import Optional, List


# Event Schemas
class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class EventCreate(EventBase):
    images: Optional[List[str]] = []


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    images: Optional[List[str]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None


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