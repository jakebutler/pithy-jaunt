"""
GitIngest Service - FastAPI application for generating LLM-friendly repository reports
"""
import os
import uuid
import asyncio
import logging
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, Header, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import httpx

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title="GitIngest Service", version="1.0.0")

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
API_KEY = os.getenv("INGEST_API_KEY")
if not API_KEY:
    logger.warning("INGEST_API_KEY not set - authentication will fail")

GH_TOKEN = os.getenv("GH_TOKEN")  # Optional GitHub token for private repos
MAX_TIMEOUT = int(os.getenv("MAX_TIMEOUT", "300"))  # 5 minutes default

# In-memory job storage (in production, use Redis or database)
jobs: dict[str, dict] = {}


class IngestRequest(BaseModel):
    repoUrl: HttpUrl
    branch: str = "main"
    callbackUrl: Optional[HttpUrl] = None


class IngestResponse(BaseModel):
    status: str
    jobId: str
    estimatedTime: int = 30


async def verify_api_key(authorization: Optional[str] = Header(None)) -> None:
    """Verify API key from Authorization header"""
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Service misconfigured: API key not set"
        )
    
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing authorization header"
        )
    
    expected = f"Bearer {API_KEY}"
    if authorization != expected:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )


async def generate_report(repo_url: str, branch: str) -> dict:
    """
    Generate repository report using GitIngest library
    
    This is a placeholder implementation. Replace with actual GitIngest integration.
    """
    try:
        # TODO: Import and use GitIngest library
        # from gitingest import GitIngest
        # 
        # ingest = GitIngest(repo_url=repo_url, branch=branch)
        # report = await ingest.generate_report()
        
        # Placeholder report structure
        logger.info(f"Generating report for {repo_url} (branch: {branch})")
        
        # Simulate processing time
        await asyncio.sleep(2)
        
        report = {
            "summary": f"Repository analysis for {repo_url} on branch {branch}",
            "structure": {
                "directories": [],
                "fileCount": 0,
                "languages": [],
                "entryPoints": []
            },
            "patterns": {
                "framework": "unknown",
                "architecture": "unknown",
                "testing": [],
                "buildTools": []
            },
            "dependencies": {
                "runtime": [],
                "dev": [],
                "packageManager": "unknown"
            },
            "llmContext": f"This is a placeholder report for {repo_url}. Replace with actual GitIngest implementation.",
            "generatedAt": int(datetime.now().timestamp() * 1000)
        }
        
        return report
    except Exception as e:
        logger.error(f"Error generating report: {e}", exc_info=True)
        raise


async def send_webhook_callback(callback_url: str, job_id: str, repo_url: str, branch: str, status: str, report: Optional[dict] = None, error: Optional[str] = None):
    """Send webhook callback to Next.js app"""
    payload = {
        "jobId": job_id,
        "repoUrl": repo_url,
        "branch": branch,
        "status": status,
    }
    
    if report:
        payload["report"] = report
    if error:
        payload["error"] = error
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(callback_url, json=payload)
                response.raise_for_status()
                logger.info(f"Webhook callback sent successfully (attempt {attempt + 1})")
                return
        except Exception as e:
            logger.warning(f"Webhook callback failed (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                # Exponential backoff
                await asyncio.sleep(2 ** attempt)
            else:
                logger.error(f"Webhook callback failed after {max_retries} attempts")
                # Store for manual retrieval if needed
                jobs[job_id]["webhookFailed"] = True


async def process_ingest_job(job_id: str, repo_url: str, branch: str, callback_url: Optional[str]):
    """Background task to process ingest job"""
    jobs[job_id]["status"] = "processing"
    
    try:
        # Set timeout for report generation
        report = await asyncio.wait_for(
            generate_report(repo_url, branch),
            timeout=MAX_TIMEOUT
        )
        
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["report"] = report
        jobs[job_id]["completedAt"] = datetime.now().isoformat()
        
        # Send webhook callback if provided
        if callback_url:
            await send_webhook_callback(
                callback_url,
                job_id,
                repo_url,
                branch,
                "completed",
                report=report
            )
        
    except asyncio.TimeoutError:
        error_msg = f"Report generation timed out after {MAX_TIMEOUT} seconds"
        logger.error(error_msg)
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = error_msg
        
        if callback_url:
            await send_webhook_callback(
                callback_url,
                job_id,
                repo_url,
                branch,
                "failed",
                error=error_msg
            )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Report generation failed: {error_msg}", exc_info=True)
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = error_msg
        
        if callback_url:
            await send_webhook_callback(
                callback_url,
                job_id,
                repo_url,
                branch,
                "failed",
                error=error_msg
            )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "gitingest",
        "version": "1.0.0"
    }


@app.post("/ingest", response_model=IngestResponse, dependencies=[Depends(verify_api_key)])
async def ingest(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
):
    """
    Generate LLM-friendly repository report
    
    Accepts repository URL and branch, returns job ID for async processing.
    Results are delivered via webhook callback.
    """
    
    # Validate repository URL
    repo_url = str(request.repoUrl)
    if not repo_url.startswith("https://github.com/"):
        raise HTTPException(
            status_code=400,
            detail="Only GitHub repositories are supported"
        )
    
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Initialize job
    jobs[job_id] = {
        "status": "queued",
        "repoUrl": repo_url,
        "branch": request.branch,
        "createdAt": datetime.now().isoformat(),
    }
    
    # Start background task
    background_tasks.add_task(
        process_ingest_job,
        job_id,
        repo_url,
        request.branch,
        str(request.callbackUrl) if request.callbackUrl else None
    )
    
    logger.info(f"Started ingest job {job_id} for {repo_url}")
    
    return IngestResponse(
        status="processing",
        jobId=job_id,
        estimatedTime=30
    )


@app.get("/job/{job_id}", dependencies=[Depends(verify_api_key)])
async def get_job_status(job_id: str):
    """Get job status (for debugging/monitoring)"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return jobs[job_id]


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)


