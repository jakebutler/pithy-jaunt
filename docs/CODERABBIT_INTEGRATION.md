# CodeRabbit Integration Guide

## Overview

Pithy Jaunt integrates with CodeRabbit to automatically analyze repositories and generate tasks. CodeRabbit works as a GitHub App that reviews pull requests, so our integration leverages this workflow.

## Integration Flow

### 1. Repository Connection
- User connects a GitHub repository via `/repos` page
- System validates repository (public only for MVP)
- Repository record created in Convex with status "pending"

### 2. Daytona Workspace Setup
When a repository is cloned in a Daytona workspace (for task execution):

```bash
# In daytona/execution.sh:
1. Clone repository
2. Check if .coderabbit.yaml exists
3. If missing, create CodeRabbit configuration file
4. Commit and push to trigger CodeRabbit analysis
```

### 3. CodeRabbit Analysis
- CodeRabbit GitHub App automatically detects the PR
- Analyzes the codebase (all files, not just changed ones)
- Posts review comments on the PR with:
  - Analysis summary
  - File-by-file breakdown
  - Suggested improvements
  - Code quality recommendations

### 4. Webhook Processing
- GitHub webhook sends PR comment event to `/api/webhook/github`
- System detects CodeRabbit comments
- Parses comment content into structured report
- Extracts actionable tasks

### 5. Task Creation
- System creates one or more Pithy Jaunt tasks based on report scope:
  - **High priority items**: Individual tasks
  - **Medium priority items**: Grouped or individual tasks
  - **Low priority items**: Single grouped task
- Tasks are stored in Convex with `initiator: "coderabbit"`
- Repository status updated to "completed"

## CodeRabbit Configuration

The `.coderabbit.yaml` file is automatically generated with:

```yaml
review:
  enabled: true
  review_all_files: true
  focus:
    - code_quality
    - security
    - performance
    - maintainability
    - best_practices

analysis:
  enabled: true
  summaries:
    enabled: true
    format: markdown
  tasks:
    enabled: true
    min_priority: medium

output:
  format: markdown
  include_suggestions: true
  include_code_examples: true
```

## Webhook Setup

### GitHub Webhook Configuration

1. Go to your GitHub repository settings
2. Navigate to Webhooks → Add webhook
3. Configure:
   - **Payload URL**: `https://your-domain.com/api/webhook/github`
   - **Content type**: `application/json`
   - **Events**: Select "Issue comments" and "Pull requests"
   - **Secret**: (optional, but recommended)

### CodeRabbit Webhook (if available)

If CodeRabbit provides direct webhooks:
- **Payload URL**: `https://your-domain.com/api/webhook/coderabbit`
- Configure in CodeRabbit dashboard

## Task Generation Logic

Tasks are created from CodeRabbit reports using intelligent grouping:

### High Priority
- Each high-priority item becomes its own task
- Immediate attention required

### Medium Priority
- If single item: Individual task
- If multiple items: Grouped into one task with list

### Low Priority
- All low-priority items grouped into single task
- Can be addressed when convenient

## Example Flow

1. User connects `github.com/user/myapp`
2. Repository stored with status "pending"
3. User creates a task → Daytona workspace created
4. Workspace clones repo → Adds `.coderabbit.yaml` → Creates PR
5. CodeRabbit reviews PR → Posts comment with analysis
6. GitHub webhook → Our system parses comment
7. System creates tasks:
   - "Fix security vulnerability in auth.ts" (high priority)
   - "CodeRabbit: 5 medium priority improvements" (grouped)
   - "CodeRabbit: 3 minor improvements" (grouped)
8. Repository status → "completed"
9. User sees tasks in dashboard

## Files

- `lib/coderabbit/config.ts` - CodeRabbit configuration generator
- `lib/coderabbit/parser.ts` - Parse CodeRabbit comments into tasks
- `lib/daytona/coderabbit-setup.ts` - Daytona workspace setup
- `daytona/execution.sh` - Execution script with CodeRabbit setup
- `app/api/webhook/github/route.ts` - GitHub webhook handler
- `app/api/webhook/coderabbit/route.ts` - CodeRabbit webhook handler (if available)

## MVP Notes

- **Webhook-only**: No polling, relies entirely on webhooks
- **Public repos only**: Private repository support deferred
- **Automatic task creation**: Tasks created automatically from analysis
- **One or more tasks**: Intelligent grouping based on priority and scope

## Future Enhancements

- Real-time analysis progress updates (SSE)
- Manual task creation from CodeRabbit suggestions
- Re-analyze button to trigger new analysis
- Analysis history and comparisons
- Custom CodeRabbit configuration per repository

