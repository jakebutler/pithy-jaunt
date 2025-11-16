#!/bin/bash
# Script to create Daytona workspace template via API
# Based on: https://docs.app.codeanywhere.com/configuration/templates/

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

echo "Creating Daytona workspace template: pithy-jaunt-dev"
echo "API URL: ${DAYTONA_API_URL}"
echo "Image: ${DOCKER_IMAGE}"
echo ""

# Workspace template structure based on Daytona API documentation
# Template needs a repositoryUrl, but we'll use a placeholder that gets overridden
# The actual repo is specified when creating the workspace
TEMPLATE_PAYLOAD=$(cat <<EOF
{
  "name": "pithy-jaunt-dev",
  "repositoryUrl": "https://github.com/daytonaio-templates/blank",
  "image": "${DOCKER_IMAGE}",
  "buildConfig": {
    "type": "custom-image"
  },
  "envVars": {},
  "user": "daytona",
  "default": false
}
EOF
)

echo "Sending request to Daytona API..."
echo "Endpoint: PUT ${DAYTONA_API_URL}/workspace-template"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${DAYTONA_API_URL}/workspace-template" \
  -H "Authorization: Bearer ${DAYTONA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${TEMPLATE_PAYLOAD}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Template created successfully!"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 403 ]; then
  echo "❌ Authentication failed (HTTP ${HTTP_CODE})"
  echo "Please check your DAYTONA_API_KEY"
  echo ""
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
else
  echo "❌ Failed to create template (HTTP ${HTTP_CODE})"
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "Note: If this fails, you may need to use the CLI:"
  echo "  daytona workspace-template add"
  exit 1
fi

