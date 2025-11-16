#!/bin/bash
# Script to test the Daytona webhook endpoint
# Usage: ./scripts/test-webhook.sh <taskId> <workspaceId> <prUrl>

TASK_ID=${1:-"j971jgm61xe1msf7j4h1bq3fmx7vemnw"}
WORKSPACE_ID=${2:-"02bb3547-e484-4dd0-b3de-82529df08f26"}
PR_URL=${3:-"https://github.com/jakebutler/pithy-jaunt/pull/1"}
BRANCH_NAME="pj/${TASK_ID}"

echo "Testing Daytona webhook..."
echo "Task ID: $TASK_ID"
echo "Workspace ID: $WORKSPACE_ID"
echo "PR URL: $PR_URL"
echo ""

# Test task completion webhook
echo "Sending task.completed webhook..."
curl -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"task.completed\",
    \"workspaceId\": \"$WORKSPACE_ID\",
    \"taskId\": \"$TASK_ID\",
    \"branchName\": \"$BRANCH_NAME\",
    \"prUrl\": \"$PR_URL\",
    \"status\": \"success\"
  }" \
  http://localhost:3000/api/webhook/daytona

echo ""
echo ""
echo "Webhook sent! Check the task page to see if it updated."

