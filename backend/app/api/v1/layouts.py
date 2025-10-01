from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ...core.database import get_db
from ...models.models import Layout
from ...schemas.layout import LayoutCreate, LayoutUpdate

router = APIRouter()


@router.get("/")
async def get_layouts(
    event_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get layouts, optionally filtered by event_id"""
    query = db.query(Layout)
    
    if event_id:
        query = query.filter(Layout.event_id == event_id)
    
    layouts = query.all()
    
    result = []
    for layout in layouts:
        layout_dict = {
            "id": layout.layout_id,
            "layout_id": layout.layout_id,
            "event_id": layout.event_id,
            "name": layout.name,
            "title": layout.name,
            "layout": layout.layout,
            "elements": layout.layout.get("elements", []) if layout.layout else [],
            "created_at": layout.created_at,
            "updated_at": layout.updated_at
        }
        result.append(layout_dict)
    
    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_layout(
    layout: LayoutCreate,
    db: Session = Depends(get_db)
):
    """Create a new layout for an event"""
    
    layout_name = layout.title or layout.name or "Untitled Layout"
    
    layout_data = {
        "elements": layout.elements or []
    }
    
    db_layout = Layout(
        event_id=layout.event_id,
        name=layout_name,
        layout=layout_data
    )
    
    db.add(db_layout)
    db.commit()
    db.refresh(db_layout)
    
    return {
        "id": db_layout.layout_id,
        "layout_id": db_layout.layout_id,
        "event_id": db_layout.event_id,
        "name": db_layout.name,
        "title": db_layout.name,
        "layout": db_layout.layout,
        "elements": db_layout.layout.get("elements", []) if db_layout.layout else [],
        "created_at": db_layout.created_at,
        "updated_at": db_layout.updated_at
    }


@router.get("/{layout_id}")
async def get_layout(
    layout_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific layout by ID"""
    layout = db.query(Layout).filter(Layout.layout_id == layout_id).first()
    
    if not layout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Layout not found"
        )
    
    return {
        "id": layout.layout_id,
        "layout_id": layout.layout_id,
        "event_id": layout.event_id,
        "name": layout.name,
        "title": layout.name,
        "layout": layout.layout,
        "elements": layout.layout.get("elements", []) if layout.layout else [],
        "created_at": layout.created_at,
        "updated_at": layout.updated_at
    }


@router.put("/{layout_id}")
async def update_layout(
    layout_id: int,
    layout: LayoutUpdate,
    db: Session = Depends(get_db)
):
    """Update a specific layout by ID"""
    db_layout = db.query(Layout).filter(Layout.layout_id == layout_id).first()
    
    if not db_layout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Layout not found"
        )
    
    layout_name = layout.title or layout.name or db_layout.name
    
    layout_data = {
        "elements": layout.elements or []
    }
    
    # Update the layout
    db_layout.name = layout_name
    db_layout.layout = layout_data
    
    db.commit()
    db.refresh(db_layout)
    
    return {
        "id": db_layout.layout_id,
        "layout_id": db_layout.layout_id,
        "event_id": db_layout.event_id,
        "name": db_layout.name,
        "title": db_layout.name,
        "layout": db_layout.layout,
        "elements": db_layout.layout.get("elements", []) if db_layout.layout else [],
        "created_at": db_layout.created_at,
        "updated_at": db_layout.updated_at
    }


@router.delete("/{layout_id}")
async def delete_layout(
    layout_id: int,
    db: Session = Depends(get_db)
):
    """Delete a specific layout by ID"""
    layout = db.query(Layout).filter(Layout.layout_id == layout_id).first()
    
    if not layout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Layout not found"
        )
    
    db.delete(layout)
    db.commit()
    
    return {"message": "Layout deleted successfully"}
