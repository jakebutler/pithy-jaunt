#!/bin/bash
# Manually complete a task by simulating the Daytona webhook
# Usage: ./scripts/complete-task-manually.sh <taskId> <prUrl>

TASK_ID=${1:-"j973ex5dm70x3trfdzav9bmp7d7vhrtn"}
PR_URL=${2:-"https://github.com/jakebutler/pithy-jaunt/pull/1"}

echo "🔧 Manually completing task..."
echo "Task ID: $TASK_ID"
echo "PR URL: $PR_URL"
echo ""

# Get task details to find workspace ID
TASK_DATA=$(curl -s http://localhost:3000/api/debug/task/$TASK_ID)
WORKSPACE_ID=$(echo "$TASK_DATA" | grep -o '"assignedWorkspaceId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$WORKSPACE_ID" ]; then
  echo "❌ Could not find workspace ID for task"
  exit 1
fi

echo "Workspace ID: $WORKSPACE_ID"
echo ""

# Send completion webhook
echo "Sending webhook..."
curl -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"taskId\": \"$TASK_ID\",
    \"workspaceId\": \"$WORKSPACE_ID\",
    \"prUrl\": \"$PR_URL\",
    \"status\": \"success\"
  }" \
  http://localhost:3000/api/debug/webhook-test

echo ""
echo ""
echo "✅ Task completion triggered!"
echo "Refresh the task page to see the PR link"

