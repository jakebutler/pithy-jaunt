# Repository Connection System Design

## Context

Pithy Jaunt requires users to connect GitHub repositories to enable code analysis and task generation. This is the entry point for the entire workflow. The system must validate repositories, integrate with CodeRabbit for analysis, and provide a smooth user experience for connecting and viewing repository data.

**Constraints:**
- MVP scope: Public repositories only
- Must work with GitHub (primary platform)
- CodeRabbit integration required for analysis
- Real-time updates via webhooks preferred
- WCAG AA accessibility required

**Stakeholders:**
- End users (connecting their repos)
- CodeRabbit service (analysis provider)
- GitHub API (repository data)

## Goals / Non-Goals

**Goals:**
- Enable users to connect public GitHub repositories
- Validate repository accessibility and ownership
- Integrate with CodeRabbit for automated code analysis
- Display analysis results and suggested tasks
- Provide clear feedback on connection status
- Support multiple repositories per user
- Handle errors gracefully with user-friendly messages

**Non-Goals:**
- Private repository support (post-MVP)
- GitLab/Bitbucket support (post-MVP)
- Direct repository cloning/storage (use GitHub API)
- Real-time analysis progress (polling is acceptable for MVP)
- Repository file browsing (post-MVP)
- Branch management UI (post-MVP)

## Decisions

### Decision 1: GitHub API Over Direct Git Operations

**What:** Use GitHub REST API to fetch repository metadata and validate access, rather than cloning repositories locally.

**Why:**
- Simpler implementation (no git binary required)
- Faster validation (API calls vs. clone operations)
- No storage requirements for repository data
- GitHub API provides all needed metadata
- CodeRabbit handles actual repository analysis
- Reduces infrastructure complexity

**Alternatives considered:**
- Direct git clone: Requires git binary, storage, more complex
- GitHub GraphQL API: More powerful but REST is sufficient for MVP

### Decision 2: Async CodeRabbit Analysis

**What:** Trigger CodeRabbit analysis asynchronously and use webhooks for results, rather than synchronous polling.

**Why:**
- CodeRabbit analysis can take time (minutes)
- Better user experience (don't block connection)
- Webhooks provide real-time updates
- Scalable for multiple concurrent analyses
- Standard pattern for external service integration

**Implementation:**
- Connection endpoint returns immediately with "analyzing" status
- Webhook endpoint receives analysis results
- UI polls or uses SSE for status updates (future enhancement)

**Trade-offs:**
- Users must wait for analysis to complete
- Requires webhook infrastructure
- More complex state management

### Decision 3: CodeRabbit Config Detection

**What:** Check for existing `.coderabbit.yaml` in repository before triggering analysis.

**Why:**
- CodeRabbit may already be configured
- Avoids duplicate configuration
- Respects user's existing setup
- Better integration with existing workflows

**Implementation:**
- Use GitHub API to check for `.coderabbit.yaml` file
- If missing, CodeRabbit API can create default config
- Store `coderabbitDetected` flag in repo record

### Decision 4: Repository Uniqueness Per User

**What:** Allow users to connect the same repository URL only once, but different users can connect the same repo.

**Why:**
- Prevents duplicate entries in user's repo list
- Each user has their own analysis context
- Simpler UI (no duplicate detection needed)
- Aligns with user-centric data model

**Implementation:**
- Check `userId + repoUrl` uniqueness in Convex
- Return error if user tries to connect duplicate
- Allow different users to connect same repo

### Decision 5: Repository Status States

**What:** Use clear status states: `pending`, `analyzing`, `completed`, `failed`.

**Why:**
- Clear user feedback on connection progress
- Enables proper UI states (loading, success, error)
- Easy to query and filter
- Aligns with Convex schema design

**States:**
- `pending`: Repo connected, analysis not started
- `analyzing`: CodeRabbit analysis in progress
- `completed`: Analysis finished, report available
- `failed`: Analysis failed (invalid repo, API error, etc.)

## Risks / Trade-offs

### Risk: CodeRabbit API Availability/Changes
**Mitigation:**
- Abstract CodeRabbit client behind interface
- Handle API errors gracefully
- Log all API interactions for debugging
- Consider fallback to manual task creation if CodeRabbit fails

### Risk: GitHub API Rate Limits
**Mitigation:**
- Use authenticated requests (higher rate limits)
- Cache repository metadata
- Implement exponential backoff for retries
- Monitor rate limit headers
- Consider GitHub App authentication (post-MVP)

### Risk: Webhook Security
**Mitigation:**
- Verify webhook signatures if CodeRabbit provides them
- Use secret tokens for webhook endpoints
- Validate webhook payload structure
- Log all webhook events for audit

### Risk: Long Analysis Times
**Trade-off:** Users may wait minutes for analysis
- Show clear "analyzing" status
- Provide estimated wait time if available
- Allow users to navigate away and return later
- Consider email notifications when complete (post-MVP)

### Risk: Invalid Repository URLs
**Mitigation:**
- Client-side URL validation
- Server-side GitHub API validation
- Clear error messages for common issues
- Support various GitHub URL formats (https, git@, etc.)

## Migration Plan

**Initial Implementation:**
1. Set up GitHub API client
2. Create repository connection endpoint
3. Implement CodeRabbit integration
4. Create webhook handler
5. Build UI components
6. Test with real repositories

**Rollback:**
- If issues occur, disable repository connection feature
- Users can still use manual task creation
- No data loss (repos are stored in Convex)

**Post-MVP Enhancements:**
1. Support for private repositories (OAuth)
2. Real-time analysis progress (SSE)
3. Repository file browser
4. Branch selection and management
5. Multiple repository analysis in parallel
6. Analysis history and comparisons

## Open Questions

1. **CodeRabbit API Details**: What's the exact API format for triggering analysis?
   - **Decision**: Review CodeRabbit docs (https://docs.coderabbit.ai), create abstraction layer during implementation

2. **Webhook Endpoint Security**: Does CodeRabbit provide webhook signatures?
   - **Decision**: Implement signature verification if available, otherwise use secret tokens. Public URL for webhook endpoint is acceptable for MVP.

3. **Analysis Caching**: How long should we cache analysis results?
   - **Decision**: Store in Convex, allow manual refresh, consider TTL (post-MVP)

4. **Repository Refresh**: Should users be able to re-analyze repos?
   - **Decision**: Deferred to post-MVP. MVP will rely only on webhooks for analysis status updates (no polling).

## File Structure

```
/app
  /api/repo
    /connect/route.ts
    /[repoId]/report/route.ts
    /route.ts (list repos)
  /api/webhook
    /coderabbit/route.ts
  /repos
    /page.tsx (list)
    /[repoId]/page.tsx (detail)

/components/repos
  RepoConnectForm.tsx
  RepoCard.tsx
  RepoList.tsx
  CodeRabbitReport.tsx
  TaskSuggestions.tsx

/lib/github
  client.ts
  validation.ts
  metadata.ts

/lib/coderabbit
  client.ts
  analysis.ts
  webhook.ts

/convex
  repos.ts (queries and mutations)
```

## API Endpoint Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/repo/connect` | POST | Connect a repository | Yes |
| `/api/repo` | GET | List user's repositories | Yes |
| `/api/repo/[repoId]/report` | GET | Get analysis report | Yes |
| `/api/webhook/coderabbit` | POST | Receive analysis results | No (webhook secret) |

## Success Metrics

- Repository connection succeeds for valid public repos
- CodeRabbit analysis completes within 5 minutes (95th percentile)
- Webhook callbacks are processed successfully
- Error rate < 5% for connection attempts
- User can view analysis results within 10 seconds of completion
- WCAG AA compliance verified

