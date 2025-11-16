# Change: Add Repository Summary View to Dashboard

## Why

When users land on the dashboard, they should immediately see an overview of their connected repositories with task statistics. Currently, the dashboard shows aggregate statistics across all repositories, but users need to see per-repository summaries to quickly understand the status of tasks for each connected repository. This provides better visibility into which repositories have active work, completed tasks, or need attention.

## What Changes

- Add repository summary section to dashboard displaying connected repositories
- Show per-repository task statistics (successful, failed, not started)
- Display repository name and link to repository detail page
- Calculate task counts by status for each repository
- Handle empty state when no repositories are connected
- Ensure responsive design for mobile and desktop views
- **Preserve all existing dashboard content**: Statistics cards, Recent Tasks section, and Quick Actions section (including "Connect Repository" and "View All Tasks" CTAs) remain unchanged

## Impact

- **Affected specs**: `dashboard` (new capability)
- **Affected code**:
  - `/app/dashboard/page.tsx` - Add repository summary section
  - `/components/repos/RepoSummaryCard.tsx` - New component for repository summary cards (if needed)
  - `/convex/tasks.ts` - May need query optimization for task counts by repo
  - Dashboard layout and styling updates

