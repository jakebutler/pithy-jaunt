# Implementation Tasks

## 1. AI Agent Runner

- [ ] 1.1 Create `daytona/agent-runner.py` with LLM integration
- [ ] 1.2 Implement OpenAI GPT-4o integration with system prompt loading
- [ ] 1.3 Implement Anthropic Claude integration as fallback provider
- [ ] 1.4 Add codebase structure analysis (file tree, language detection)
- [ ] 1.5 Implement unified diff generation from LLM response
- [ ] 1.6 Add patch validation (format checking, syntax validation)
- [ ] 1.7 Implement timeout handling (180 second limit)
- [ ] 1.8 Add comprehensive error logging
- [ ] 1.9 Create system prompt in `daytona/system-prompt.md`
- [ ] 1.10 Add token usage tracking and logging

## 2. GitHub Actions Workflow

- [ ] 2.1 Create `.github/workflows/pithy-jaunt-execute.yml` workflow file
- [ ] 2.2 Configure repository dispatch trigger with task metadata input
- [ ] 2.3 Add checkout and environment setup steps (Python, Node.js, gh CLI)
- [ ] 2.4 Add step to run agent-runner.py with task parameters
- [ ] 2.5 Add step to apply patch using git apply
- [ ] 2.6 Add error handling for failed patch application
- [ ] 2.7 Add step to commit and push changes
- [ ] 2.8 Add step to create PR using gh CLI
- [ ] 2.9 Add step to send webhook to application on completion
- [ ] 2.10 Add step to send webhook on failure
- [ ] 2.11 Configure workflow timeout (10 minutes)
- [ ] 2.12 Add execution log capture and storage

## 3. Task Execution API

- [ ] 3.1 Update `app/api/task/[taskId]/execute/route.ts` to trigger GitHub Actions
- [ ] 3.2 Implement GitHub repository dispatch API call
- [ ] 3.3 Add task status validation (only execute queued tasks)
- [ ] 3.4 Add repository connection validation
- [ ] 3.5 Add authentication and authorization checks
- [ ] 3.6 Store execution metadata in Convex (started_at, execution_method)
- [ ] 3.7 Return immediate response with execution status
- [ ] 3.8 Add error handling for GitHub API failures
- [ ] 3.9 Implement retry logic for transient failures

## 4. Webhook Handler

- [ ] 4.1 Create `app/api/webhook/github-actions/route.ts`
- [ ] 4.2 Implement webhook signature verification (HMAC)
- [ ] 4.3 Add request payload validation and schema checking
- [ ] 4.4 Update task status in Convex based on webhook type
- [ ] 4.5 Store PR URL on successful completion
- [ ] 4.6 Store error message on failure
- [ ] 4.7 Add completed_at timestamp
- [ ] 4.8 Trigger email notification on completion
- [ ] 4.9 Add rate limiting to webhook endpoint
- [ ] 4.10 Add comprehensive error logging

## 5. GitHub Integration

- [ ] 5.1 Create `lib/github/client.ts` module for GitHub API operations
- [ ] 5.2 Implement repository dispatch trigger function
- [ ] 5.3 Add GitHub token validation
- [ ] 5.4 Implement PR creation verification
- [ ] 5.5 Add error handling for GitHub API rate limits
- [ ] 5.6 Add retry logic with exponential backoff

## 6. Execution Logs & Streaming

- [ ] 6.1 Update Convex schema to include execution logs table
- [ ] 6.2 Create `convex/execution-logs.ts` with CRUD operations
- [ ] 6.3 Implement log ingestion from webhook payload
- [ ] 6.4 Create Server-Sent Events endpoint for real-time streaming
- [ ] 6.5 Update task detail page to display logs
- [ ] 6.6 Add log retention cleanup (7 days default)
- [ ] 6.7 Implement log pagination for large outputs

## 7. Environment Configuration

- [ ] 7.1 Update `.env.example` with new required variables
- [ ] 7.2 Document OPENAI_API_KEY requirement
- [ ] 7.3 Document ANTHROPIC_API_KEY requirement (optional)
- [ ] 7.4 Document GITHUB_TOKEN requirement with required scopes
- [ ] 7.5 Document GITHUB_WEBHOOK_SECRET for webhook verification
- [ ] 7.6 Document MODEL_PROVIDER and MODEL_NAME configuration
- [ ] 7.7 Update docs/TASK_EXECUTION_SETUP.md with new setup instructions

## 8. Testing

- [ ] 8.1 Create test repository with sample code
- [ ] 8.2 Test end-to-end flow: create task → execute → verify PR
- [ ] 8.3 Test LLM integration with both OpenAI and Anthropic
- [ ] 8.4 Test patch application with valid and invalid patches
- [ ] 8.5 Test webhook delivery and signature verification
- [ ] 8.6 Test error handling (API failures, timeouts, invalid patches)
- [ ] 8.7 Test execution logs streaming
- [ ] 8.8 Add unit tests for agent-runner.py
- [ ] 8.9 Add unit tests for webhook handler
- [ ] 8.10 Add E2E test for complete execution flow

## 9. Documentation

- [ ] 9.1 Update README with task execution setup instructions
- [ ] 9.2 Create docs/AGENT_RUNNER.md with agent architecture details
- [ ] 9.3 Document system prompt guidelines and customization
- [ ] 9.4 Document troubleshooting common execution failures
- [ ] 9.5 Add examples of task descriptions that work well
- [ ] 9.6 Document token usage and cost estimates
- [ ] 9.7 Update TASK_EXECUTION_SETUP.md to reflect implemented solution

## 10. Production Readiness

- [ ] 10.1 Add monitoring for execution success/failure rates
- [ ] 10.2 Implement cost tracking for LLM API usage
- [ ] 10.3 Add alerting for execution failures
- [ ] 10.4 Test ngrok webhook setup for local development
- [ ] 10.5 Test Vercel deployment with production webhook URL
- [ ] 10.6 Verify all secrets are properly configured in Vercel
- [ ] 10.7 Test with multiple concurrent task executions
- [ ] 10.8 Verify execution log retention and cleanup
- [ ] 10.9 Add feature flag for enabling/disabling execution
- [ ] 10.10 Create runbook for common production issues

