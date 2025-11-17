## 1. GitIngest Service Setup

- [ ] 1.1 Create `apps/gitingest/` directory structure
- [ ] 1.2 Create FastAPI application (`apps/gitingest/main.py`)
- [ ] 1.3 Set up GitIngest library integration
- [ ] 1.4 Create `/ingest` endpoint with authentication
- [ ] 1.5 Implement report generation logic
- [ ] 1.6 Add webhook callback support
- [ ] 1.7 Create `requirements.txt` with dependencies
- [ ] 1.8 Add error handling and logging
- [ ] 1.9 Test locally with `uvicorn`

## 2. Render Deployment

- [ ] 2.1 Create Render account and project
- [ ] 2.2 Configure Render service (Python 3.11, FastAPI)
- [ ] 2.3 Set environment variables in Render
- [ ] 2.4 Configure auto-deploy from GitHub
- [ ] 2.5 Test deployment and endpoint accessibility
- [ ] 2.6 Set up production URL and update Vercel env vars

## 3. Next.js Integration

- [ ] 3.1 Create GitIngest client library (`lib/gitingest/client.ts`)
- [ ] 3.2 Add environment variables to `.env.example`
- [ ] 3.3 Update Convex schema with report fields
- [ ] 3.4 Add Convex mutations/queries for report storage
- [ ] 3.5 Modify `/api/repo/connect` to call GitIngest service
- [ ] 3.6 Create webhook endpoint `/api/repo/gitingest-callback`
- [ ] 3.7 Add error handling and timeout logic
- [ ] 3.8 Test integration end-to-end

## 4. UI Updates

- [ ] 4.1 Update repository detail page to display GitIngest report
- [ ] 4.2 Add loading state for report generation
- [ ] 4.3 Add error state and retry mechanism
- [ ] 4.4 Format report display (summary, structure, patterns)
- [ ] 4.5 Add "Regenerate Report" button
- [ ] 4.6 Test UI with various report states

## 5. Testing

- [ ] 5.1 Write unit tests for GitIngest client
- [ ] 5.2 Write integration tests for service endpoint
- [ ] 5.3 Test with various repository sizes
- [ ] 5.4 Test error scenarios (timeout, service down, invalid repo)
- [ ] 5.5 Test webhook callback handling
- [ ] 5.6 E2E test: connect repo → generate report → display report

## 6. Documentation

- [ ] 6.1 Document GitIngest service API contract
- [ ] 6.2 Document local development setup
- [ ] 6.3 Document Render deployment process
- [ ] 6.4 Update README with GitIngest service info
- [ ] 6.5 Document environment variables

## 7. Production Readiness

- [ ] 7.1 Set up monitoring/alerting for GitIngest service
- [ ] 7.2 Configure production environment variables
- [ ] 7.3 Test production deployment
- [ ] 7.4 Verify service-to-service communication
- [ ] 7.5 Load test with multiple concurrent requests
- [ ] 7.6 Set up error tracking and logging

