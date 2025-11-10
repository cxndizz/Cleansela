from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.models import UploadResponse, FileType
from app.services.parser import detect_encoding, parse_sample
import os
import uuid
import shutil
from typing import Optional
import logging
import chardet

router = APIRouter(prefix="/api", tags=["upload"])
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".csv", ".xls", ".xlsx", ".tsv", ".txt"}
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "50000000"))  # 50MB
TEMP_DIR = os.getenv("TEMP_DIR", "./tmp")

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    encoding: Optional[str] = Form("utf-8"),
    has_header: bool = Form(True),
    delimiter: Optional[str] = Form(None),
):
    # Generate unique upload ID
    upload_id = str(uuid.uuid4())
    
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension. Allowed: {ALLOWED_EXTENSIONS}"
        )
    
    # Map extension to file type
    file_type = FileType.CSV
    if file_ext in [".xls", ".xlsx"]:
        file_type = FileType.XLS if file_ext == ".xls" else FileType.XLSX
    elif file_ext == ".tsv":
        file_type = FileType.TSV
    elif file_ext == ".txt":
        file_type = FileType.TXT
    
    # Check file size
    file_size = 0
    contents = await file.read(MAX_FILE_SIZE + 1)
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE/1000000}MB"
        )
    
    # Create user directory if it doesn't exist
    user_dir = os.path.join(TEMP_DIR, upload_id)
    os.makedirs(user_dir, exist_ok=True)
    
    # Save file to temporary location
    file_path = os.path.join(user_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Detect encoding if not specified
    detected_encoding = None
    detected_delimiter = None
    
    if file_type in [FileType.CSV, FileType.TSV, FileType.TXT]:
        # Read the first 10000 bytes to detect encoding
        detection_result = detect_encoding(contents[:10000])
        detected_encoding = detection_result.get("encoding")
        detected_delimiter = detection_result.get("delimiter")
    
    # Use detected encoding if available, otherwise fallback to provided
    final_encoding = detected_encoding if detected_encoding else encoding
    final_delimiter = detected_delimiter if detected_delimiter else delimiter
    
    # Parse sample (first 200 rows)
    sample_data = parse_sample(
        file_path, 
        file_type, 
        final_encoding, 
        has_header, 
        final_delimiter
    )
    
    return UploadResponse(
        upload_id=upload_id,
        sample=sample_data,
        detect={
            "encoding": final_encoding,
            "delimiter": final_delimiter,
        },
        file_type=file_type,
    )

@router.delete("/upload/{upload_id}")
async def delete_upload(upload_id: str):
    # Validate upload_id format to prevent directory traversal
    try:
        uuid.UUID(upload_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid upload ID format"
        )
    
    # Delete the upload directory
    user_dir = os.path.join(TEMP_DIR, upload_id)
    if os.path.exists(user_dir):
        try:
            shutil.rmtree(user_dir)
            return {"message": "Upload deleted successfully"}
        except Exception as e:
            logger.error(f"Error deleting upload {upload_id}: {e}")
            raise HTTPException(
                status_code=500,
                detail="Error deleting upload"
            )
    else:
        return {"message": "Upload not found or already deleted"}