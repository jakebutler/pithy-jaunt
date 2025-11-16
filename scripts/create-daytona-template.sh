#!/bin/bash
# Script to create Daytona template via API

set -e

DAYTONA_API_URL="${DAYTONA_API_URL:-https://app.daytona.io/api}"
DAYTONA_API_KEY="${DAYTONA_API_KEY}"

if [ -z "$DAYTONA_API_KEY" ]; then
  echo "❌ Error: DAYTONA_API_KEY environment variable is required"
  echo ""
  echo "Set it in your .env.local or export it:"
  echo "  export DAYTONA_API_KEY=your-key"
  exit 1
fi

# Default image - user can override
DOCKER_IMAGE="${DOCKER_IMAGE:-butlerjake/pithy-jaunt-daytona:latest}"

echo "Creating Daytona template: pithy-jaunt-dev"
echo "API URL: ${DAYTONA_API_URL}"
echo "Image: ${DOCKER_IMAGE}"
echo ""

TEMPLATE_PAYLOAD=$(cat <<EOF
{
  "name": "pithy-jaunt-dev",
  "title": "Pithy Jaunt Development Environment",
  "description": "Template for executing AI agent tasks in isolated Daytona workspaces",
  "image": "${DOCKER_IMAGE}",
  "timeout_minutes": 25,
  "init": ["/app/execution.sh"]
}
EOF
)

echo "Sending request to Daytona API..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${DAYTONA_API_URL}/templates" \
  -H "Authorization: Bearer ${DAYTONA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${TEMPLATE_PAYLOAD}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Template created successfully!"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" -eq 409 ]; then
  echo "⚠️  Template already exists (HTTP 409)"
  echo "This is okay - the template is ready to use!"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ Failed to create template (HTTP ${HTTP_CODE})"
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

