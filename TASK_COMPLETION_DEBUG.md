# Task Completion Debugging Guide

## Current Issue

Tasks are not completing successfully. Common symptoms:
- Task status stuck at "running"
- Workspace status stuck at "creating"
- No execution logs (0 entries)
- No PR URL
- No webhooks received

## Root Cause Analysis

### Most Likely Issues

1. **Webhook URL Not Accessible**
   - `WEBHOOK_URL` is set to `http://localhost:3000` instead of production URL
   - Production URL not publicly accessible
   - Webhook endpoint returning errors

2. **Workspace Not Running Execution Script**
   - Workspace stuck in "creating" state
   - Init script not configured correctly
   - Execution script failing silently

3. **Execution Script Failing**
   - API keys not set correctly
   - GitHub token missing or invalid
   - Script errors not being caught

## Diagnostic Steps

### Step 1: Check Webhook URL

The webhook URL is constructed from `NEXT_PUBLIC_APP_URL`:

```typescript
WEBHOOK_URL: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhook/daytona`
```

**Verify in Vercel:**
1. Go to Settings → Environment Variables
2. Check `NEXT_PUBLIC_APP_URL` is set to your production URL
3. Should be: `https://pithy-jaunt.vercel.app` (or your actual URL)
4. **NOT** `http://localhost:3000`

### Step 2: Test Webhook Endpoint

Test if the webhook endpoint is accessible:

```bash
curl -X POST https://pithy-jaunt.vercel.app/api/webhook/daytona \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task.completed",
    "taskId": "test-123",
    "workspaceId": "test-ws",
    "status": "success",
    "prUrl": "https://github.com/test/test/pull/1"
  }'
```

Should return: `{"status":"ok"}`

### Step 3: Check Vercel Logs

1. Go to Vercel → Deployments → Latest → Logs
2. Filter for: `[Daytona Webhook]`
3. Look for webhook requests
4. Check for any errors

### Step 4: Check Daytona Workspace

1. Go to https://app.daytona.io
2. Find the workspace for your task
3. Check:
   - Is it actually running?
   - Are there logs visible?
   - What's the current state?

### Step 5: Check GitHub

1. Go to your repository
2. Check for branch: `pj/j971rfx4y4ddy07hmevyqg2ms97vhs5x`
3. Check for any PRs created

## Monitoring Current Task

Task ID: `j971rfx4y4ddy07hmevyqg2ms97vhs5x`

Run the monitoring script:
```bash
./scripts/monitor-task.sh j971rfx4y4ddy07hmevyqg2ms97vhs5x 5
```

This will check the task status every 5 seconds and show:
- Current status
- Workspace ID
- Branch name
- PR URL (if created)
- Execution logs count
- Any errors

## Expected Flow

1. ✅ Task execution starts → Status: `running`
2. ✅ Workspace created in Daytona → Workspace status: `creating`
3. ⚠️  Workspace starts → Workspace status: `running` (may be stuck here)
4. ⚠️  Execution script runs → Should send webhooks
5. ⚠️  PR created → Task status: `completed`
6. ⚠️  Webhook received → Logs stored in Convex

## Common Failure Points

### Point 1: Workspace Stuck in "creating"
- **Symptom**: Workspace status never changes to "running"
- **Cause**: Daytona workspace creation failed
- **Fix**: Check Daytona dashboard, verify snapshot/template exists

### Point 2: No Webhooks Received
- **Symptom**: 0 execution logs, task stuck at "running"
- **Cause**: `WEBHOOK_URL` incorrect or not accessible
- **Fix**: Verify `NEXT_PUBLIC_APP_URL` in Vercel, test webhook endpoint

### Point 3: Execution Script Fails
- **Symptom**: Workspace runs but no PR created
- **Cause**: Script errors (API keys, GitHub token, etc.)
- **Fix**: Check Daytona workspace logs, verify environment variables

### Point 4: Webhook Handler Errors
- **Symptom**: Webhooks received but task not updated
- **Cause**: Webhook handler errors (Convex, validation, etc.)
- **Fix**: Check Vercel logs for webhook handler errors

## Quick Fixes

### Fix 1: Update Webhook URL

If `NEXT_PUBLIC_APP_URL` is wrong:

1. Go to Vercel → Settings → Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` to your production URL
3. Redeploy

### Fix 2: Manually Sync Task Status

Use the sync endpoint to check actual workspace status:

```bash
POST /api/task/j971rfx4y4ddy07hmevyqg2ms97vhs5x/sync-status
```

This will:
- Check Daytona workspace status
- Update task if workspace is terminated
- Return current status

### Fix 3: Cancel Stuck Task

If task is definitely stuck:

```bash
POST /api/task/j971rfx4y4ddy07hmevyqg2ms97vhs5x/cancel
```

## Next Steps

1. ✅ Monitor current task with monitoring script
2. ⚠️  Check Vercel logs for webhook activity
3. ⚠️  Check Daytona dashboard for workspace status
4. ⚠️  Verify `NEXT_PUBLIC_APP_URL` is correct
5. ⚠️  Test webhook endpoint manually
6. ⚠️  Check GitHub for branch/PR

## Success Criteria

Task is successful when:
- ✅ Task status: `completed`
- ✅ PR URL is set
- ✅ Execution logs exist
- ✅ Workspace status: `stopped` or `terminated`
- ✅ Branch exists in GitHub
- ✅ PR created in GitHub

