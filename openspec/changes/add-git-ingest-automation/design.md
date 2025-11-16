# Git Ingest Automation Design

## Context

When a repository is connected, we need to generate a codebase digest using GitIngest.com. This digest will be used as context for coding agents to help them understand the codebase structure and make better decisions when implementing features.

**Constraints:**
- GitIngest.com is a web service (no direct API)
- Must work with public GitHub repositories
- Should not block repository connection (async processing)
- Browser automation required (browser-use)
- Output file needs to be stored in database

**Stakeholders:**
- End users (connecting repos)
- Coding agents (consuming git ingest context)

## Goals / Non-Goals

**Goals:**
- Automatically generate git ingest digest when repo is connected
- Store digest content in repository record for later use
- Use browser-use to automate GitIngest.com interaction
- Handle errors gracefully without blocking repo connection
- Support future features that use git ingest context

**Non-Goals:**
- Manual git ingest triggering (automatic only)
- Git ingest refresh/re-generation (post-MVP)
- Support for private repositories via GitIngest (MVP: public repos only)
- Direct GitIngest API integration (web interface only)

## Decisions

### Decision 1: Browser-Use for Web Automation

**What:** Use browser-use Python library to automate GitIngest.com web interface.

**Why:**
- GitIngest.com doesn't provide a direct API
- Browser-use is designed for LLM-driven browser automation
- Can handle form filling, navigation, and file downloads
- Integrates well with our existing Python-based agent infrastructure
- Supports headless browser automation

**Alternatives considered:**
- Direct API integration: Not available from GitIngest.com
- Manual process: Not scalable
- Playwright/Puppeteer directly: More complex, browser-use provides LLM-driven automation

**Implementation:**
- Create Python script using browser-use
- Navigate to GitIngest.com
- Enter repository URL
- Wait for processing
- Download the generated digest file
- Return content to Next.js API

### Decision 2: Async Processing

**What:** Process git ingest asynchronously after repository connection, don't block the connection flow.

**Why:**
- Git ingest can take time (30-60 seconds)
- Don't want to slow down repository connection
- User can use repo even if git ingest is still processing
- Better user experience

**Implementation:**
- Repository connection completes immediately
- Git ingest status tracked separately (optional field)
- Background job/API route triggers git ingest
- Update repo record when complete

### Decision 3: Store Content in Database

**What:** Store the full git ingest text content in the Convex database.

**Why:**
- Fast access for agents (no external API calls)
- Available even if GitIngest.com is down
- Can be used in future features
- Convex supports large text fields

**Storage:**
- Add `gitIngestContent` field to repos table (optional string)
- Add `gitIngestStatus` field to track processing state
- Add `gitIngestGeneratedAt` timestamp

**Alternatives considered:**
- Store file in S3/storage: More complex, requires additional service
- Store URL only: Not reliable, external dependency
- Don't store, fetch on demand: Slower, external dependency

### Decision 4: Python Service for Browser Automation

**What:** Create a Python script/service that handles browser automation, callable from Next.js API.

**Why:**
- Browser-use is Python-based
- Can be called as subprocess or HTTP service
- Reuses existing Python infrastructure (agent-runner.py pattern)
- Can run in same environment or separate service

**Implementation:**
- Create `/lib/gitingest/automation.py` script
- Accept repository URL as input
- Return git ingest content as output
- Handle errors and timeouts
- Can be called via subprocess from Next.js or as HTTP service

**Alternatives considered:**
- Node.js browser automation: More complex, browser-use is Python-native
- Separate microservice: Overkill for MVP
- Direct integration in Next.js: Browser automation better in Python

## Risks / Trade-offs

### Risk: GitIngest.com Changes or Downtime
**Mitigation:**
- Store content in database (cached)
- Handle errors gracefully
- Don't block repo connection if git ingest fails
- Log errors for monitoring
- Consider fallback or manual process (post-MVP)

### Risk: Browser Automation Reliability
**Mitigation:**
- Use browser-use with retry logic
- Set reasonable timeouts
- Handle common failure modes (CAPTCHA, rate limits)
- Log detailed errors for debugging
- Consider Browser Use Cloud for production (stealth browsers)

### Risk: Large Repository Processing Time
**Trade-off:** Large repos may take longer to process
- Set timeout limits (e.g., 5 minutes)
- Show processing status to user
- Allow repo to be used even if git ingest is pending
- Consider size limits (post-MVP)

### Risk: Storage Costs for Large Digests
**Mitigation:**
- Monitor digest sizes
- Consider compression if needed (post-MVP)
- Set reasonable size limits
- Most repos should generate manageable digests

## Migration Plan

**Initial Implementation:**
1. Install browser-use Python package
2. Create git ingest automation script
3. Add fields to Convex schema
4. Create API route to trigger git ingest
5. Integrate with repo connection flow
6. Test with various repository sizes

**Rollback:**
- Git ingest is optional, doesn't break repo connection
- Can disable feature via feature flag
- Existing repos continue to work

**Post-MVP Enhancements:**
1. Git ingest refresh/re-generation
2. Support for private repos (if GitIngest adds support)
3. Direct API integration (if GitIngest adds API)
4. Compression for large digests
5. Git ingest versioning/history

## Open Questions

1. **Browser-Use API Key**: Do we need Browser Use Cloud API key for production?
   - **Decision**: Use Browser Use Cloud for production reliability, local browser for development

2. **Git Ingest Timeout**: What's a reasonable timeout?
   - **Decision**: 5 minutes for processing, 30 seconds for page load

3. **Error Handling**: Should we retry failed git ingest?
   - **Decision**: Retry once on transient errors, log failures for manual review

4. **Storage Limits**: Should we limit digest size?
   - **Decision**: Monitor in MVP, add limits if needed post-MVP

## File Structure

```
/lib/gitingest/
  automation.py          # Browser-use automation script
  client.ts              # TypeScript client to call automation
  types.ts               # Type definitions

/convex/
  repos.ts               # Add updateGitIngest mutation
  schema.ts              # Add gitIngestContent, gitIngestStatus, gitIngestGeneratedAt fields

/app/api/repo/
  connect/route.ts       # Trigger git ingest after repo creation
  [repoId]/ingest/route.ts  # Manual trigger endpoint (optional)
```

## API Endpoint Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/repo/[repoId]/ingest` | POST | Manually trigger git ingest | Yes |

## Success Metrics

- Git ingest completes for 95% of repository connections
- Average processing time < 2 minutes
- Error rate < 5%
- Digest successfully stored in database
- No impact on repository connection time
