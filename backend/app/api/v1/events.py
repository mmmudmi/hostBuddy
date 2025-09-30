from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ...core.database import get_db
from ...core.auth import get_current_user
from ...models.models import User, Event
from ...schemas.event import EventCreate, EventUpdate, EventResponse, ImageUpload

router = APIRouter()


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new event"""
    # Create the event
    db_event = Event(
        user_id=current_user.user_id,
        title=event.title,
        description=event.description,
        location=event.location,
        images=event.images or [],
        start_date=event.start_date,
        end_date=event.end_date,
        start_time=event.start_time,
        end_time=event.end_time
    )
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    return db_event


@router.get("/", response_model=List[EventResponse])
async def get_user_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all events for the current user"""
    events = db.query(Event).filter(
        Event.user_id == current_user.user_id
    ).all()
    return events


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific event"""
    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.user_id == current_user.user_id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    return event


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    event_update: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an event"""
    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.user_id == current_user.user_id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Update event fields
    update_data = event_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)
    
    db.commit()
    db.refresh(event)
    
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an event"""
    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.user_id == current_user.user_id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    db.delete(event)
    db.commit()


@router.post("/{event_id}/images", response_model=EventResponse)
async def add_image_to_event(
    event_id: int,
    image_upload: ImageUpload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add an image URL to an event"""
    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.user_id == current_user.user_id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Add image URL to the array
    if event.images is None:
        event.images = []
    
    event.images.append(image_upload.image_url)
    
    db.commit()
    db.refresh(event)
    
    return event


@router.delete("/{event_id}/images/{image_index}", response_model=EventResponse)
async def remove_image_from_event(
    event_id: int,
    image_index: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove an image from an event by index"""
    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.user_id == current_user.user_id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    if not event.images or image_index >= len(event.images) or image_index < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image index"
        )
    
    # Remove image at the specified index
    event.images.pop(image_index)
    
    db.commit()
    db.refresh(event)
    
    return event