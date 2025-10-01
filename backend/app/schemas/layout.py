from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List


# Layout Schemas
class LayoutBase(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None  # Add title field to match frontend
    layout: Optional[Dict[str, Any]] = None
    elements: Optional[List[Dict[str, Any]]] = None  # Add elements field


class LayoutCreate(LayoutBase):
    event_id: int


class LayoutUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    layout: Optional[Dict[str, Any]] = None
    elements: Optional[List[Dict[str, Any]]] = None


class LayoutResponse(LayoutBase):
    layout_id: int
    id: Optional[int] = None  # Add id alias
    event_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Layout Export Schema
class LayoutExport(BaseModel):
    layout_id: int
    name: str
    layout: Dict[str, Any]
    event_title: str
    event_date: datetime
    exported_at: datetime