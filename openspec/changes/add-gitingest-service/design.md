# Design: GitIngest Service Integration

## Context

Pithy Jaunt needs to generate comprehensive, LLM-friendly reports about user repositories when they connect them. The GitIngest Python library provides excellent capabilities for this, but Vercel (our current deployment platform) doesn't support Python. We need a separate microservice that can:

1. Run Python code (GitIngest library)
2. Generate structured reports about repositories
3. Integrate cleanly with our Next.js application
4. Maintain operational simplicity

## Goals / Non-Goals

### Goals
- Deploy Python microservice on Render (Python support, simple deployment)
- Generate LLM-friendly repository reports using GitIngest library
- Integrate seamlessly with existing repo connection flow
- Maintain simple, secure service-to-service communication
- Support local development workflow
- Store reports in Convex database for agent access

### Non-Goals
- Docker containerization (Render supports native Python)
- Complex service mesh or orchestration
- Real-time streaming of report generation (async is fine)
- Multiple report formats (single structured format)
- Report versioning or history (single latest report per repo)

## Decisions

### Decision: Render for Python Service Deployment

**Rationale:**
- Render natively supports Python 3.11
- Simple deployment: connect GitHub repo, set environment variables, deploy
- No Docker required (simpler than GCP Cloud Run or AWS Lambda)
- Free tier available for development
- Auto-deploy from GitHub on push
- Built-in HTTPS and load balancing

**Alternatives considered:**
- **GCP Cloud Run**: Requires Docker, more complex setup, overkill for MVP
- **AWS Lambda**: Cold starts, 15-minute timeout limits, complex packaging
- **Railway**: Similar to Render, but Render has better free tier
- **Fly.io**: More complex networking, requires Docker

### Decision: FastAPI for Python Service

**Rationale:**
- Modern, fast Python web framework
- Built-in async support (good for I/O-bound operations like GitIngest)
- Automatic OpenAPI documentation
- Type hints and validation built-in
- Simple authentication middleware

**Alternatives considered:**
- **Flask**: Synchronous by default, less modern
- **Django**: Overkill for a single endpoint microservice
- **Tornado**: Lower-level, more boilerplate

### Decision: Single Shared API Key for Service Authentication

**Rationale:**
- Simple to implement and manage
- Sufficient for MVP (internal service-to-service communication)
- Single environment variable to sync between Vercel and Render
- Bearer token pattern is standard and well-understood

**Alternatives considered:**
- **OAuth2**: Overkill for internal service communication
- **mTLS**: Complex certificate management, not needed for MVP
- **JWT**: More complex, no clear benefit over simple API key

### Decision: Same Repository Structure (Monorepo)

**Rationale:**
- Keep `apps/gitingest/` in same repo as main app
- Easier to maintain shared types/constants if needed
- Unified PR workflow
- Both Vercel and Render can deploy from same repo (selective folder deployment)

**Alternatives considered:**
- **Separate repository**: More overhead, harder to keep in sync
- **Submodule**: Complex git workflow, not worth it

### Decision: Async Report Generation

**Rationale:**
- GitIngest analysis can take time (especially for large repos)
- Don't block repository connection response
- Update status via webhook or polling (webhook preferred)
- Better user experience (immediate feedback, status updates)

**Alternatives considered:**
- **Synchronous**: Would timeout on large repos, poor UX
- **Polling**: More complex, less efficient than webhook

### Decision: Store Report in Convex Database

**Rationale:**
- Reports are structured data (JSON)
- Need to query by repository
- Agents need fast access to reports
- Convex is already our database, no need for separate storage

**Alternatives considered:**
- **S3/Blob storage**: More complex, adds another service
- **File system**: Not suitable for serverless/stateless services
- **Separate database**: Unnecessary complexity

## Architecture

```
┌─────────────────┐
│   Next.js App   │
│    (Vercel)     │
└────────┬────────┘
         │
         │ POST /api/repo/connect
         │ (includes repoUrl, branch)
         │
         ▼
┌─────────────────┐
│  /api/repo/     │
│  connect        │
│  (Next.js API)  │
└────────┬────────┘
         │
         │ 1. Validate repo
         │ 2. Create repo record
         │ 3. Call GitIngest service
         │
         ▼
┌─────────────────┐      HTTP POST      ┌──────────────────┐
│  GitIngest      │ ──────────────────> │  GitIngest       │
│  Client         │  Authorization:     │  Service         │
│  (lib/gitingest)│  Bearer <API_KEY>   │  (Render)        │
└─────────────────┘                     └────────┬─────────┘
                                                 │
                                                 │ Uses GitIngest
                                                 │ Python library
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  Generate Report │
                                        │  (structured JSON)│
                                        └────────┬─────────┘
                                                 │
                                                 │ Webhook callback
                                                 │ (or store directly)
                                                 ▼
                                        ┌──────────────────┐
                                        │  Convex Database │
                                        │  (repo record)   │
                                        └──────────────────┘
```

## API Contract

### GitIngest Service Endpoint

**POST** `/ingest`

**Headers:**
```
Authorization: Bearer <GIT_INGEST_API_KEY>
Content-Type: application/json
```

**Request Body:**
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "branch": "main",
  "callbackUrl": "https://pithy-jaunt.vercel.app/api/repo/gitingest-callback"
}
```

**Response (202 Accepted):**
```json
{
  "status": "processing",
  "jobId": "uuid-here",
  "estimatedTime": 30
}
```

**Webhook Callback (to Next.js app):**
```
POST <callbackUrl>
{
  "jobId": "uuid-here",
  "repoUrl": "https://github.com/owner/repo",
  "status": "completed",
  "report": {
    "summary": "...",
    "structure": {...},
    "patterns": [...],
    "dependencies": [...],
    "llmContext": "..."
  }
}
```

## Data Model

### Repository Schema Updates

```typescript
// convex/schema.ts
repos: {
  // ... existing fields ...
  gitingestReportStatus: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  ),
  gitingestReport: v.optional(v.any()), // Structured JSON report
  gitingestReportGeneratedAt: v.optional(v.number()),
  gitingestReportError: v.optional(v.string()),
}
```

### Report Structure

```typescript
interface GitIngestReport {
  summary: string; // High-level overview
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
  llmContext: string; // Formatted context for LLM agents
  generatedAt: number;
}
```

## Risks / Trade-offs

### Risk: Service Availability
- **Risk**: Render service goes down, blocking repo connections
- **Mitigation**: 
  - Make GitIngest call non-blocking (don't fail repo connection if service unavailable)
  - Set reasonable timeout (30 seconds)
  - Graceful degradation: repo connects successfully, report generation can be retried

### Risk: Report Generation Timeouts
- **Risk**: Large repositories take too long to analyze
- **Mitigation**:
  - Set timeout on GitIngest service (5 minutes max)
  - Use async processing with webhook callbacks
  - Show "processing" status to user, allow manual refresh

### Risk: API Key Security
- **Risk**: API key exposed or compromised
- **Mitigation**:
  - Store in environment variables (never in code)
  - Use different keys for production/preview/development
  - Rotate keys periodically
  - Monitor for unauthorized access

### Risk: Cost Scaling
- **Risk**: Render costs increase with usage
- **Mitigation**:
  - Monitor usage and costs
  - Set up billing alerts
  - Consider caching reports (don't regenerate if repo unchanged)
  - Free tier should cover MVP usage

### Trade-off: Simplicity vs. Features
- **Trade-off**: Simple API key auth vs. more secure OAuth2
- **Decision**: API key is sufficient for MVP (internal services)
- **Future**: Can upgrade to OAuth2 if needed

## Migration Plan

### Phase 1: Service Setup
1. Create `apps/gitingest/` directory structure
2. Set up FastAPI application with `/ingest` endpoint
3. Deploy to Render (staging URL first)
4. Test locally with `uvicorn`

### Phase 2: Integration
1. Create GitIngest client library (`lib/gitingest/client.ts`)
2. Update Convex schema with report fields
3. Modify `/api/repo/connect` to call GitIngest service
4. Add webhook endpoint for report callbacks

### Phase 3: UI Updates
1. Update repository detail page to show GitIngest report
2. Add loading states for report generation
3. Add error handling and retry mechanism

### Phase 4: Production
1. Deploy GitIngest service to Render production
2. Update Vercel environment variables
3. Monitor and iterate

### Rollback Plan
- If GitIngest service fails, repo connections still work (non-blocking)
- Can disable GitIngest calls via feature flag
- Reports are optional enhancement, not critical path

## Open Questions

1. **Report Caching**: Should we cache reports and only regenerate if repo changes? (Answer: Yes, but not in MVP - can add later)
2. **Report Size Limits**: What's the maximum report size we'll accept? (Answer: 1MB should be sufficient, add validation)
3. **Multiple Branches**: Should we generate reports per branch or just default branch? (Answer: Default branch for MVP, can expand later)
4. **Report Format**: Should we standardize on a specific schema or use GitIngest's native format? (Answer: Use GitIngest format, but ensure it's LLM-friendly)

