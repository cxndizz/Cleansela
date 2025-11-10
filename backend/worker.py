import os
import time
import logging
from dotenv import load_dotenv
from rq import Worker, Queue, Connection
import redis
from app.queue import get_job_queue

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def start_worker():
    """Start RQ worker"""
    try:
        # Get queue
        job_queue = get_job_queue()
        
        # Start worker
        with Connection():
            worker = Worker([job_queue])
            worker.work()
    except Exception as e:
        logger.error(f"Error starting worker: {e}")
        raise

if __name__ == "__main__":
    start_worker()