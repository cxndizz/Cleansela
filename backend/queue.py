import redis
import os
import json
from rq import Queue
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# Try to connect to Redis, fallback to in-memory queue if Redis is unavailable
try:
    # Connect to Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_conn = redis.from_url(REDIS_URL)
    redis_conn.ping()  # Check connection
    
    # Create queue
    job_queue = Queue("data_cleanser", connection=redis_conn)
    logger.info("Connected to Redis queue")
    
    USING_REDIS = True
except Exception as e:
    logger.warning(f"Redis connection failed: {e}. Falling back to in-memory queue.")
    
    # In-memory queue fallback
    class InMemoryQueue:
        def __init__(self):
            self.jobs = {}
        
        def enqueue(self, func, *args, **kwargs):
            import threading
            import uuid
            
            job_id = str(uuid.uuid4())
            
            # Create a simple job object
            class Job:
                def __init__(self, id):
                    self.id = id
                    self.status = "queued"
                    self.progress = 0
                    self.result = None
                    self.error = None
                
                def get_status(self):
                    return self.status
                
                def get_id(self):
                    return self.id
                
                def meta(self):
                    return {"progress": self.progress}
                
            job = Job(job_id)
            self.jobs[job_id] = job
            
            # Run the job in a separate thread
            def run_job():
                try:
                    job.status = "running"
                    result = func(*args, **kwargs)
                    job.result = result
                    job.status = "completed"
                except Exception as e:
                    job.error = str(e)
                    job.status = "failed"
            
            thread = threading.Thread(target=run_job)
            thread.start()
            
            return job
        
        def fetch_job(self, job_id):
            return self.jobs.get(job_id)
    
    job_queue = InMemoryQueue()
    logger.info("Using in-memory queue")
    
    USING_REDIS = False

def get_job_queue():
    return job_queue

def get_job_status(job_id):
    job = job_queue.fetch_job(job_id)
    
    if not job:
        return None
    
    status = job.get_status()
    progress = 0
    download_url = None
    error = None
    
    if hasattr(job, "meta") and callable(job.meta):
        meta = job.meta
        if isinstance(meta, dict):
            progress = meta.get("progress", 0)
            download_url = meta.get("download_url")
    
    if status == "failed" and hasattr(job, "error"):
        error = job.error
    
    if status == "completed" and hasattr(job, "result"):
        result = job.result
        if isinstance(result, dict):
            download_url = result.get("download_url")
    
    return {
        "job_id": job_id,
        "status": status,
        "progress": progress,
        "download_url": download_url,
        "error": error,
    }