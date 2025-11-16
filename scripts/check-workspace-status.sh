#!/bin/bash
# Check Daytona workspace status and logs via API

set -e

if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep DAYTONA | xargs)
fi

DAYTONA_API_URL="${DAYTONA_API_URL:-https://app.daytona.io/api}"

if [ -z "$DAYTONA_API_KEY" ] || [ "$DAYTONA_API_KEY" = "your_daytona_key" ]; then
  echo "❌ DAYTONA_API_KEY not set in .env.local"
  exit 1
fi

if [ -z "$1" ]; then
  echo "Usage: $0 <workspace-id>"
  echo ""
  echo "To find workspace ID, check your application logs or Convex database"
  exit 1
fi

WORKSPACE_ID=$1

echo "Checking workspace status for: $WORKSPACE_ID"
echo "API URL: $DAYTONA_API_URL"
echo ""

# Get workspace status
echo "Fetching workspace status..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${DAYTONA_API_URL}/workspace/${WORKSPACE_ID}" \
  -H "Authorization: Bearer ${DAYTONA_API_KEY}" \
  -H "Content-Type: application/json" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ Workspace Status:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ Failed to get workspace status (HTTP ${HTTP_CODE})"
  echo "$BODY"
fi

echo ""
echo "Note: Daytona may not expose logs via API. Check:"
echo "1. Application logs for webhook updates"
echo "2. Task status in your application"
echo "3. GitHub repository for new branches/PRs"

