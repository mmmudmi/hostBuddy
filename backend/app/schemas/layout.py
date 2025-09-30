from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any


# Layout Schemas
class LayoutBase(BaseModel):
    name: str
    layout: Optional[Dict[str, Any]] = None


class LayoutCreate(LayoutBase):
    event_id: int


class LayoutUpdate(BaseModel):
    name: Optional[str] = None
    layout: Optional[Dict[str, Any]] = None


class LayoutResponse(LayoutBase):
    layout_id: int
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