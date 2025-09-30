from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from typing import List
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.auth import get_current_user
from ...core.storage import storage_service
from ...models.models import User

router = APIRouter()

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/upload")
async def upload_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload multiple images and return their URLs"""
    
    if len(files) > 5:  # Limit to 5 files per upload
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 files allowed per upload"
        )
    
    uploaded_urls = []
    
    for file in files:
        # Validate file type
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )
        
        file_extension = '.' + file.filename.split('.')[-1].lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_extension} not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Check file size
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} is too large. Maximum size: 10MB"
            )
        
        # Reset file pointer
        await file.seek(0)
        
        # Upload to S3
        file_url = await storage_service.upload_file(file, folder="events")
        
        if not file_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload {file.filename}"
            )
        
        uploaded_urls.append({
            "filename": file.filename,
            "url": file_url
        })
    
    return {
        "message": f"Successfully uploaded {len(uploaded_urls)} file(s)",
        "files": uploaded_urls
    }

@router.delete("/delete")
async def delete_image(
    file_url: str,
    current_user: User = Depends(get_current_user)
):
    """Delete an uploaded image"""
    
    success = storage_service.delete_file(file_url)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file"
        )
    
    return {"message": "File deleted successfully"}