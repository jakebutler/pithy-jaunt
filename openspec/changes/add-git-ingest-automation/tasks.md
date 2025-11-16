# Implementation Tasks

## 1. Browser-Use Setup
- [ ] 1.1 Install browser-use Python package (add to requirements.txt or create new one)
- [ ] 1.2 Set up Browser Use Cloud API key in environment variables
- [ ] 1.3 Create Python virtual environment setup documentation
- [ ] 1.4 Test browser-use installation and basic automation

## 2. Git Ingest Automation Script
- [ ] 2.1 Create `/lib/gitingest/automation.py` script
  - [ ] 2.1.1 Set up browser-use agent with Browser Use Cloud
  - [ ] 2.1.2 Navigate to GitIngest.com
  - [ ] 2.1.3 Enter repository URL in the input field
  - [ ] 2.1.4 Wait for processing to complete
  - [ ] 2.1.5 Download the generated digest file
  - [ ] 2.1.6 Return file content as string
  - [ ] 2.1.7 Handle errors (timeouts, network issues, etc.)
  - [ ] 2.1.8 Add retry logic for transient failures
- [ ] 2.2 Create `/lib/gitingest/types.ts` for TypeScript types
- [ ] 2.3 Create `/lib/gitingest/client.ts` to call Python script from Next.js
  - [ ] 2.3.1 Execute Python script as subprocess
  - [ ] 2.3.2 Handle subprocess errors
  - [ ] 2.3.3 Parse and return git ingest content
  - [ ] 2.3.4 Add timeout handling

## 3. Convex Schema Updates
- [ ] 3.1 Update `convex/schema.ts` to add fields to repos table:
  - [ ] 3.1.1 `gitIngestContent: v.optional(v.string())` - The digest content
  - [ ] 3.1.2 `gitIngestStatus: v.optional(v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")))` - Processing status
  - [ ] 3.1.3 `gitIngestGeneratedAt: v.optional(v.number())` - Timestamp when generated
- [ ] 3.2 Run Convex schema push to update database

## 4. Convex Functions
- [ ] 4.1 Create `updateGitIngest` mutation in `convex/repos.ts`
  - [ ] 4.1.1 Accept repoId, content, status, and timestamp
  - [ ] 4.1.2 Update repository record with git ingest data
  - [ ] 4.1.3 Validate repository exists
- [ ] 4.2 Create `getGitIngest` query in `convex/repos.ts`
  - [ ] 4.2.1 Return git ingest content and status for a repository
  - [ ] 4.2.2 Verify user owns the repository

## 5. API Routes
- [ ] 5.1 Update `POST /api/repo/connect` endpoint
  - [ ] 5.1.1 After repo creation, trigger git ingest asynchronously
  - [ ] 5.1.2 Don't block connection response
  - [ ] 5.1.3 Handle git ingest errors gracefully
  - [ ] 5.1.4 Update repo status to "processing" when started
- [ ] 5.2 Create `POST /api/repo/[repoId]/ingest` endpoint (optional, for manual trigger)
  - [ ] 5.2.1 Verify user owns the repository
  - [ ] 5.2.2 Trigger git ingest process
  - [ ] 5.2.3 Return processing status
- [ ] 5.3 Create background job handler for git ingest
  - [ ] 5.3.1 Process git ingest asynchronously
  - [ ] 5.3.2 Update repo record when complete
  - [ ] 5.3.3 Handle failures and update status

## 6. Error Handling & Validation
- [ ] 6.1 Handle GitIngest.com timeouts (5 minute limit)
- [ ] 6.2 Handle browser automation failures
- [ ] 6.3 Handle network errors
- [ ] 6.4 Handle invalid repository URLs
- [ ] 6.5 Log errors to console/Galileo for observability
- [ ] 6.6 Add retry logic for transient failures (max 1 retry)
- [ ] 6.7 Set reasonable timeout limits

## 7. Testing & Polish
- [ ] 7.1 Test git ingest with small repositories
- [ ] 7.2 Test git ingest with medium repositories
- [ ] 7.3 Test git ingest with large repositories (if time permits)
- [ ] 7.4 Test error handling (invalid URLs, timeouts, network failures)
- [ ] 7.5 Test async processing (repo connection doesn't block)
- [ ] 7.6 Verify git ingest content is stored correctly
- [ ] 7.7 Test manual trigger endpoint (if implemented)
- [ ] 7.8 Verify git ingest status updates correctly
- [ ] 7.9 Test with Browser Use Cloud API key
- [ ] 7.10 Test with local browser (development mode)

## 8. Documentation
- [ ] 8.1 Document browser-use setup in README or docs
- [ ] 8.2 Document environment variables needed
- [ ] 8.3 Document git ingest automation flow
- [ ] 8.4 Add troubleshooting guide for common issues
