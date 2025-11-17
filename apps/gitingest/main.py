"""
GitIngest Service - FastAPI application for generating LLM-friendly repository reports
"""
import os
import uuid
import asyncio
import logging
import tempfile
import shutil
from typing import Optional
from datetime import datetime
from pathlib import Path
import re

from fastapi import FastAPI, Header, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import httpx
from git import Repo, GitCommandError
from pygments.lexers import get_lexer_for_filename, guess_lexer_for_filename
from pygments.util import ClassNotFound

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


async def analyze_repository(repo_path: Path) -> dict:
    """Analyze repository structure and generate report"""
    structure = {
        "directories": [],
        "fileCount": 0,
        "languages": set(),
        "entryPoints": []
    }
    
    patterns = {
        "framework": "unknown",
        "architecture": "unknown",
        "testing": [],
        "buildTools": []
    }
    
    dependencies = {
        "runtime": [],
        "dev": [],
        "packageManager": "unknown"
    }
    
    # Common entry points
    entry_point_patterns = [
        "main.py", "app.py", "index.py", "server.py", "app.js", "index.js",
        "main.ts", "index.ts", "main.go", "main.rs", "main.java", "App.java",
        "index.html", "app.tsx", "App.tsx", "main.tsx"
    ]
    
    # Framework detection patterns
    framework_patterns = {
        "Next.js": ["next.config", "package.json"],
        "React": ["package.json"],
        "Vue": ["vue.config", "vite.config"],
        "Django": ["manage.py", "settings.py"],
        "Flask": ["app.py", "application.py"],
        "FastAPI": ["main.py", "app.py"],
        "Express": ["package.json", "server.js"],
        "Spring Boot": ["pom.xml", "build.gradle"],
        "Rails": ["Gemfile", "config.ru"],
    }
    
    # Build tool detection
    build_tools = {
        "npm": "package.json",
        "yarn": "yarn.lock",
        "pnpm": "pnpm-lock.yaml",
        "pip": "requirements.txt",
        "poetry": "pyproject.toml",
        "cargo": "Cargo.toml",
        "maven": "pom.xml",
        "gradle": "build.gradle",
        "go": "go.mod",
    }
    
    # Walk through repository
    import os
    for root, dirs, files in os.walk(repo_path):
        # Skip hidden directories and common ignore patterns
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', '__pycache__', 'venv', '.git']]
        
        rel_root = Path(root).relative_to(repo_path)
        if str(rel_root) != '.':
            structure["directories"].append(str(rel_root))
        
        for file in files:
            if file.startswith('.'):
                continue
            
            file_path = Path(root) / file
            rel_path = file_path.relative_to(repo_path)
            
            structure["fileCount"] += 1
            
            # Detect language
            try:
                # Use get_lexer_for_filename which only needs the filename
                lexer = get_lexer_for_filename(str(file_path))
                lang = lexer.name
                if lang not in ['Text only', 'Text']:
                    structure["languages"].add(lang)
            except (ClassNotFound, ValueError):
                # If we can't detect from filename, try to guess from content
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read(1024)  # Read first 1KB
                        if content.strip():
                            lexer = guess_lexer_for_filename(str(file_path), content)
                            lang = lexer.name
                            if lang not in ['Text only', 'Text']:
                                structure["languages"].add(lang)
                except:
                    pass
            
            # Check for entry points
            if file in entry_point_patterns:
                structure["entryPoints"].append(str(rel_path))
            
            # Check for framework indicators
            for framework, indicators in framework_patterns.items():
                if any(indicator in str(rel_path) for indicator in indicators):
                    if patterns["framework"] == "unknown":
                        patterns["framework"] = framework
            
            # Check for build tools
            for tool, indicator in build_tools.items():
                if file == indicator:
                    if patterns["buildTools"] and tool not in patterns["buildTools"]:
                        patterns["buildTools"].append(tool)
                    elif not patterns["buildTools"]:
                        patterns["buildTools"] = [tool]
                    dependencies["packageManager"] = tool
            
            # Check for test files
            if any(test_pattern in str(rel_path) for test_pattern in ['test_', '_test', '.test.', '.spec.', 'tests/']):
                test_framework = "unknown"
                if '.test.' in str(rel_path) or '.spec.' in str(rel_path):
                    if 'jest' in str(rel_path) or 'package.json' in str(rel_path):
                        test_framework = "Jest"
                    elif 'pytest' in str(rel_path) or 'test_' in str(rel_path):
                        test_framework = "pytest"
                    elif 'unittest' in str(rel_path):
                        test_framework = "unittest"
                if test_framework not in patterns["testing"]:
                    patterns["testing"].append(test_framework)
            
            # Parse package files for dependencies
            if file == "package.json":
                try:
                    import json
                    with open(file_path, 'r') as f:
                        pkg = json.load(f)
                        if "dependencies" in pkg:
                            dependencies["runtime"].extend(list(pkg["dependencies"].keys())[:20])
                        if "devDependencies" in pkg:
                            dependencies["dev"].extend(list(pkg["devDependencies"].keys())[:20])
                except:
                    pass
            elif file == "requirements.txt":
                try:
                    with open(file_path, 'r') as f:
                        deps = [line.strip().split('==')[0].split('>=')[0].split('<=')[0] 
                               for line in f if line.strip() and not line.startswith('#')]
                        dependencies["runtime"].extend(deps[:20])
                except:
                    pass
            elif file == "Cargo.toml":
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                        # Simple regex to extract dependencies
                        deps = re.findall(r'\[dependencies\]\s*\n((?:\w+\s*=.*\n?)+)', content)
                        if deps:
                            dep_names = re.findall(r'(\w+)\s*=', deps[0])
                            dependencies["runtime"].extend(dep_names[:20])
                except:
                    pass
    
    # Convert sets to lists for JSON serialization
    structure["languages"] = sorted(list(structure["languages"]))
    structure["directories"] = sorted(structure["directories"])
    
    # Architecture detection
    if any("src/" in d or "lib/" in d for d in structure["directories"]):
        patterns["architecture"] = "layered"
    elif any("components/" in d or "modules/" in d for d in structure["directories"]):
        patterns["architecture"] = "modular"
    elif "app/" in structure["directories"] and "api/" in structure["directories"]:
        patterns["architecture"] = "MVC"
    else:
        patterns["architecture"] = "flat"
    
    return {
        "structure": structure,
        "patterns": patterns,
        "dependencies": dependencies
    }


async def generate_report(repo_url: str, branch: str) -> dict:
    """
    Generate repository report by cloning and analyzing the repository
    """
    temp_dir = None
    try:
        logger.info(f"Generating report for {repo_url} (branch: {branch})")
        
        # Create temporary directory for cloning
        temp_dir = tempfile.mkdtemp(prefix="gitingest_")
        repo_path = Path(temp_dir) / "repo"
        
        # Clone repository
        clone_url = repo_url
        if GH_TOKEN:
            # Use token for authentication if available
            if "github.com" in repo_url:
                clone_url = repo_url.replace("https://", f"https://{GH_TOKEN}@")
        
        logger.info(f"Cloning repository to {repo_path}")
        repo = Repo.clone_from(clone_url, str(repo_path), branch=branch, depth=1)
        
        # Analyze repository
        logger.info("Analyzing repository structure")
        analysis = await analyze_repository(repo_path)
        
        # Generate summary
        summary_parts = [
            f"Repository: {repo_url}",
            f"Branch: {branch}",
            f"Total files: {analysis['structure']['fileCount']}",
            f"Languages: {', '.join(analysis['structure']['languages'][:5])}" if analysis['structure']['languages'] else "Languages: Unknown",
        ]
        if analysis['patterns']['framework'] != "unknown":
            summary_parts.append(f"Framework: {analysis['patterns']['framework']}")
        if analysis['dependencies']['packageManager'] != "unknown":
            summary_parts.append(f"Package Manager: {analysis['dependencies']['packageManager']}")
        
        summary = "\n".join(summary_parts)
        
        # Generate LLM context
        llm_context_parts = [
            f"# Repository Analysis: {repo_url}",
            f"\n## Summary\n{summary}",
            f"\n## Structure\n",
            f"- Total files: {analysis['structure']['fileCount']}",
            f"- Languages: {', '.join(analysis['structure']['languages'])}",
        ]
        
        if analysis['structure']['entryPoints']:
            llm_context_parts.append(f"\n## Entry Points\n")
            for entry in analysis['structure']['entryPoints'][:10]:
                llm_context_parts.append(f"- {entry}")
        
        if analysis['structure']['directories']:
            llm_context_parts.append(f"\n## Directory Structure\n")
            for dir_path in analysis['structure']['directories'][:20]:
                llm_context_parts.append(f"- {dir_path}/")
        
        if analysis['patterns']['framework'] != "unknown":
            llm_context_parts.append(f"\n## Framework & Architecture\n")
            llm_context_parts.append(f"- Framework: {analysis['patterns']['framework']}")
            llm_context_parts.append(f"- Architecture: {analysis['patterns']['architecture']}")
        
        if analysis['dependencies']['runtime']:
            llm_context_parts.append(f"\n## Dependencies\n")
            llm_context_parts.append(f"Runtime: {', '.join(analysis['dependencies']['runtime'][:15])}")
        
        llm_context = "\n".join(llm_context_parts)
        
        report = {
            "summary": summary,
            "structure": {
                "directories": analysis["structure"]["directories"],
                "fileCount": analysis["structure"]["fileCount"],
                "languages": analysis["structure"]["languages"],
                "entryPoints": analysis["structure"]["entryPoints"]
            },
            "patterns": {
                "framework": analysis["patterns"]["framework"],
                "architecture": analysis["patterns"]["architecture"],
                "testing": analysis["patterns"]["testing"],
                "buildTools": analysis["patterns"]["buildTools"]
            },
            "dependencies": {
                "runtime": analysis["dependencies"]["runtime"][:20],
                "dev": analysis["dependencies"]["dev"][:20],
                "packageManager": analysis["dependencies"]["packageManager"]
            },
            "llmContext": llm_context,
            "generatedAt": int(datetime.now().timestamp() * 1000)
        }
        
        logger.info(f"Report generated successfully: {analysis['structure']['fileCount']} files, {len(analysis['structure']['languages'])} languages")
        
        return report
        
    except GitCommandError as e:
        logger.error(f"Git error: {e}")
        raise Exception(f"Failed to clone repository: {str(e)}")
    except Exception as e:
        logger.error(f"Error generating report: {e}", exc_info=True)
        raise
    finally:
        # Clean up temporary directory
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                logger.info(f"Cleaned up temporary directory: {temp_dir}")
            except Exception as e:
                logger.warning(f"Failed to clean up temporary directory: {e}")


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
            # Follow redirects (e.g., 308 Permanent Redirect)
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
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


