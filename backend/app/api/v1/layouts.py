from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ...core.database import get_db
from ...core.auth import get_current_user
from ...models.models import User, Event, Layout
from ...schemas.layout import LayoutCreate, LayoutUpdate, LayoutResponse, LayoutExport

router = APIRouter()


@router.post("/", response_model=LayoutResponse, status_code=status.HTTP_201_CREATED)
async def create_layout(
    layout: LayoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new layout for an event"""
    # Verify event belongs to current user
    event = db.query(Event).filter(
        Event.event_id == layout.event_id,
        Event.user_id == current_user.user_id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    db_layout = Layout(
        event_id=layout.event_id,
        name=layout.name,
        layout=layout.layout
    )
    
    db.add(db_layout)
    db.commit()
    db.refresh(db_layout)
    
    return db_layout


@router.get("/event/{event_id}", response_model=List[LayoutResponse])
async def get_event_layouts(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all layouts for a specific event"""
    # Verify event belongs to current user
    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.user_id == current_user.user_id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    layouts = db.query(Layout).filter(Layout.event_id == event_id).all()
    return layouts


@router.get("/{layout_id}", response_model=LayoutResponse)
async def get_layout(
    layout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific layout"""
    layout = db.query(Layout).join(Event).filter(
        Layout.layout_id == layout_id,
        Event.user_id == current_user.user_id
    ).first()
    
    if not layout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Layout not found"
        )
    
    return layout


@router.put("/{layout_id}", response_model=LayoutResponse)
async def update_layout(
    layout_id: int,
    layout_update: LayoutUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a layout"""
    layout = db.query(Layout).join(Event).filter(
        Layout.layout_id == layout_id,
        Event.user_id == current_user.user_id
    ).first()
    
    if not layout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Layout not found"
        )
    
    # Update fields that are provided
    update_data = layout_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(layout, field, value)
    
    db.commit()
    db.refresh(layout)
    
    return layout


@router.delete("/{layout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_layout(
    layout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a layout"""
    layout = db.query(Layout).join(Event).filter(
        Layout.layout_id == layout_id,
        Event.user_id == current_user.user_id
    ).first()
    
    if not layout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Layout not found"
        )
    
    db.delete(layout)
    db.commit()


@router.get("/{layout_id}/export", response_model=LayoutExport)
async def export_layout(
    layout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export layout data with event information"""
    layout = db.query(Layout).join(Event).filter(
        Layout.layout_id == layout_id,
        Event.user_id == current_user.user_id
    ).first()
    
    if not layout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Layout not found"
        )
    
    # Create export data
    export_data = LayoutExport(
        layout_id=layout.layout_id,
        name=layout.name,
        layout=layout.layout or {},
        event_title=layout.event.title,
        event_date=layout.event.date,
        exported_at=datetime.utcnow()
    )
    
    return export_data


@router.get("/", response_model=List[LayoutResponse])
async def get_user_layouts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all layouts for the current user"""
    layouts = db.query(Layout).join(Event).filter(
        Event.user_id == current_user.user_id
    ).all()
    
    return layouts