from fastapi import APIRouter, HTTPException
from app.models import JobResponse, JobStatus
from app.queue import get_job_status
import os
import logging

router = APIRouter(prefix="/api", tags=["job"])
logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:9001")

@router.get("/job/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    # Get job status from queue
    status = get_job_status(job_id)
    
    if not status:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )
    
    # Create response
    response = JobResponse(
        job_id=job_id,
        status=JobStatus(status["status"]),
        progress=status["progress"],
    )
    
    # Add download URL if completed
    if status["download_url"]:
        response.download_url = f"{BACKEND_URL}/{status['download_url']}"
    
    # Add error message if failed
    if status["error"]:
        response.error = status["error"]
    
    return response