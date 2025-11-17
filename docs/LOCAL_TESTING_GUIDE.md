# Local Testing Guide

This guide explains how to test task execution locally without deploying to production. This dramatically speeds up your development cycle and allows you to iterate quickly on fixes.

## 🎯 Quick Answer: How to Test a Simple README Update

```bash
# 1. Set your API keys
export OPENAI_API_KEY="your-key"
export GITHUB_TOKEN="your-token"

# 2. Run the test script
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Update README.md to add installation instructions" \
  --skip-pr
```

That's it! No Docker builds, no deployments, no waiting. The script will:
- Clone your repo
- Generate a patch using the AI agent
- Apply the patch
- Show you the changes
- Keep everything local (no PR created with `--skip-pr`)

## Quick Start: Test a Simple README Update

The fastest way to test task execution locally:

```bash
# Make sure you have your API keys set
export OPENAI_API_KEY="your-key"
export GITHUB_TOKEN="your-token"  # Optional if using --skip-pr

# Test updating a README
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Update README.md to add installation instructions"
```

That's it! The script will:
1. Clone your repository
2. Create a branch
3. Run the AI agent to generate a patch
4. Apply the patch
5. Show you the changes
6. Optionally create a PR (if you don't use `--skip-pr`)

## Prerequisites

1. **Python 3.11+** with required packages:
   ```bash
   pip install openai anthropic
   ```

2. **Git** installed and configured

3. **API Keys**:
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
   - `GITHUB_TOKEN` (optional if using `--skip-pr`)

4. **jq** (optional, for better JSON handling):
   ```bash
   brew install jq  # macOS
   ```

## Testing Options

### 1. Full Execution Test (Recommended)

Test the complete flow including PR creation:

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/owner/repo \
  "Your task description here"
```

### 2. Test Without PR Creation

Skip PR creation to test faster:

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/owner/repo \
  "Your task description" \
  --skip-pr
```

### 3. Test Without Pushing to Remote

Test locally only, don't push changes:

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/owner/repo \
  "Your task description" \
  --skip-pr \
  --skip-push
```

**Note:** The current `execution.sh` doesn't support `--skip-push` natively. You can modify it or test on a fork.

### 4. Test with Different Models

```bash
# Use Anthropic
./scripts/test-task-execution-local.sh \
  https://github.com/owner/repo \
  "Your task" \
  --provider anthropic \
  --model claude-3-5-sonnet-20241022

# Use different OpenAI model
./scripts/test-task-execution-local.sh \
  https://github.com/owner/repo \
  "Your task" \
  --model gpt-4-turbo
```

### 5. Test with Webhook Integration

If you have your Next.js app running locally:

```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Run test with webhook
./scripts/test-task-execution-local.sh \
  https://github.com/owner/repo \
  "Your task" \
  --webhook-url http://localhost:3000/api/webhook/daytona
```

## Patch-Only Testing

If you just want to test patch generation without the full execution flow:

```bash
# Test patch generation on a local repository
./scripts/test-patch-generation.sh /path/to/local/repo "Update README.md"
```

This script:
- Generates a patch
- Validates the patch format
- Attempts to apply it
- Shows you the changes
- Creates a backup so you can restore

## Understanding the Output

### Successful Execution

```
✓ Task execution completed successfully!

Workspace Directory: /tmp/pj-local-test-1234567890
Execution Log: /tmp/pj-local-test-1234567890/execution.log
Repository Location: /tmp/pj-local-test-1234567890/repo

To review changes:
  cd /tmp/pj-local-test-1234567890/repo
  git status
  git diff
```

### Failed Execution

```
✗ Task execution failed (exit code: 1)

Check the execution log for details:
  /tmp/pj-local-test-1234567890/execution.log
```

Check the log file for detailed error messages, including:
- Patch generation errors
- Patch validation errors
- Git apply errors
- PR creation errors

## Common Issues and Solutions

### Issue: "OPENAI_API_KEY is required"

**Solution:** Set your API key:
```bash
export OPENAI_API_KEY="sk-..."
```

### Issue: "Failed to clone repository"

**Solution:** 
- Check the repository URL is correct
- Ensure the repository is public or you have access
- Verify your network connection

### Issue: "Patch validation failed"

**Solution:**
- Check the patch file: `cat /tmp/patch.diff`
- Review the error in the execution log
- The patch may have context mismatches - this is what we're trying to fix!

### Issue: "Failed to create pull request"

**Solution:**
- Verify `GITHUB_TOKEN` is set and valid
- Check the token has `repo` permissions
- Use `--skip-pr` to test without PR creation

## Workflow: Iterative Development

Here's a recommended workflow for fixing issues:

1. **Identify the problem** (e.g., patch fails to apply)

2. **Test locally** with a simple task:
   ```bash
   ./scripts/test-task-execution-local.sh \
     https://github.com/your-username/test-repo \
     "Update README.md" \
     --skip-pr
   ```

3. **Review the patch**:
   ```bash
   cat /tmp/patch.diff
   ```

4. **Fix the issue** (e.g., update `system-prompt.md` or `agent-runner.py`)

5. **Test again** with the same command

6. **Once it works locally**, commit and deploy:
   ```bash
   git add .
   git commit -m "Fix: Improve patch generation"
   git push
   ```

7. **Test in production** with a real task

## Testing Different Scenarios

### Test Simple File Updates

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/owner/repo \
  "Update README.md to add a new section about installation"
```

### Test Code Changes

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/owner/repo \
  "Add error handling to the login function"
```

### Test Multiple File Changes

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/owner/repo \
  "Update all API endpoints to include rate limiting"
```

## Integration with Your Development Environment

### Using a Test Repository

Create a dedicated test repository for local testing:

```bash
# Create a test repo
mkdir test-repo
cd test-repo
git init
echo "# Test Repo" > README.md
git add README.md
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/test-repo.git
git push -u origin main

# Now test against it
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/test-repo \
  "Update README.md" \
  --skip-pr
```

### Keeping Workspace for Debugging

Use `--keep-workspace` to preserve the workspace directory:

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/owner/repo \
  "Your task" \
  --keep-workspace
```

The workspace will remain at `/tmp/pj-local-test-*` for inspection.

## Comparison: Local vs Production Testing

| Aspect | Local Testing | Production Testing |
|--------|--------------|-------------------|
| **Speed** | ⚡ Instant | 🐌 Requires deployment |
| **Cost** | 💰 Free (API calls only) | 💰 Free (but slower) |
| **Iteration** | 🔄 Fast feedback loop | 🔄 Slow feedback loop |
| **Real Environment** | ❌ Local environment | ✅ Production environment |
| **Webhooks** | ⚠️ Optional (can mock) | ✅ Real webhooks |
| **PR Creation** | ✅ Can test | ✅ Real PRs |

**Recommendation:** Use local testing for development and debugging, then verify in production before marking as complete.

## Next Steps

1. **Set up a test repository** for quick iteration
2. **Create a simple test task** (e.g., "Update README.md")
3. **Run local tests** to verify fixes
4. **Deploy to production** once local tests pass
5. **Monitor production** for any edge cases

## Related Scripts

- `scripts/test-patch-generation.sh` - Test patch generation only
- `scripts/test-task-execution-local.sh` - Test full execution flow
- `daytona/execution.sh` - The actual execution script (runs in Daytona)

## Tips

1. **Start simple**: Test with "Update README.md" before complex tasks
2. **Use --skip-pr**: Faster iteration when you don't need PRs
3. **Check logs**: Always review execution logs for detailed errors
4. **Test incrementally**: Fix one issue at a time
5. **Keep backups**: The test script creates backups automatically

