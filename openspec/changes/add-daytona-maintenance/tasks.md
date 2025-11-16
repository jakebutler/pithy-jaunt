## 1. Research and Design
- [ ] 1.1 Review Daytona API documentation for listWorkspaces, stopWorkspace endpoints
- [ ] 1.2 Determine best scheduling approach (Vercel Cron vs Convex scheduler)
- [ ] 1.3 Define cleanup policies and thresholds (idle time, task completion grace period)
- [ ] 1.4 Design workspace state reconciliation logic

## 2. Daytona Client Enhancements
- [ ] 2.1 Add `listWorkspaces()` function to `lib/daytona/client.ts`
- [ ] 2.2 Add `stopWorkspace()` function to `lib/daytona/client.ts`
- [ ] 2.3 Add error handling for workspace operations
- [ ] 2.4 Add workspace filtering utilities (by status, age, etc.)

## 3. Maintenance Utilities
- [ ] 3.1 Create `lib/daytona/maintenance.ts` with cleanup logic
- [ ] 3.2 Implement `findCleanupCandidates()` - identify workspaces to clean
- [ ] 3.3 Implement `cleanupWorkspace()` - terminate and update database
- [ ] 3.4 Implement `reconcileWorkspaceStates()` - sync Convex with Daytona
- [ ] 3.5 Add cleanup metrics and logging

## 4. Convex Schema and Queries
- [ ] 4.1 Add queries to `convex/workspaces.ts` for cleanup candidates
- [ ] 4.2 Add query for workspaces by status and age
- [ ] 4.3 Add query for workspaces with completed tasks
- [ ] 4.4 Add mutation to batch update workspace statuses

## 5. Cleanup API Endpoint
- [ ] 5.1 Create `app/api/maintenance/workspaces/cleanup/route.ts`
- [ ] 5.2 Implement POST endpoint for manual cleanup trigger
- [ ] 5.3 Add authentication/authorization (admin only)
- [ ] 5.4 Add cleanup summary response (counts, errors)

## 6. Automatic Cleanup Integration
- [ ] 6.1 Modify `app/api/webhook/daytona/route.ts` to trigger cleanup on task completion
- [ ] 6.2 Add cleanup check for failed tasks
- [ ] 6.3 Implement grace period before cleanup (e.g., 5 minutes after completion)
- [ ] 6.4 Add cleanup for orphaned workspaces (no assigned tasks)

## 7. Scheduled Maintenance Job
- [ ] 7.1 Set up Vercel Cron job (configure in `vercel.json` or Next.js config)
- [ ] 7.2 Configure cleanup schedule (default: `0 2 * * *` - 2:00 AM daily for Hobby plan)
- [ ] 7.3 Make schedule configurable via `WORKSPACE_CLEANUP_CRON_SCHEDULE` environment variable
- [ ] 7.4 Implement periodic cleanup of idle workspaces
- [ ] 7.5 Implement periodic state reconciliation
- [ ] 7.6 Add error handling and retry logic
- [ ] 7.7 Document Vercel plan limitations (Hobby: once/day, Pro: unlimited)

## 8. Configuration
- [ ] 8.1 Add environment variables:
  - `WORKSPACE_CLEANUP_ENABLED` (default: true)
  - `WORKSPACE_CLEANUP_CRON_SCHEDULE` (default: `0 2 * * *` - 2:00 AM daily)
  - `WORKSPACE_IDLE_TIMEOUT_MINUTES` (default: 30)
  - `WORKSPACE_COMPLETION_GRACE_PERIOD_MINUTES` (default: 5)
- [ ] 8.2 Update `env.example` with new variables
- [ ] 8.3 Document configuration in README
- [ ] 8.4 Document Vercel plan limitations and how to adjust schedule for Pro/Enterprise

## 9. Testing
- [ ] 9.1 Test cleanup of completed task workspaces
- [ ] 9.2 Test cleanup of idle workspaces
- [ ] 9.3 Test cleanup of orphaned workspaces
- [ ] 9.4 Test state reconciliation
- [ ] 9.5 Test error handling (workspace already terminated, API errors)
- [ ] 9.6 Test cleanup respects keepWorkspaceAlive flag
- [ ] 9.7 Test scheduled job execution

## 10. Documentation
- [ ] 10.1 Document cleanup policies and thresholds
- [ ] 10.2 Document maintenance job schedule
- [ ] 10.3 Document manual cleanup endpoint
- [ ] 10.4 Add troubleshooting guide for workspace cleanup issues

