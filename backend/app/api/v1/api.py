from fastapi import APIRouter
from . import auth, events, layouts, upload, user_elements

api_router = APIRouter()

# Include all API routes
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(layouts.router, prefix="/layouts", tags=["layouts"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(user_elements.router, prefix="/user-elements", tags=["user-elements"])