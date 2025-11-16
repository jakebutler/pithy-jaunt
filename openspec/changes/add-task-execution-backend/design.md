# Design: Task Execution Backend

## Context

Pithy Jaunt's core value proposition is automated code generation from natural language tasks. The UI and task management exist, but without an execution backend, tasks never complete. The existing `daytona/execution.sh` script provides a template, but lacks:

1. An AI agent runner to generate code patches
2. A Daytona template or alternative execution environment
3. Proper error handling and status reporting
4. Webhook integration for completion notifications

## Goals / Non-Goals

### Goals
- Enable end-to-end task execution: task creation → code generation → PR creation → user notification
- Implement AI agent that generates high-quality, idiomatic code patches
- Support both OpenAI (GPT-4o) and Anthropic (Claude) as LLM providers
- Provide real-time execution logs to users
- Handle failures gracefully with clear error messages
- Support public GitHub repositories only (MVP scope)

### Non-Goals
- Private repository support (post-MVP)
- Multi-task workspace reuse (nice-to-have, not MVP-critical)
- Advanced agent capabilities (self-correction, iterative refinement)
- Browser Use integration for UI testing (separate change)
- Voice-to-task functionality (stub for demo)

## Decisions

### Decision 1: Execution Backend Strategy

**Options Considered:**

1. **Daytona Template** (as originally planned)
   - Pros: Ephemeral workspaces, built for CI/CD, matches project.md design
   - Cons: Requires template creation and approval from Daytona, unknown timeline
   - Status: Blocked pending Daytona support response

2. **GitHub Actions** (recommended for MVP)
   - Pros: No additional service, built-in git/PR access, free for public repos
   - Cons: Less isolated than Daytona, limited runtime (6 hours max)
   - Implementation: Repository dispatch event triggers workflow
   
3. **Modal.com** (serverless alternative)
   - Pros: Fast cold starts, simple Python integration, generous free tier
   - Cons: New dependency, less integrated with GitHub
   
4. **Local Execution** (development only)
   - Pros: Fast iteration, no external dependencies
   - Cons: Not production-ready, no isolation

**Chosen: GitHub Actions for MVP**

Rationale: Unblocks development immediately, leverages existing GitHub integration, free for public repos, and provides good isolation. Can migrate to Daytona post-MVP if needed.

Implementation approach:
- API endpoint triggers GitHub Actions workflow via repository dispatch
- Workflow runs in repository context with full git access
- Workflow executes AI agent script, applies patch, creates PR
- Workflow sends webhook to application on completion

### Decision 2: AI Agent Architecture

**Options Considered:**

1. **LangChain/LangGraph**
   - Pros: Rich ecosystem, built for agents
   - Cons: Heavy dependency, overkill for simple patch generation
   
2. **Custom Python Script with LiteLLM**
   - Pros: Simple, lightweight, multi-provider support
   - Cons: More code to maintain
   
3. **TypeScript with Vercel AI SDK**
   - Pros: Type safety, consistency with rest of stack
   - Cons: Less mature for agentic workflows

**Chosen: Custom Python Script with OpenAI/Anthropic SDKs**

Rationale: Keep it simple for MVP. Direct SDK usage provides maximum control and minimal dependencies. LiteLLM adds unnecessary abstraction for a single generation step.

Agent flow:
```
1. Clone repository
2. Analyze codebase structure
3. Load task description + CodeRabbit analysis (if available)
4. Generate code patch using LLM
5. Validate patch format
6. Return unified diff
```

### Decision 3: Patch Application Strategy

**Options Considered:**

1. **Git Apply** (current in execution.sh)
   - Pros: Native git operation, handles conflicts well
   - Cons: Requires valid unified diff format
   
2. **Direct File Writes**
   - Pros: Simpler, no format requirements
   - Cons: Loses context, harder to review, no conflict detection
   
3. **GitHub API Tree Updates**
   - Pros: No local git needed
   - Cons: Complex for multi-file changes, loses git history

**Chosen: Git Apply with Fallback**

Rationale: Maintain compatibility with existing execution.sh. Falls back to marking task as "needs_review" on patch failure.

### Decision 4: Webhook Callback Mechanism

**Options Considered:**

1. **Daytona Webhook** (original design)
   - Pros: Built-in, reliable
   - Cons: Daytona-specific, not applicable for GitHub Actions
   
2. **GitHub Actions → Direct HTTP POST**
   - Pros: Simple, direct
   - Cons: Requires public webhook endpoint (ngrok for dev)
   
3. **Polling** (status checks)
   - Pros: No webhook setup needed
   - Cons: Delayed feedback, inefficient

**Chosen: GitHub Actions → Direct HTTP POST to `/api/webhook/github-actions`**

Rationale: Direct feedback, reuses existing webhook infrastructure. Use ngrok for local development, Vercel URL for production.

Webhook payload:
```json
{
  "type": "task.completed" | "task.failed",
  "taskId": "string",
  "workspaceId": "string",
  "branchName": "string",
  "prUrl": "string", // if successful
  "error": "string", // if failed
  "logs": "string"
}
```

## Implementation Phases

### Phase 1: AI Agent Runner (Foundation)
- Create Python script: `daytona/agent-runner.py`
- Input: task description, repository path, CodeRabbit analysis
- Output: unified diff patch
- LLM providers: OpenAI (primary), Anthropic (fallback)
- System prompt: `daytona/system-prompt.md`

### Phase 2: GitHub Actions Workflow
- Create workflow file: `.github/workflows/pithy-jaunt-execute.yml`
- Trigger: repository dispatch event with task metadata
- Steps: checkout, run agent, apply patch, create PR, send webhook
- Environment: Python 3.11, Node.js 20, git, gh CLI

### Phase 3: Task Execution API
- Update `app/api/task/[taskId]/execute/route.ts`
- Trigger GitHub Actions workflow via repository dispatch
- Store execution metadata in Convex
- Return immediate response (execution started)

### Phase 4: Webhook Handler
- Create `app/api/webhook/github-actions/route.ts`
- Verify webhook signature (HMAC or GitHub webhook secret)
- Update task status in Convex
- Trigger email notification on completion

### Phase 5: Execution Logs & Streaming
- Add execution log storage to Convex schema
- Implement Server-Sent Events for real-time log streaming
- Update UI to display streaming logs
- Handle log retention and cleanup

## Risks / Trade-offs

### Risk 1: GitHub Actions Rate Limits
- **Mitigation**: GitHub Actions free tier provides 2,000 minutes/month for private repos, unlimited for public repos. MVP targets public repos only.

### Risk 2: LLM API Costs
- **Mitigation**: Implement token usage tracking. Use temperature=0 for deterministic output. Set max_tokens limit. Monitor costs via OpenAI/Anthropic dashboards.

### Risk 3: Patch Quality
- **Mitigation**: 
  - Include CodeRabbit analysis in context
  - Clear system prompt emphasizing idiomatic, tested code
  - Mark failed patches as "needs_review" rather than silent failure
  - Log all LLM responses for debugging

### Risk 4: Webhook Security
- **Mitigation**: 
  - Verify webhook signatures using HMAC
  - Rate limit webhook endpoint
  - Validate webhook payload schema
  - Use ngrok auth token for development

### Risk 5: Execution Timeout
- **Mitigation**: 
  - Set GitHub Actions timeout to 10 minutes (configurable)
  - Stream logs to UI so users see progress
  - Mark timed-out tasks as "failed" with clear message

## Migration Plan

### Development Environment
1. Create `.env.local` with required API keys
2. Install ngrok and configure tunnel
3. Update `NEXT_PUBLIC_APP_URL` with ngrok URL
4. Create GitHub Actions workflow in a test repository
5. Test end-to-end flow manually

### Production Deployment
1. Add environment variables to Vercel
2. Configure GitHub webhook secret
3. Deploy to Vercel (triggers automatic deployment)
4. Test with real repository
5. Monitor error logs and LLM costs

### Rollback Plan
- Tasks created during deployment remain in "queued" state
- Can be manually completed using existing `./scripts/complete-task-manually.sh`
- No data migration needed (new fields are optional)
- Disable execution endpoint via feature flag if issues arise

## Open Questions

1. **Q**: Should we implement execution timeout handling in the agent script itself?
   **A**: Yes, wrap LLM calls in timeout decorator (180 seconds). Fail fast rather than hanging.

2. **Q**: How to handle CodeRabbit analysis that isn't ready yet?
   **A**: For MVP, proceed without it. Post-MVP, add "waiting for analysis" state and retry logic.

3. **Q**: Should we store full patch diffs in Convex?
   **A**: No, store patches in GitHub as gists or in workspace logs. Convex stores only metadata (patch URL, size, status).

4. **Q**: How to test locally without triggering real GitHub Actions?
   **A**: Create mock execution script that simulates workflow locally. Use feature flag to toggle between local and GitHub Actions execution.

## Success Metrics

- [ ] End-to-end task execution completes successfully (create task → execute → PR created)
- [ ] Execution logs visible in UI within 5 seconds of execution start
- [ ] 90% of patches apply successfully on first attempt
- [ ] Average execution time < 3 minutes for simple tasks
- [ ] Webhook delivery success rate > 95%
- [ ] Zero exposed API keys or credentials in logs/errors

## References

- TASK_EXECUTION_SETUP.md - Current state documentation
- daytona/execution.sh - Original execution script template
- openspec/project.md - Project architecture and constraints

