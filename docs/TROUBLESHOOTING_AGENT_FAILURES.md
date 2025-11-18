# Troubleshooting Agent Runner Failures

## Problem

Tasks are failing with the error: "AI agent failed to generate patch"

This error occurs when `agent-runner.py` exits with a non-zero exit code, but the actual error details weren't being captured.

## Solution

The `execution.sh` script has been updated to:

1. **Capture stderr** from `agent-runner.py` when it fails
2. **Include stderr in error details** sent to the webhook
3. **Add patch file preview** if the patch file exists when the agent fails

## Common Causes

Based on the agent-runner.py code, here are common failure reasons:

### 1. Missing API Keys
- **Error**: `ValueError: OPENAI_API_KEY environment variable is required`
- **Solution**: Ensure API keys are set in the workspace environment variables

### 2. Missing Python Packages
- **Error**: `ImportError: openai package is not installed`
- **Solution**: Verify the declarative image includes all required packages

### 3. API Timeouts
- **Error**: `TimeoutError: OpenAI API call timed out after 180 seconds`
- **Solution**: Check API connectivity, rate limits, or increase timeout

### 4. API Errors
- **Error**: `RuntimeError: OpenAI API error: ...`
- **Solution**: Check API key validity, rate limits, or API status

### 5. File Reading Errors
- **Error**: `RuntimeError: Failed to read original file ...`
- **Solution**: Verify file paths and repository state

### 6. Git Diff Failures
- **Error**: `RuntimeError: git diff failed with exit code ...`
- **Solution**: Check git installation and repository state

### 7. Empty or Truncated LLM Response
- **Error**: `RuntimeError: Failed to extract file content from LLM response`
- **Solution**: Check token limits, increase max_tokens, or simplify task

### 8. Empty Patch Generation
- **Error**: `RuntimeError: Generated patch is empty`
- **Solution**: Verify task description is clear and files are being modified

## How to Debug

### Step 1: Check Execution Logs

The error details are now stored in the `executionLogs` table. Check the task logs in the UI or query:

```typescript
// In Convex dashboard or via API
const logs = await convexClient.query(api.executionLogs.getLogsByTask, {
  taskId: "your-task-id"
})
```

### Step 2: Look for Agent-Runner Stderr

The error details should now include:
```
AI agent failed to generate patch

Agent-runner stderr:
[actual error message from agent-runner.py]
```

### Step 3: Check Workspace Logs

If the error details aren't sufficient, you can check the workspace logs directly:

```bash
# Using the check-task-logs script
npx tsx scripts/check-task-logs.ts <taskId>
```

### Step 4: Verify Environment Variables

Ensure all required environment variables are set in the workspace:

- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY`
- `MODEL_PROVIDER` (openai, anthropic, or openrouter)
- `MODEL` (e.g., gpt-4o, claude-3-5-sonnet-20241022)

### Step 5: Test Locally

Test the agent-runner locally to reproduce the issue:

```bash
cd /path/to/repo
python3 daytona/agent-runner.py \
  --prompt-file daytona/system-prompt.md \
  --task "Your task description" \
  --repo-path . \
  --out /tmp/test-patch.diff \
  --provider openai \
  --model gpt-4o \
  --use-two-step
```

## Next Steps

After the fix is deployed:

1. **Rebuild the Docker image** with the updated `execution.sh`
2. **Create a new snapshot** in Daytona
3. **Update environment variables** in Vercel
4. **Test with a new task** and check the error details

The error details should now show the actual error from `agent-runner.py`, making it much easier to diagnose the issue.

