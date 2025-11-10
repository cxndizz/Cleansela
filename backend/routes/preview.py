from fastapi import APIRouter, HTTPException, Depends
from app.models import PreviewRequest, PreviewResponse, ColumnInfo
from app.services.transform import apply_rules_preview
import os
import logging

router = APIRouter(prefix="/api", tags=["preview"])
logger = logging.getLogger(__name__)

TEMP_DIR = os.getenv("TEMP_DIR", "./tmp")

@router.post("/preview", response_model=PreviewResponse)
async def preview_data(request: PreviewRequest):
    # Validate upload_id
    upload_dir = os.path.join(TEMP_DIR, request.upload_id)
    if not os.path.exists(upload_dir):
        raise HTTPException(
            status_code=404,
            detail="Upload not found"
        )
    
    # Find the uploaded file
    files = os.listdir(upload_dir)
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No files found in upload"
        )
    
    file_path = os.path.join(upload_dir, files[0])
    
    # Apply rules to preview data
    try:
        preview_result = apply_rules_preview(file_path, request.rules)
        
        # Convert to response model
        columns = [
            ColumnInfo(
                name=col["name"], 
                inferred_type=col["inferredType"]
            ) 
            for col in preview_result["columns"]
        ]
        
        return PreviewResponse(
            columns=columns,
            rows=preview_result["rows"],
            warnings=preview_result.get("warnings", [])
        )
    except Exception as e:
        logger.error(f"Error generating preview: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating preview: {str(e)}"
        )