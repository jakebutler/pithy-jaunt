# Debugging Running Task

The task is still running. Here's how to check what's happening:

## Check Daytona Workspace Logs

1. **Go to Daytona Dashboard:** https://app.daytona.io
2. **Click "Sandboxes"** in the left sidebar
3. **Find the workspace** for your task (should show as "running")
4. **Click on it** to view details
5. **Check the logs** - you should see output from the execution script

Look for these log messages to see where it's stuck:

- `[pj] Starting execution for task: ...` - Script started
- `[pj] Cloning repository: ...` - Cloning repo
- `[pj] Running AI agent to generate code changes...` - **Most likely stuck here**
- `[pj] Patch generated successfully` - Agent completed
- `[pj] Applying patch...` - Applying changes
- `[pj] Creating pull request...` - Creating PR
- `[pj] Execution completed successfully!` - Done!

## Common Issues

### Stuck at "Running AI agent"
- **LLM API timeout**: The agent-runner has a 180-second timeout, but LLM calls can sometimes hang
- **API key issues**: Check if OPENAI_API_KEY or ANTHROPIC_API_KEY is set correctly
- **Model name**: Verify the model name is correct (e.g., `gpt-4o`)

### Stuck at "Creating pull request"
- **GitHub token**: Check if GITHUB_TOKEN has correct permissions
- **Network issues**: GitHub API might be slow

### No logs visible
- **Script not running**: Check if the init script is configured correctly
- **Workspace not started**: Verify the workspace actually started

## Quick Fixes

If it's stuck at the AI agent step, you can:

1. **Check the workspace logs** in Daytona dashboard
2. **Terminate the workspace** if it's been running > 10 minutes
3. **Check your API keys** are set correctly in `.env.local`
4. **Try a simpler task** to test if it's a complexity issue

## Next Steps

1. Check the Daytona workspace logs first
2. Share what you see in the logs
3. We can add better timeout handling or debugging if needed

