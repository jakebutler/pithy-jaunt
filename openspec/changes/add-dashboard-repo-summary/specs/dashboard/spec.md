# Dashboard Specification

## ADDED Requirements

### Requirement: Repository Summary Display

The dashboard SHALL display a summary view of all connected repositories with task statistics when the user has at least one connected repository.

#### Scenario: Displaying repository summaries
- **WHEN** an authenticated user navigates to the dashboard
- **AND** the user has one or more connected repositories
- **THEN** the system displays a repository summary section
- **AND** shows each repository with:
  - Repository name (owner/repo format)
  - Number of successful tasks (status: "completed")
  - Number of failed tasks (status: "failed")
  - Number of not started tasks (status: "queued")
- **AND** provides a link to the repository detail page for each repository

#### Scenario: Empty state for no repositories
- **WHEN** an authenticated user navigates to the dashboard
- **AND** the user has no connected repositories
- **THEN** the system does not display the repository summary section
- **AND** shows all existing dashboard content:
  - Statistics cards (Repositories, Total Tasks, Running, Completed)
  - Recent Tasks section
  - Quick Actions section with "Connect Repository" and "View All Tasks" CTAs

#### Scenario: Repository with no tasks
- **WHEN** a repository has no associated tasks
- **THEN** the system displays the repository in the summary
- **AND** shows zero counts for all task statuses (successful: 0, failed: 0, not started: 0)

#### Scenario: Task count accuracy
- **WHEN** tasks exist for a repository
- **THEN** the system accurately counts tasks by status:
  - Successful tasks: tasks with status "completed"
  - Failed tasks: tasks with status "failed"
  - Not started tasks: tasks with status "queued"
- **AND** excludes tasks with other statuses (running, needs_review, cancelled) from these counts

#### Scenario: Repository summary layout
- **WHEN** the repository summary is displayed
- **THEN** repositories are shown in a responsive grid or list layout
- **AND** the layout adapts to mobile and desktop viewports
- **AND** each repository summary is clearly separated and readable
- **AND** task counts are prominently displayed and easy to scan

#### Scenario: Navigation to repository details
- **WHEN** a user clicks on a repository in the summary
- **THEN** the system navigates to the repository detail page
- **AND** the repository detail page displays full information about that repository

