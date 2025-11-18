# Production Testing Guide

This guide explains how to test task execution in production using the automated test scripts.

## Overview

The production test scripts allow you to:
1. Create tasks in production
2. Execute them automatically
3. Wait for completion
4. Verify PR creation
5. Test multiple scenarios automatically

This enables faster iteration on fixes without manual testing.

## Prerequisites

1. **Supabase Access Token**: You need a valid Supabase access token for authentication
   
   **⚠️ Important**: The cookie value is NOT the same as the Bearer token. You need the JWT `access_token` from the session.
   
   **Easiest method - Local Storage**:
   1. Open DevTools → Application tab (Chrome) or Storage tab (Firefox)
   2. In left sidebar: Local Storage → your app domain
   3. Find key like `sb-<project-id>-auth-token`
   4. The value is JSON - look for `access_token` field
   5. Copy that value (it's a JWT like `eyJhbGc...`)
   
   **Alternative - Extract from Cookie**:
   1. Open DevTools → Network tab
   2. Make a request (e.g., load repos page)
   3. Find request → Headers → Cookie
   4. Copy the value of `sb-<project-id>-auth-token` (everything after `=`)
   5. Run: `./scripts/extract-token-from-cookie.sh "<cookie-value>"`
   6. It will decode and extract the `access_token` for you
   
   **Alternative - Browser Console**:
   ```javascript
   // Check localStorage directly
   const storageKey = Object.keys(localStorage).find(k => k.includes('auth-token'))
   if (storageKey) {
     const session = JSON.parse(localStorage.getItem(storageKey))
     console.log('Access Token:', session?.access_token)
   }
   ```
   
   **Helper scripts**: 
   - Run `./scripts/get-supabase-token.sh` for detailed instructions
   - Run `./scripts/extract-token-from-cookie.sh <cookie-value>` to extract from cookie
   
   Once you have the token:
   ```bash
   export SUPABASE_ACCESS_TOKEN="eyJhbGc..."  # Your actual token
   ```

2. **Repository**: The repository must be connected in the production app
   - Connect it via the UI first, or
   - Use `--repo-id` if you know the repository ID

## Scripts

### `test-task-execution-prod.sh`

Tests a single task execution in production.

**Usage:**
```bash
./scripts/test-task-execution-prod.sh [options]
```

**Options:**
- `--scenario <name>` - Test scenario: `simple`, `medium`, or `complex` (default: `simple`)
- `--repo-url <url>` - GitHub repository URL (required if `--repo-id` not provided)
- `--repo-id <id>` - Repository ID from database (required if `--repo-url` not provided)
- `--title <title>` - Custom task title (optional)
- `--description <desc>` - Custom task description (optional)
- `--provider <name>` - Model provider: `openai`, `anthropic`, or `openrouter` (default: `openrouter`)
- `--model <name>` - Model name (default: `moonshotai/kimi-k2-0905`)
- `--prod-url <url>` - Production URL (default: `https://pithy-jaunt.vercel.app`)
- `--max-wait <seconds>` - Maximum wait time for task completion (default: 600)
- `--poll-interval <sec>` - Polling interval in seconds (default: 5)
- `--skip-pr-check` - Skip PR URL verification
- `--verbose` - Enable verbose output

**Examples:**
```bash
# Test simple scenario
export SUPABASE_ACCESS_TOKEN="your-token"
./scripts/test-task-execution-prod.sh \
  --scenario simple \
  --repo-url https://github.com/owner/repo

# Test with custom task
./scripts/test-task-execution-prod.sh \
  --repo-url https://github.com/owner/repo \
  --title "Add feature" \
  --description "Add new feature X"

# Test with OpenAI
./scripts/test-task-execution-prod.sh \
  --scenario medium \
  --repo-url https://github.com/owner/repo \
  --provider openai \
  --model gpt-4o
```

### `test-all-scenarios-prod.sh`

Runs all test scenarios sequentially and reports results.

**Usage:**
```bash
./scripts/test-all-scenarios-prod.sh [options]
```

**Options:**
- Same as `test-task-execution-prod.sh` (except `--scenario` which is not used)

**Example:**
```bash
export SUPABASE_ACCESS_TOKEN="your-token"
./scripts/test-all-scenarios-prod.sh \
  --repo-url https://github.com/owner/repo
```

## Test Scenarios

### Simple
- **Task**: Update the README.md file to add a 'Testing' section
- **Expected**: Single file modification, straightforward change

### Medium
- **Task**: Add a new file called CONTRIBUTING.md with guidelines
- **Expected**: New file creation, multiple sections

### Complex
- **Task**: Create a new API endpoint /api/health with JSON response
- **Expected**: Multiple file modifications, code changes, error handling

## Workflow

### 1. Implement Fix

Make your code changes locally and test them if possible.

### 2. Push to Production

```bash
git add .
git commit -m "Fix: description of fix"
git push origin main
```

### 3. Monitor Vercel Build

- Go to Vercel dashboard
- Monitor the build (usually takes ~90 seconds)
- Wait for successful deployment

### 4. Run Production Tests

```bash
# Test a single scenario
./scripts/test-task-execution-prod.sh \
  --scenario simple \
  --repo-url https://github.com/owner/repo

# Or test all scenarios
./scripts/test-all-scenarios-prod.sh \
  --repo-url https://github.com/owner/repo
```

### 5. Iterate

If tests fail:
1. Check the error messages
2. Fix the issue
3. Push again
4. Re-run tests

## Environment Variables

Set these before running tests:

```bash
export SUPABASE_ACCESS_TOKEN="your-token-here"
export PROD_URL="https://pithy-jaunt.vercel.app"  # Optional, has default
export MODEL_PROVIDER="openrouter"  # Optional, has default
export MODEL="moonshotai/kimi-k2-0905"  # Optional, has default
```

## Troubleshooting

### Authentication Errors

If you get 401 Unauthorized:
- Check that `SUPABASE_ACCESS_TOKEN` is set correctly
- Token may have expired - get a new one from browser dev tools
- Make sure you're using the production token, not local

### Repository Not Found

If you get "Repository not found":
- Connect the repository in the production UI first
- Or use `--repo-id` if you know the ID
- Check that the repository URL is correct

### Task Execution Fails

If task execution fails:
- Check the task status in the production UI
- Look at the error message in the script output
- Check Vercel logs for server-side errors
- Verify Daytona is configured correctly

### Timeout

If tests timeout:
- Increase `--max-wait` (default is 600 seconds / 10 minutes)
- Check if tasks are actually running in production
- Verify Daytona workspaces are being created

## Tips

1. **Start with simple scenario**: Test the simple scenario first to verify basic functionality
2. **Use verbose mode**: Add `--verbose` to see detailed API requests/responses
3. **Check PRs**: After tests pass, verify the PRs were created correctly on GitHub
4. **Monitor logs**: Keep Vercel logs open to see real-time errors
5. **Test incrementally**: After each fix, test one scenario before running all

## Integration with CI/CD

You can integrate these scripts into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Test Production
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  run: |
    ./scripts/test-task-execution-prod.sh \
      --scenario simple \
      --repo-url ${{ secrets.TEST_REPO_URL }}
```

