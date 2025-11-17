# Change: Add GitIngest Service for LLM-Friendly Repository Reports

## Why

When users connect a repository to Pithy Jaunt, we need to generate comprehensive, LLM-friendly reports about the repository structure, codebase patterns, and technical context. This information is critical for:

1. **Agent Context**: LLM agents executing tasks need deep understanding of the codebase structure, patterns, and conventions
2. **Task Quality**: Better context leads to more accurate code generation and fewer errors
3. **User Experience**: Users benefit from having a clear understanding of their repository's structure and characteristics

The GitIngest Python library provides excellent capabilities for generating these reports, but our current deployment platform (Vercel) doesn't support Python. We need a separate microservice deployed on Render that can:

- Use GitIngest's Python library to analyze repositories
- Generate structured, LLM-friendly reports
- Integrate seamlessly with our existing Next.js application
- Maintain operational simplicity (no Docker, no complex infrastructure)

## What Changes

- **New Python microservice** (`apps/gitingest/`) deployed on Render
  - FastAPI-based HTTP service
  - Uses GitIngest Python library for repository analysis
  - Generates LLM-friendly reports in structured format
  - Secure API key authentication between services

- **Integration with repository connection flow**
  - Modify `/api/repo/connect` to call GitIngest service after repo connection
  - Store GitIngest report in Convex database
  - Display report in repository detail view

- **New API endpoint** in Next.js app
  - `/api/repo/[repoId]/gitingest-report` - Fetch or trigger GitIngest report generation

- **Database schema updates**
  - Add `gitingestReport` field to repository records
  - Add `gitingestReportStatus` field (pending, processing, completed, failed)
  - Add `gitingestReportGeneratedAt` timestamp

- **Environment configuration**
  - `GIT_INGEST_BASE_URL` - Render service URL
  - `GIT_INGEST_API_KEY` - Shared secret for service authentication

- **Repository structure**
  - New `apps/gitingest/` directory with Python service
  - FastAPI application with `/ingest` endpoint
  - Requirements.txt with GitIngest and dependencies

## Impact

- **Affected specs**: 
  - `repo-connection` (modified - add GitIngest integration)
  - `gitingest-service` (new capability)

- **Affected code**:
  - `/app/api/repo/connect/route.ts` - Add GitIngest service call
  - `/app/api/repo/[repoId]/gitingest-report/route.ts` - New endpoint
  - `/app/repos/[repoId]/page.tsx` - Display GitIngest report
  - `/convex/repos.ts` - Add report fields to schema and mutations
  - `/convex/schema.ts` - Update repository schema
  - `/lib/gitingest/` - New client library for GitIngest service
  - `/apps/gitingest/` - New Python microservice (entire directory)

- **Deployment changes**:
  - New Render service configuration
  - Environment variables in Vercel and Render
  - Local development setup for Python service

- **Breaking changes**: None (additive feature)

