#!/bin/bash
# Check both workspace status in Daytona and task status in Convex
# Usage: ./scripts/check-workspace-and-task.sh <taskId>

TASK_ID="${1:-j9716s3wspb4j7s01fjhbz19217vhztz}"

echo "🔍 Checking task and workspace status"
echo "Task ID: $TASK_ID"
echo ""

# Check if we have the required environment variables
if [ -f .env.local ]; then
  source .env.local
fi

if [ -z "$NEXT_PUBLIC_CONVEX_URL" ]; then
  echo "❌ NEXT_PUBLIC_CONVEX_URL not set"
  exit 1
fi

if [ -z "$DAYTONA_API_KEY" ] || [ -z "$DAYTONA_API_URL" ]; then
  echo "⚠️  Daytona API credentials not set, skipping workspace check"
  CHECK_WORKSPACE=false
else
  CHECK_WORKSPACE=true
fi

# Get task info from Convex
echo "📋 Fetching task from Convex..."
TASK_INFO=$(npx tsx -e "
import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const taskId = '$TASK_ID';

async function getTask() {
  const task = await client.query(api.tasks.getTaskById, { taskId });
  if (!task) {
    console.log('TASK_NOT_FOUND');
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: task.status,
    workspaceId: task.assignedWorkspaceId,
    branchName: task.branchName,
    prUrl: task.prUrl,
    updatedAt: task.updatedAt,
    createdAt: task.createdAt
  }));
}

getTask();
" 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch task from Convex"
  exit 1
fi

TASK_STATUS=$(echo "$TASK_INFO" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
WORKSPACE_ID=$(echo "$TASK_INFO" | grep -o '"workspaceId":"[^"]*"' | cut -d'"' -f4)
UPDATED_AT=$(echo "$TASK_INFO" | grep -o '"updatedAt":[0-9]*' | cut -d':' -f2)

echo "Task Status: $TASK_STATUS"
echo "Workspace ID: $WORKSPACE_ID"
if [ -n "$UPDATED_AT" ]; then
  UPDATED_TIME=$(date -r $(($UPDATED_AT / 1000)) 2>/dev/null || date -d "@$(($UPDATED_AT / 1000))" 2>/dev/null || echo "unknown")
  echo "Last Updated: $UPDATED_TIME"
  
  NOW=$(date +%s)
  AGE_SECONDS=$((NOW - UPDATED_AT / 1000))
  AGE_MINUTES=$((AGE_SECONDS / 60))
  echo "Age: $AGE_MINUTES minutes"
fi
echo ""

# Check workspace in Daytona if credentials are available
if [ "$CHECK_WORKSPACE" = true ] && [ -n "$WORKSPACE_ID" ]; then
  echo "🏗️  Checking workspace in Daytona..."
  echo "Workspace ID: $WORKSPACE_ID"
  echo ""
  
  WORKSPACE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET "${DAYTONA_API_URL}/workspace/${WORKSPACE_ID}" \
    -H "Authorization: Bearer ${DAYTONA_API_KEY}" \
    -H "Content-Type: application/json" 2>&1)
  
  HTTP_CODE=$(echo "$WORKSPACE_RESPONSE" | tail -n1)
  WORKSPACE_BODY=$(echo "$WORKSPACE_RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Workspace found in Daytona:"
    echo "$WORKSPACE_BODY" | jq '.' 2>/dev/null || echo "$WORKSPACE_BODY"
  elif [ "$HTTP_CODE" = "404" ]; then
    echo "⚠️  Workspace not found in Daytona (may have been terminated)"
  else
    echo "❌ Error checking workspace: HTTP $HTTP_CODE"
    echo "$WORKSPACE_BODY"
  fi
  echo ""
fi

# Check execution logs
echo "📝 Checking execution logs..."
LOG_COUNT=$(npx tsx -e "
import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const taskId = '$TASK_ID';

async function getLogs() {
  const logs = await client.query(api.executionLogs.getLogsByTask, { taskId });
  console.log(logs.length);
  if (logs.length > 0) {
    const latest = logs.sort((a, b) => b.createdAt - a.createdAt)[0];
    console.log(JSON.stringify({
      status: latest.status,
      hasError: !!latest.error,
      error: latest.error,
      createdAt: latest.createdAt
    }));
  }
}

getLogs();
" 2>/dev/null | head -1)

if [ -n "$LOG_COUNT" ] && [ "$LOG_COUNT" != "0" ]; then
  echo "Found $LOG_COUNT log entries"
  LATEST_LOG=$(npx tsx -e "
import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const taskId = '$TASK_ID';

async function getLogs() {
  const logs = await client.query(api.executionLogs.getLogsByTask, { taskId });
  if (logs.length > 0) {
    const latest = logs.sort((a, b) => b.createdAt - a.createdAt)[0];
    console.log(JSON.stringify({
      status: latest.status,
      hasError: !!latest.error,
      error: latest.error,
      createdAt: latest.createdAt
    }));
  }
}

getLogs();
" 2>/dev/null | tail -1)
  
  echo "Latest log:"
  echo "$LATEST_LOG" | jq '.' 2>/dev/null || echo "$LATEST_LOG"
else
  echo "No execution logs found"
fi
echo ""

# Recommendations
echo "💡 Recommendations:"
if [ "$TASK_STATUS" = "running" ]; then
  if [ -n "$AGE_MINUTES" ] && [ "$AGE_MINUTES" -gt 10 ]; then
    echo "  ⚠️  Task has been running for $AGE_MINUTES minutes"
    echo "  - Check Daytona dashboard: https://app.daytona.io"
    echo "  - Check Vercel logs for webhook activity"
    echo "  - Consider canceling if workspace is stuck"
  fi
fi

if [ -z "$WORKSPACE_ID" ]; then
  echo "  ⚠️  No workspace assigned to task"
  echo "  - Task may have failed during workspace creation"
fi

if [ "$LOG_COUNT" = "0" ] || [ -z "$LOG_COUNT" ]; then
  echo "  ⚠️  No execution logs found"
  echo "  - Webhook may not have been received"
  echo "  - Check if NEXT_PUBLIC_APP_URL is correct in Vercel"
  echo "  - Check Vercel logs for webhook attempts"
fi

