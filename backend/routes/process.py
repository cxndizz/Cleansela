from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models import ProcessRequest, ProcessResponse
from app.queue import get_job_queue
from app.services.processor import process_file
import os
import uuid
import logging

router = APIRouter(prefix="/api", tags=["process"])
logger = logging.getLogger(__name__)

TEMP_DIR = os.getenv("TEMP_DIR", "./tmp")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:9001")

@router.post("/process", response_model=ProcessResponse)
async def process_data(request: ProcessRequest):
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
    
    # Create output directory
    output_dir = os.path.join(TEMP_DIR, request.upload_id, "output")
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate job_id
    job_id = str(uuid.uuid4())
    
    # Enqueue the processing job
    job_queue = get_job_queue()
    job = job_queue.enqueue(
        process_file,
        file_path,
        request.rules,
        request.export,
        job_id,
        request.upload_id,
        result_ttl=3600,  # 1 hour
        job_id=job_id
    )
    
    return ProcessResponse(job_id=job_id)