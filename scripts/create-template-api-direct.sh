#!/bin/bash
# Create Daytona template directly via API

set -e

echo "=========================================="
echo "Creating Daytona Template via API"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env.local ]; then
  # Source only DAYTONA variables to avoid issues with special characters
  export DAYTONA_API_KEY=$(grep "^DAYTONA_API_KEY=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
  export DAYTONA_API_URL=$(grep "^DAYTONA_API_URL=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
fi

DAYTONA_API_URL="${DAYTONA_API_URL:-https://app.daytona.io/api}"

if [ -z "$DAYTONA_API_KEY" ] || [ "$DAYTONA_API_KEY" = "your_daytona_key" ] || [ -z "$DAYTONA_API_KEY" ]; then
  echo "❌ DAYTONA_API_KEY not found in .env.local"
  echo ""
  echo "Please add to .env.local:"
  echo "  DAYTONA_API_KEY=your-actual-key"
  echo ""
  echo "Or install Daytona CLI and run:"
  echo "  daytona workspace-template add"
  exit 1
fi

IMAGE_NAME="butlerjake/pithy-jaunt-daytona:latest"

echo "Template Configuration:"
echo "  Name: pithy-jaunt-dev"
echo "  Repository: https://github.com/daytonaio-templates/blank"
echo "  Image: ${IMAGE_NAME}"
echo "  API URL: ${DAYTONA_API_URL}"
echo ""

TEMPLATE_PAYLOAD=$(cat <<EOF
{
  "name": "pithy-jaunt-dev",
  "repositoryUrl": "https://github.com/daytonaio-templates/blank",
  "image": "${IMAGE_NAME}",
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
  -d "${TEMPLATE_PAYLOAD}" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP ${HTTP_CODE}):"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Template created successfully!"
  echo ""
  echo "Template 'pithy-jaunt-dev' is now ready to use."
  exit 0
elif [ "$HTTP_CODE" -eq 409 ]; then
  echo "⚠️  Template already exists (HTTP 409)"
  echo "This is okay - the template is ready to use!"
  exit 0
elif [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 403 ]; then
  echo "❌ Authentication failed (HTTP ${HTTP_CODE})"
  echo "Please check your DAYTONA_API_KEY in .env.local"
  exit 1
elif [ "$HTTP_CODE" -eq 404 ]; then
  echo "❌ API endpoint not found (HTTP 404)"
  echo ""
  echo "The /workspace-template endpoint may not be available in your Daytona deployment."
  echo ""
  echo "Please install Daytona CLI and create the template manually:"
  echo ""
  echo "  1. Install CLI: https://www.daytona.io/docs/installation"
  echo "  2. Run: daytona workspace-template add"
  echo "  3. When prompted:"
  echo "     - Repository: https://github.com/daytonaio-templates/blank"
  echo "     - Name: pithy-jaunt-dev"
  echo "     - Build: Custom image"
  echo "     - Image: ${IMAGE_NAME}"
  echo "     - User: daytona"
  exit 1
else
  echo "❌ Failed to create template (HTTP ${HTTP_CODE})"
  exit 1
fi

