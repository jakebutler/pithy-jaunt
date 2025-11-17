# GitIngest Service Setup

This document describes the GitIngest service integration for generating LLM-friendly repository reports.

## Overview

The GitIngest service is a Python microservice deployed on Render that generates comprehensive, structured reports about repositories using the GitIngest library. These reports provide LLM agents with deep context about repository structure, patterns, and dependencies.

## Architecture

```
Next.js App (Vercel)
    ↓
POST /api/repo/connect
    ↓
GitIngest Client (lib/gitingest/client.ts)
    ↓
GitIngest Service (Render) - POST /ingest
    ↓
Webhook Callback - POST /api/repo/gitingest-callback
    ↓
Convex Database (stores report)
```

## Local Development

### Python Service

1. Navigate to the service directory:
```bash
cd apps/gitingest
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set environment variables:
```bash
export INGEST_API_KEY=local-dev-key
export GH_TOKEN=your_github_token  # Optional
export LOG_LEVEL=info
export PORT=8001
```

4. Run the service:
```bash
uvicorn main:app --reload --port 8001
```

### Next.js App

1. Set environment variables in `.env.local`:
```bash
GIT_INGEST_BASE_URL=http://localhost:8001
GIT_INGEST_API_KEY=local-dev-key
```

2. Run the Next.js app:
```bash
npm run dev
```

## Deployment

### Render (Python Service)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set root directory to `apps/gitingest`
4. Configure:
   - **Environment**: Python 3.11
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Build Command**: `pip install -r requirements.txt`
5. Set environment variables:
   - `INGEST_API_KEY`: Shared secret (must match Vercel)
   - `GH_TOKEN`: GitHub token (optional)
   - `LOG_LEVEL`: info
   - `ENV`: production
   - `MAX_TIMEOUT`: 300 (seconds)

### Vercel (Next.js App)

1. Add environment variables:
   - `GIT_INGEST_BASE_URL`: Your Render service URL (e.g., `https://gitingest.onrender.com`)
   - `GIT_INGEST_API_KEY`: Shared secret (must match Render)

## API Endpoints

### GitIngest Service

#### POST /ingest

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

#### GET /health

Health check endpoint.

### Next.js App

#### POST /api/repo/gitingest-callback

Webhook endpoint for GitIngest service to deliver report results.

**Request:**
```json
{
  "jobId": "uuid-here",
  "repoUrl": "https://github.com/owner/repo",
  "branch": "main",
  "status": "completed",
  "report": { ... }
}
```

#### GET /api/repo/[repoId]/gitingest-report

Fetch GitIngest report for a repository.

#### POST /api/repo/[repoId]/gitingest-report

Manually trigger GitIngest report generation.

## Report Structure

```typescript
interface GitIngestReport {
  summary: string;
  structure: {
    directories: string[];
    fileCount: number;
    languages: string[];
    entryPoints: string[];
  };
  patterns: {
    framework: string;
    architecture: string;
    testing: string[];
    buildTools: string[];
  };
  dependencies: {
    runtime: string[];
    dev: string[];
    packageManager: string;
  };
  llmContext: string;
  generatedAt: number;
}
```

## Database Schema

The `repos` table includes the following GitIngest-related fields:

- `gitingestReportStatus`: "pending" | "processing" | "completed" | "failed"
- `gitingestReport`: Report object (JSON)
- `gitingestReportGeneratedAt`: Timestamp
- `gitingestReportError`: Error message (if failed)

## Integration Flow

1. User connects a repository via `/api/repo/connect`
2. Repository record is created with `gitingestReportStatus: "pending"`
3. GitIngest service is called asynchronously
4. Status is updated to "processing"
5. GitIngest service generates report
6. Webhook callback delivers report to `/api/repo/gitingest-callback`
7. Repository record is updated with report and status "completed"
8. UI displays report on repository detail page

## Error Handling

- If GitIngest service is unavailable during repo connection, connection still succeeds
- Status is set to "pending" and can be retried manually
- Failed reports include error messages for debugging
- Webhook callbacks are retried up to 3 times with exponential backoff

## TODO

- [ ] Integrate actual GitIngest Python library (currently placeholder)
- [ ] Add report caching (don't regenerate if repo unchanged)
- [ ] Implement webhook signature verification
- [ ] Add rate limiting
- [ ] Use Redis/database for job storage (instead of in-memory)
- [ ] Add monitoring and alerting

## Troubleshooting

### Service Not Responding

- Check Render service logs
- Verify `GIT_INGEST_BASE_URL` is correct
- Verify `GIT_INGEST_API_KEY` matches between services

### Reports Not Generating

- Check webhook callback endpoint is accessible
- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check Convex database for error messages

### Authentication Errors

- Verify API keys match between Vercel and Render
- Check Authorization header format: `Bearer <key>`

