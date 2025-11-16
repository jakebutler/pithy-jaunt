# Change: Add Task Execution Backend

## Why

The task management UI allows users to create and track tasks, but there is no actual code execution backend. When users click "Execute", a task gets marked as "running" but no code generation, git operations, or PR creation occurs. The Daytona template "pithy-jaunt-dev" referenced in the code doesn't exist, and the AI agent runner script is missing. This makes the application non-functional for its primary purpose: turning natural language tasks into working pull requests.

## What Changes

- Create or configure execution backend to run AI-driven code generation
- Implement AI agent runner that generates code patches based on task descriptions
- Set up git operations (clone repo, create branch, apply patches, commit, push)
- Implement PR creation via GitHub API
- Configure webhook callbacks from execution environment to application
- Add execution environment setup (Daytona template or alternative)
- Implement error handling and status reporting throughout execution flow
- Add execution logs streaming to UI for real-time feedback

## Impact

- Affected specs: task-execution (new capability), task-management (modified)
- Affected code:
  - `lib/daytona/client.ts` - Daytona API integration
  - `app/api/task/[taskId]/execute/route.ts` - Task execution endpoint
  - `app/api/webhook/daytona/route.ts` - Webhook receiver
  - `daytona/execution.sh` - Execution script (needs AI agent integration)
  - New: AI agent runner script (Python or TypeScript)
  - New: GitHub operations module for PR creation
  - New: Execution log streaming infrastructure
  - `convex/tasks.ts` - Enhanced with execution logs and status tracking
  - `convex/workspaces.ts` - Workspace lifecycle management

**BREAKING**: Requires new environment variables and external service configuration (OpenAI/Anthropic API, GitHub token with write access, Daytona template or alternative execution backend).

