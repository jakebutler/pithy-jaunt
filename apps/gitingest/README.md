# GitIngest Service

Python microservice for generating LLM-friendly repository reports using the GitIngest library.

## Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export INGEST_API_KEY=local-dev-key
export GH_TOKEN=your_github_token  # Optional
export LOG_LEVEL=info
export PORT=8001
```

3. Run the service:
```bash
uvicorn main:app --reload --port 8001
```

Or:
```bash
python main.py
```

## API Endpoints

### POST /ingest

Generate a repository report.

**Headers:**
```
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

**Request:**
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "branch": "main",
  "callbackUrl": "https://your-app.com/api/repo/gitingest-callback"
}
```

**Response (202):**
```json
{
  "status": "processing",
  "jobId": "uuid-here",
  "estimatedTime": 30
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "gitingest",
  "version": "1.0.0"
}
```

### GET /job/{job_id}

Get job status (for debugging).

**Headers:**
```
Authorization: Bearer <API_KEY>
```

## Deployment on Render

1. Connect GitHub repository to Render
2. Select `apps/gitingest` as the root directory
3. Set environment variables:
   - `INGEST_API_KEY`: Shared secret with Next.js app
   - `GH_TOKEN`: GitHub token (optional)
   - `LOG_LEVEL`: info
   - `ENV`: production
   - `MAX_TIMEOUT`: 300 (seconds)
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Render will auto-detect Python and install from `requirements.txt`

## TODO

- [ ] Integrate actual GitIngest Python library
- [ ] Add proper error handling for repository access
- [ ] Implement report caching
- [ ] Add rate limiting
- [ ] Use Redis/database for job storage (instead of in-memory)
- [ ] Add webhook signature verification


