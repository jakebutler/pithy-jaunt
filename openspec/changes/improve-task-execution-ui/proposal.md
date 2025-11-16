# Change: Improve Task Execution UI Feedback

## Why
When users click the Execute button on a task, there is currently no immediate UI feedback that the execution has started. The page uses a server-side form POST which causes a full page reload, leaving users uncertain about whether their action was registered. Additionally, the Execute and Edit buttons remain enabled during execution, which could lead to duplicate execution attempts or confusion about the task state.

## What Changes
- Add immediate visual feedback when Execute button is clicked (loading state, toast notification, or status update)
- Disable Execute button while task is executing (status is "running")
- Disable Edit button (if present) while task is executing
- Provide clear visual indication that task execution has started
- Ensure buttons remain disabled until execution completes or fails

## Impact
- Affected specs: task-management (new capability)
- Affected code: 
  - `app/tasks/[taskId]/page.tsx` - Task detail page with Execute button
  - Potentially new client component for task actions with loading states
  - API route `/api/task/[taskId]/execute` may need to return execution status




