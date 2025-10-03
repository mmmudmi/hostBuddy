from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from ...core.database import get_db
from ...core.auth import get_current_user
from ...models.models import UserElement, User
from ...schemas.user_element import (
    UserElementCreate, 
    UserElementUpdate, 
    UserElementResponse, 
    UserElementLibrary,
    ElementUsageUpdate
)

router = APIRouter()


@router.get("/", response_model=UserElementLibrary)
async def get_user_elements(
    current_user: User = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Search in name"),
    db: Session = Depends(get_db)
):
    """Get all custom elements for the current user"""
    query = db.query(UserElement).filter(UserElement.user_id == current_user.user_id)
    
    # Search in name
    if search:
        search_filter = f"%{search}%"
        query = query.filter(UserElement.name.ilike(search_filter))
    
    elements = query.all()
    
    return UserElementLibrary(
        elements=elements,
        total_count=len(elements)
    )


@router.post("/", response_model=UserElementResponse, status_code=status.HTTP_201_CREATED)
async def create_user_element(
    element: UserElementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new custom element for the user"""
    
    db_element = UserElement(
        user_id=current_user.user_id,
        name=element.name,
        element_data=element.element_data,
        thumbnail=element.thumbnail
    )
    
    db.add(db_element)
    db.commit()
    db.refresh(db_element)
    
    return db_element


@router.get("/{element_id}", response_model=UserElementResponse)
async def get_user_element(
    element_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific custom element"""
    element = db.query(UserElement).filter(
        UserElement.element_id == element_id,
        UserElement.user_id == current_user.user_id
    ).first()
    
    if not element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom element not found"
        )
    
    return element


@router.put("/{element_id}", response_model=UserElementResponse)
async def update_user_element(
    element_id: int,
    element_update: UserElementUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a custom element"""
    db_element = db.query(UserElement).filter(
        UserElement.element_id == element_id,
        UserElement.user_id == current_user.user_id
    ).first()
    
    if not db_element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom element not found"
        )
    
    # Update fields if provided
    update_data = element_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_element, field, value)
    
    db.commit()
    db.refresh(db_element)
    
    return db_element


@router.delete("/{element_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_element(
    element_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a custom element"""
    db_element = db.query(UserElement).filter(
        UserElement.element_id == element_id,
        UserElement.user_id == current_user.user_id
    ).first()
    
    if not db_element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom element not found"
        )
    
    db.delete(db_element)
    db.commit()


@router.post("/from-selection", response_model=UserElementResponse, status_code=status.HTTP_201_CREATED)
async def create_element_from_selection(
    element: UserElementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a custom element from selected layout elements (grouped/merged)"""
    # This endpoint is specifically for creating elements from selected layout elements
    # The element_data should contain an array of the selected elements' configuration
    
    if not element.element_data or "elements" not in element.element_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="element_data must contain an 'elements' array for group elements"
        )
    
    # Add a type indicator for group elements
    element_data = element.element_data.copy()
    element_data["type"] = "group"
    element_data["element_count"] = len(element_data.get("elements", []))
    
    db_element = UserElement(
        user_id=current_user.user_id,
        name=element.name,
        element_data=element_data,
        thumbnail=element.thumbnail
    )
    
    db.add(db_element)
    db.commit()
    db.refresh(db_element)
    
    return db_element