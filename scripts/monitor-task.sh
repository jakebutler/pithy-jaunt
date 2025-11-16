#!/bin/bash
# Monitor a task and check its status periodically
# Usage: ./scripts/monitor-task.sh <taskId> [interval_seconds]

TASK_ID="${1:-j971rfx4y4ddy07hmevyqg2ms97vhs5x}"
INTERVAL="${2:-10}"

if [ -f .env.local ]; then
  source .env.local
fi

if [ -z "$NEXT_PUBLIC_CONVEX_URL" ]; then
  echo "❌ NEXT_PUBLIC_CONVEX_URL not set"
  exit 1
fi

echo "🔍 Monitoring task: $TASK_ID"
echo "⏱️  Check interval: $INTERVAL seconds"
echo "Press Ctrl+C to stop"
echo ""

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$TIMESTAMP] Checking task status..."
  
  # Get task info
  TASK_INFO=$(npx tsx -e "
import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const taskId = '$TASK_ID';

async function getTask() {
  try {
    const task = await client.query(api.tasks.getTaskById, { taskId });
    if (!task) {
      console.log('TASK_NOT_FOUND');
      process.exit(1);
    }
    
    const now = Date.now();
    const age = Math.floor((now - task.updatedAt) / 1000 / 60);
    
    console.log(JSON.stringify({
      status: task.status,
      workspaceId: task.assignedWorkspaceId || null,
      branchName: task.branchName || null,
      prUrl: task.prUrl || null,
      ageMinutes: age,
      updatedAt: task.updatedAt,
      createdAt: task.createdAt
    }));
  } catch (error: any) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

getTask();
" 2>&1)

  if [ $? -ne 0 ]; then
    echo "❌ Error fetching task: $TASK_INFO"
    sleep $INTERVAL
    continue
  fi

  STATUS=$(echo "$TASK_INFO" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  WORKSPACE_ID=$(echo "$TASK_INFO" | grep -o '"workspaceId":"[^"]*"' | cut -d'"' -f4)
  BRANCH=$(echo "$TASK_INFO" | grep -o '"branchName":"[^"]*"' | cut -d'"' -f4)
  PR_URL=$(echo "$TASK_INFO" | grep -o '"prUrl":"[^"]*"' | cut -d'"' -f4)
  AGE=$(echo "$TASK_INFO" | grep -o '"ageMinutes":[0-9]*' | cut -d':' -f2)

  echo "  Status: $STATUS"
  echo "  Age: ${AGE} minutes"
  
  if [ -n "$WORKSPACE_ID" ]; then
    echo "  Workspace: $WORKSPACE_ID"
  fi
  
  if [ -n "$BRANCH" ]; then
    echo "  Branch: $BRANCH"
  fi
  
  if [ -n "$PR_URL" ]; then
    echo "  ✅ PR: $PR_URL"
  fi

  # Check execution logs
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
      error: latest.error || null
    }));
  }
}

getLogs();
" 2>&1 | head -1)

  if [ -n "$LOG_COUNT" ] && [ "$LOG_COUNT" != "0" ]; then
    echo "  Logs: $LOG_COUNT entries"
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
      error: latest.error || null
    }));
  }
}

getLogs();
" 2>&1 | tail -1)
    
    LOG_STATUS=$(echo "$LATEST_LOG" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    HAS_ERROR=$(echo "$LATEST_LOG" | grep -o '"hasError":[^,}]*' | cut -d':' -f2)
    
    if [ "$HAS_ERROR" = "true" ]; then
      ERROR=$(echo "$LATEST_LOG" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
      echo "  ⚠️  Latest log has error: $ERROR"
    else
      echo "  Latest log status: $LOG_STATUS"
    fi
  else
    echo "  Logs: 0 entries (no webhooks received yet)"
  fi

  # Check if completed or failed
  if [ "$STATUS" = "completed" ]; then
    echo ""
    echo "✅ Task completed successfully!"
    if [ -n "$PR_URL" ]; then
      echo "   PR: $PR_URL"
    fi
    exit 0
  elif [ "$STATUS" = "failed" ] || [ "$STATUS" = "needs_review" ]; then
    echo ""
    echo "⚠️  Task finished with status: $STATUS"
    exit 0
  elif [ "$STATUS" = "running" ] && [ -n "$AGE" ] && [ "$AGE" -gt 30 ]; then
    echo "  ⚠️  WARNING: Task has been running for ${AGE} minutes (may be stuck)"
  fi

  echo ""
  sleep $INTERVAL
done

