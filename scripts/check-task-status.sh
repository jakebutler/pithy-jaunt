#!/bin/bash
# Check task status and workspace info

set -e

TASK_ID="j970zm6efbftkd32t1yy87tq7d7vh3kt"

echo "Checking task status for: $TASK_ID"
echo ""

# Check if we can query Convex directly
if command -v npx &> /dev/null; then
  echo "Checking Convex database..."
  echo ""
  
  # Try to get task info via Convex
  echo "Task ID: $TASK_ID"
  echo ""
  echo "To check task status, you can:"
  echo "1. Go to your app: http://localhost:3000/tasks/$TASK_ID"
  echo "2. Check Convex dashboard for task status"
  echo "3. Check application console for logs"
fi

echo ""
echo "Checking for webhook activity..."
echo "Look for these in your Next.js console:"
echo "  - [Daytona Webhook] Received webhook"
echo "  - [Daytona] Creating workspace"
echo "  - [Daytona] API error"
echo ""

echo "Checking GitHub for branch..."
echo "Branch should be: pj/$TASK_ID"
echo ""

echo "If task is stuck, possible issues:"
echo "1. AI agent call taking too long (can take 2-5 minutes)"
echo "2. Webhook URL not accessible from Daytona"
echo "3. API keys not set correctly"
echo "4. Script crashed before creating branch"

