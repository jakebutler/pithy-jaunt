# Design: Daytona Maintenance

## Context

Daytona workspaces are created for task execution and should be cleaned up after tasks complete or when idle. Currently, cleanup only happens manually via the cancel endpoint. This design implements automated maintenance to conserve resources and reduce costs.

## Goals / Non-Goals

### Goals
- Automatically terminate workspaces after task completion
- Clean up idle workspaces that haven't been used recently
- Reconcile workspace states between Convex and Daytona
- Provide manual cleanup endpoint for admin use
- Minimize resource waste and costs

### Non-Goals
- Real-time cleanup (scheduled jobs are sufficient)
- Workspace archiving (termination is sufficient for MVP)
- Complex cleanup policies (simple time-based rules)
- Workspace reuse optimization (future enhancement)

## Decisions

### Decision: Scheduled Cleanup vs Event-Driven
**Chosen**: Hybrid approach - event-driven for task completion, scheduled for idle cleanup

**Rationale**: 
- Event-driven cleanup on task completion provides immediate resource recovery (critical with daily schedule)
- Scheduled cleanup catches edge cases (orphaned workspaces, missed events, state drift)
- Simpler than pure event-driven (no need for complex event handling)
- **Important**: With Vercel Hobby plan (once/day limit), event-driven cleanup is essential

**Alternatives considered**:
- Pure event-driven: More complex, risk of missed events, no safety net
- Pure scheduled: Too slow resource recovery (daily only), not acceptable for task completion cleanup

### Decision: Vercel Cron vs Convex Scheduler
**Chosen**: Vercel Cron for scheduled maintenance

**Rationale**:
- Vercel Cron is simple and reliable for periodic tasks
- No additional infrastructure needed
- Works well with Next.js API routes
- Can be disabled via environment variable
- **Note**: Hobby plan limits to once per day, so event-driven cleanup is critical

**Alternatives considered**:
- Convex scheduled functions: Would require Convex-specific patterns, less flexible
- External cron service: Additional dependency and complexity

### Decision: Cleanup Policies
**Chosen**: Time-based policies with configurable thresholds

**Policies**:
1. **Completed Task Cleanup**: Terminate workspace 5 minutes after task completion (grace period for debugging)
2. **Idle Workspace Cleanup**: Terminate workspace after 30 minutes of inactivity (no task updates)
3. **Orphaned Workspace Cleanup**: Terminate workspace with no assigned tasks after 1 hour
4. **Failed Task Cleanup**: Terminate workspace 10 minutes after task failure (longer grace period for investigation)

**Rationale**:
- Simple time-based rules are easy to understand and configure
- Grace periods allow for debugging and investigation
- Configurable via environment variables for flexibility

**Alternatives considered**:
- Immediate cleanup: Too aggressive, prevents debugging
- Complex policies: Over-engineered for MVP needs

### Decision: State Reconciliation
**Chosen**: Periodic reconciliation during scheduled cleanup

**Approach**:
- Query all workspaces from Convex
- For each workspace, check status in Daytona
- Update Convex if states differ
- Terminate workspaces that are terminated in Daytona but not in Convex

**Rationale**:
- Catches state drift between systems
- Simple to implement and understand
- Runs as part of scheduled cleanup (no additional overhead)

**Alternatives considered**:
- Real-time reconciliation: Too expensive, unnecessary
- Manual reconciliation: Too error-prone

### Decision: Error Handling
**Chosen**: Log errors and continue processing

**Approach**:
- Individual workspace cleanup failures don't stop batch processing
- Log all errors with context (workspace ID, error message)
- Return summary of successes and failures
- Retry failed cleanups on next scheduled run

**Rationale**:
- Prevents one bad workspace from blocking cleanup of others
- Provides visibility into issues
- Self-healing via retry on next run

**Alternatives considered**:
- Fail-fast: Too brittle, blocks cleanup
- Complex retry logic: Over-engineered for MVP

## Risks / Trade-offs

### Risk: Premature Cleanup
**Mitigation**: 
- Grace periods before cleanup (5-10 minutes)
- Respect `keepWorkspaceAlive` flag
- Manual cleanup endpoint for edge cases

### Risk: API Rate Limiting
**Mitigation**:
- Batch operations with delays between requests
- Limit number of workspaces processed per run
- Monitor API usage and adjust schedule if needed

### Risk: State Drift
**Mitigation**:
- Periodic reconciliation catches drift
- Webhook updates keep states in sync
- Manual sync endpoint for recovery

### Trade-off: Cleanup Frequency vs Resource Usage
- More frequent cleanup = lower resource usage but more API calls
- Less frequent cleanup = fewer API calls but higher resource usage
- **Chosen**: Once per day (configurable via cron schedule) due to Vercel Hobby plan limitations
  - Event-driven cleanup handles task completion immediately (critical with daily schedule)
  - Scheduled cleanup is primarily for idle/orphaned workspaces and reconciliation
  - Daily cleanup is acceptable given event-driven cleanup handles most cases
  - Schedule is configurable via `WORKSPACE_CLEANUP_CRON_SCHEDULE` environment variable
  - Default: `0 2 * * *` (2:00 AM daily) - can be adjusted for Pro/Enterprise plans

## Migration Plan

### Phase 1: Implementation
1. Add Daytona client functions (listWorkspaces, stopWorkspace)
2. Create maintenance utilities
3. Add cleanup endpoint
4. Integrate with webhook handler

### Phase 2: Scheduled Job
1. Set up Vercel Cron job
2. Configure cleanup schedule
3. Test in development environment

### Phase 3: Rollout
1. Enable cleanup with conservative thresholds
2. Monitor for issues
3. Adjust thresholds based on usage patterns
4. Document for operations team

### Rollback
- Disable cleanup via `WORKSPACE_CLEANUP_ENABLED=false`
- Manual cleanup via endpoint if needed
- No data loss (cleanup is additive)

## Open Questions

- Should we archive workspaces instead of terminating? (Future enhancement)
- Should we support workspace reuse for multiple tasks? (Future enhancement)
- What metrics should we track for cleanup effectiveness? (TBD during implementation)

