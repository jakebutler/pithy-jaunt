# Change: Add Daytona Maintenance

## Why

Daytona workspaces consume resources (CPU, memory, storage) and incur costs while running. Currently, workspaces are only terminated manually via the cancel endpoint, leading to:
- Orphaned workspaces running indefinitely after task completion
- Unnecessary resource consumption and costs
- Workspaces left in "running" or "stopped" states that should be terminated
- No automatic cleanup based on task lifecycle or idle time

Daytona documentation recommends proactive cleanup using auto-stop, auto-archive, and termination based on workspace lifecycle. Implementing automated maintenance will conserve resources, reduce costs, and ensure workspaces are properly cleaned up after tasks complete.

## What Changes

- Add scheduled maintenance job (hourly) to identify and clean up workspaces
- Implement automatic termination of workspaces after task completion
- Add idle workspace detection and cleanup based on last activity
- Configure Daytona auto-stop and auto-archive intervals where supported
- Add workspace lifecycle monitoring and reconciliation
- Implement cleanup policies based on task status and workspace state
- Add maintenance metrics and logging for visibility
- Create admin endpoint to trigger manual cleanup (optional)

## Impact

- Affected specs: workspace-maintenance (new capability), task-execution (modified)
- Affected code:
  - New: `app/api/maintenance/workspaces/cleanup/route.ts` - Cleanup endpoint
  - New: `lib/daytona/maintenance.ts` - Maintenance utilities
  - Modified: `lib/daytona/client.ts` - Add listWorkspaces, stopWorkspace functions
  - Modified: `app/api/webhook/daytona/route.ts` - Trigger cleanup on task completion
  - Modified: `convex/workspaces.ts` - Add queries for cleanup candidates
  - New: Scheduled job or cron task for periodic cleanup (Vercel Cron or Convex scheduler)
  - New: Environment variables for cleanup configuration

**BREAKING**: None - this is additive functionality.

