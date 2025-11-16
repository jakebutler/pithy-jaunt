# Workspace Maintenance Specification

## ADDED Requirements

### Requirement: Automatic Workspace Cleanup
The system SHALL automatically terminate Daytona workspaces based on task completion, idle time, and orphaned state to conserve resources and reduce costs.

#### Scenario: Cleanup after task completion
- **WHEN** a task completes (status: completed or failed)
- **AND** the task has an assigned workspace
- **AND** the grace period has elapsed (default: 5 minutes for completed, 10 minutes for failed)
- **THEN** the workspace SHALL be terminated in Daytona
- **AND** the workspace status in Convex SHALL be updated to "terminated"

#### Scenario: Cleanup of idle workspaces
- **WHEN** a workspace has been idle (no task updates) for the configured timeout (default: 30 minutes)
- **AND** the workspace status is "running" or "stopped"
- **THEN** the workspace SHALL be terminated in Daytona
- **AND** the workspace status in Convex SHALL be updated to "terminated"

#### Scenario: Cleanup of orphaned workspaces
- **WHEN** a workspace has no assigned tasks
- **AND** the workspace has existed for more than 1 hour
- **THEN** the workspace SHALL be terminated in Daytona
- **AND** the workspace status in Convex SHALL be updated to "terminated"

#### Scenario: Respect keepWorkspaceAlive flag
- **WHEN** a workspace was created with `keepWorkspaceAlive: true`
- **THEN** the workspace SHALL NOT be automatically terminated
- **AND** the workspace SHALL only be terminated manually or when explicitly requested

### Requirement: Workspace State Reconciliation
The system SHALL periodically reconcile workspace states between Convex and Daytona to detect and correct state drift.

#### Scenario: Reconcile terminated workspace
- **WHEN** a workspace is terminated in Daytona but status in Convex is not "terminated"
- **THEN** the workspace status in Convex SHALL be updated to "terminated"
- **AND** the reconciliation SHALL be logged

#### Scenario: Reconcile running workspace
- **WHEN** a workspace is running in Daytona but status in Convex is "stopped" or "terminated"
- **THEN** the workspace status in Convex SHALL be updated to "running"
- **AND** the reconciliation SHALL be logged

### Requirement: Scheduled Maintenance Job
The system SHALL run a scheduled maintenance job to perform cleanup and reconciliation operations.

#### Scenario: Periodic cleanup execution
- **WHEN** the scheduled maintenance job runs (default: once per day at 2:00 AM)
- **THEN** the job SHALL identify cleanup candidates
- **AND** the job SHALL terminate eligible workspaces
- **AND** the job SHALL reconcile workspace states
- **AND** the job SHALL log summary of operations (counts, errors)

#### Scenario: Maintenance job error handling
- **WHEN** the maintenance job encounters an error processing a workspace
- **THEN** the error SHALL be logged with context (workspace ID, error message)
- **AND** the job SHALL continue processing remaining workspaces
- **AND** failed operations SHALL be retried on the next scheduled run

### Requirement: Manual Cleanup Endpoint
The system SHALL provide an API endpoint to manually trigger workspace cleanup for administrative purposes.

#### Scenario: Manual cleanup trigger
- **WHEN** an authenticated admin calls POST `/api/maintenance/workspaces/cleanup`
- **THEN** the system SHALL identify and terminate cleanup candidates
- **AND** the system SHALL return a summary of operations (workspaces cleaned, errors encountered)
- **AND** the operations SHALL be logged

#### Scenario: Manual cleanup with filters
- **WHEN** an authenticated admin calls POST `/api/maintenance/workspaces/cleanup` with query parameters
- **THEN** the system SHALL only process workspaces matching the filters (status, age, etc.)
- **AND** the system SHALL return filtered results

### Requirement: Cleanup Configuration
The system SHALL support configurable cleanup policies via environment variables.

#### Scenario: Disable cleanup
- **WHEN** `WORKSPACE_CLEANUP_ENABLED=false` is set
- **THEN** automatic cleanup SHALL be disabled
- **AND** scheduled maintenance jobs SHALL skip cleanup operations
- **AND** manual cleanup endpoint SHALL still be available

#### Scenario: Configure cleanup schedule
- **WHEN** `WORKSPACE_CLEANUP_CRON_SCHEDULE` is set
- **THEN** the scheduled maintenance job SHALL run according to the cron expression
- **AND** the default schedule SHALL be `0 2 * * *` (2:00 AM daily) if not specified
- **AND** the cron schedule SHALL be configurable to support different Vercel plan limits

#### Scenario: Configure idle timeout
- **WHEN** `WORKSPACE_IDLE_TIMEOUT_MINUTES` is set
- **THEN** idle workspaces SHALL be cleaned up after the specified timeout
- **AND** the default timeout SHALL be 30 minutes if not specified

#### Scenario: Configure grace period
- **WHEN** `WORKSPACE_COMPLETION_GRACE_PERIOD_MINUTES` is set
- **THEN** completed task workspaces SHALL be cleaned up after the specified grace period
- **AND** the default grace period SHALL be 5 minutes if not specified

### Requirement: Cleanup Metrics and Logging
The system SHALL log cleanup operations and provide visibility into maintenance activities.

#### Scenario: Log cleanup operations
- **WHEN** a workspace is terminated during cleanup
- **THEN** the operation SHALL be logged with workspace ID, reason, and timestamp
- **AND** the log SHALL include any errors encountered

#### Scenario: Log maintenance job summary
- **WHEN** a scheduled maintenance job completes
- **THEN** the job SHALL log a summary including:
  - Number of workspaces processed
  - Number of workspaces terminated
  - Number of workspaces reconciled
  - Number of errors encountered
  - Execution duration

## MODIFIED Requirements

### Requirement: Task Execution Completion
The system SHALL trigger workspace cleanup when task execution completes.

#### Scenario: Trigger cleanup on task completion
- **WHEN** a task execution completes (via webhook or status update)
- **AND** the task has an assigned workspace
- **THEN** the system SHALL schedule cleanup after the grace period
- **AND** the workspace SHALL be terminated if not kept alive

