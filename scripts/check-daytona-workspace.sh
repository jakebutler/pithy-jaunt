#!/bin/bash
# Quick script to check if a Daytona workspace exists and its status
# Usage: ./scripts/check-daytona-workspace.sh <workspace_id>

WORKSPACE_ID=$1

if [ -z "$WORKSPACE_ID" ]; then
  echo "Usage: ./scripts/check-daytona-workspace.sh <workspace_id>"
  exit 1
fi

# Load environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

DAYTONA_API_URL=${DAYTONA_API_URL:-http://localhost:3001}

echo "Checking workspace: $WORKSPACE_ID"
echo "Daytona API URL: $DAYTONA_API_URL"
echo ""

if [ -z "$DAYTONA_API_KEY" ]; then
  echo "❌ DAYTONA_API_KEY not set in environment"
  exit 1
fi

echo "Calling: $DAYTONA_API_URL/workspace/$WORKSPACE_ID"
echo ""

curl -v \
  -H "Authorization: Bearer $DAYTONA_API_KEY" \
  "$DAYTONA_API_URL/workspace/$WORKSPACE_ID"

echo ""


