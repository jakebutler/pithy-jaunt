#!/bin/bash
# Script to cancel a stuck task via API
# Usage: ./scripts/cancel-task.sh <task_id>

TASK_ID=$1

if [ -z "$TASK_ID" ]; then
  echo "Usage: ./scripts/cancel-task.sh <task_id>"
  exit 1
fi

echo "Canceling task: $TASK_ID"
echo ""

# Call the cancel API endpoint
# This assumes your Next.js app is running on localhost:3000
# You'll need to be logged in with a valid session cookie

curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"terminateWorkspace": false}' \
  -c /tmp/cookies.txt \
  -b /tmp/cookies.txt \
  "http://localhost:3000/api/task/$TASK_ID/cancel"

echo ""
echo ""
echo "Task cancellation requested. Refresh the task page to see updated status."


