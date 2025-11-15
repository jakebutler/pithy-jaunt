# Implementation Tasks

## 1. GitHub Integration Setup
- [ ] 1.1 Install GitHub Octokit library (@octokit/rest)
- [ ] 1.2 Create GitHub API client utility (`lib/github/client.ts`)
- [ ] 1.3 Implement repository validation function
- [ ] 1.4 Add GitHub token validation
- [ ] 1.5 Create repository metadata fetcher (owner, name, default branch)

## 2. CodeRabbit Integration
- [ ] 2.1 Review CodeRabbit API documentation (https://docs.coderabbit.ai)
- [ ] 2.2 Create CodeRabbit API client (`lib/coderabbit/client.ts`)
- [ ] 2.3 Implement repository analysis request
- [ ] 2.4 Create CodeRabbit config detection logic
- [ ] 2.5 Implement `.coderabbit.yaml` bootstrap creation (if missing)
- [ ] 2.6 Add webhook handler for CodeRabbit callbacks (`/api/webhook/coderabbit`)
  - [ ] 2.6.1 Note: MVP relies only on webhooks (no polling) - add code comment

## 3. Convex Repository Schema & Functions
- [ ] 3.1 Verify `repos` table schema matches requirements
- [ ] 3.2 Create `createRepo` mutation
- [ ] 3.3 Create `getReposByUser` query
- [ ] 3.4 Create `getRepoById` query
- [ ] 3.5 Create `updateRepoAnalysis` mutation
- [ ] 3.6 Add repository status update functions

## 4. API Routes - Repository Connection
- [ ] 4.1 Create `POST /api/repo/connect` endpoint
  - [ ] 4.1.1 Validate request body (repoUrl, optional branch)
  - [ ] 4.1.2 Validate GitHub repository URL format
  - [ ] 4.1.3 Check if repo is public (reject private repos)
  - [ ] 4.1.4 Fetch repository metadata from GitHub
  - [ ] 4.1.5 Check for existing repo connection (prevent duplicates)
  - [ ] 4.1.6 Create repo record in Convex
  - [ ] 4.1.7 Detect CodeRabbit config in repo
  - [ ] 4.1.8 Trigger CodeRabbit analysis (async)
  - [ ] 4.1.9 Return 202 Accepted with repoId and initial status
- [ ] 4.2 Create `GET /api/repo/[repoId]/report` endpoint
  - [ ] 4.2.1 Verify user owns the repository
  - [ ] 4.2.2 Fetch latest analysis from Convex
  - [ ] 4.2.3 Return report data or 404 if not found
- [ ] 4.3 Create `GET /api/repo` endpoint (list user's repos)
  - [ ] 4.3.1 Get authenticated user
  - [ ] 4.3.2 Query Convex for user's repos
  - [ ] 4.3.3 Return list with status and metadata

## 5. API Routes - Webhooks
- [ ] 5.1 Create `POST /api/webhook/coderabbit` endpoint
  - [ ] 5.1.1 Verify webhook signature (if CodeRabbit provides)
  - [ ] 5.1.2 Parse CodeRabbit analysis results
  - [ ] 5.1.3 Update repo record with analysis status
  - [ ] 5.1.4 Create task suggestions from analysis
  - [ ] 5.1.5 Store analysis report in Convex

## 6. UI Components - Repository Connection
- [ ] 6.1 Create `RepoConnectForm` component
  - [ ] 6.1.1 URL input field with validation
  - [ ] 6.1.2 Branch selector (optional, defaults to "main")
  - [ ] 6.1.3 Submit button with loading state
  - [ ] 6.1.4 Error message display
  - [ ] 6.1.5 Success message with next steps
  - [ ] 6.1.6 WCAG AA accessibility compliance
- [ ] 6.2 Create `RepoCard` component
  - [ ] 6.2.1 Display repo name, owner, URL
  - [ ] 6.2.2 Show analysis status badge
  - [ ] 6.2.3 Display last analyzed timestamp
  - [ ] 6.2.4 Link to repository detail page
  - [ ] 6.2.5 Loading skeleton state

## 7. UI Components - Repository Details
- [ ] 7.1 Create `CodeRabbitReport` component
  - [ ] 7.1.1 Display analysis summary
  - [ ] 7.1.2 Show suggested tasks list
  - [ ] 7.1.3 Task creation buttons
  - [ ] 7.1.4 Loading state while analysis in progress
  - [ ] 7.1.5 Error state if analysis failed
- [ ] 7.2 Create repository detail page layout
  - [ ] 7.2.1 Header with repo info
  - [ ] 7.2.2 Tabs for Overview, Tasks, Settings
  - [ ] 7.2.3 Breadcrumb navigation

## 8. Pages
- [ ] 8.1 Create `/app/repos/page.tsx` (repository list)
  - [ ] 8.1.1 Fetch user's repositories
  - [ ] 8.1.2 Display list of RepoCard components
  - [ ] 8.1.3 "Connect Repository" button/form
  - [ ] 8.1.4 Empty state when no repos
  - [ ] 8.1.5 Loading state
- [ ] 8.2 Create `/app/repos/[repoId]/page.tsx` (repository detail)
  - [ ] 8.2.1 Fetch repository data
  - [ ] 8.2.2 Display CodeRabbitReport component
  - [ ] 8.2.3 Show repository metadata
  - [ ] 8.2.4 Handle 404 if repo not found
  - [ ] 8.2.5 Verify user owns the repository

## 9. Error Handling & Validation
- [ ] 9.1 Implement URL validation (GitHub format)
- [ ] 9.2 Add private repository detection and rejection
- [ ] 9.3 Handle GitHub API rate limits
- [ ] 9.4 Handle CodeRabbit API errors gracefully
- [ ] 9.5 Add retry logic for transient failures
- [ ] 9.6 Create user-friendly error messages
- [ ] 9.7 Log errors to Galileo for observability

## 10. Testing & Polish
- [ ] 10.1 Test with various GitHub URL formats
- [ ] 10.2 Test private repo rejection
- [ ] 10.3 Test duplicate repo connection prevention
- [ ] 10.4 Test CodeRabbit analysis flow end-to-end
- [ ] 10.5 Test webhook callback handling (MVP: webhook-only, no polling)
- [ ] 10.6 Verify WCAG AA compliance on all forms
- [ ] 10.7 Test loading states and error states
- [ ] 10.8 Test responsive design (mobile/tablet/desktop)
- [ ] 10.9 Note: Re-analyze button deferred to post-MVP

