#!/bin/bash
# Automatically create Daytona template via CLI using expect-like approach

set -e

echo "=========================================="
echo "Creating Daytona Template via CLI"
echo "=========================================="
echo ""

if ! command -v daytona &> /dev/null; then
  echo "❌ Daytona CLI not found"
  echo ""
  echo "Please install it from: https://www.daytona.io/docs/installation"
  exit 1
fi

echo "✅ Daytona CLI found"
echo ""

# Check if authenticated
if ! daytona target list &> /dev/null; then
  echo "❌ Not authenticated with Daytona"
  echo "Please run: daytona auth login"
  exit 1
fi

echo "✅ Authenticated with Daytona"
echo ""

IMAGE_NAME="butlerjake/pithy-jaunt-daytona:latest"

echo "Template Configuration:"
echo "  Name: pithy-jaunt-dev"
echo "  Repository: https://github.com/daytonaio-templates/blank"
echo "  Image: ${IMAGE_NAME}"
echo "  Build: Custom image"
echo "  User: daytona"
echo ""

# Try to create template using API first (if available)
if [ -f .env.local ]; then
  source <(grep -v '^#' .env.local | grep DAYTONA_API_KEY | sed 's/^/export /')
fi

if [ -n "$DAYTONA_API_KEY" ] && [ "$DAYTONA_API_KEY" != "your_daytona_key" ]; then
  DAYTONA_API_URL="${DAYTONA_API_URL:-https://app.daytona.io/api}"
  
  echo "Attempting to create template via API..."
  
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
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${DAYTONA_API_URL}/workspace-template" \
    -H "Authorization: Bearer ${DAYTONA_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "${TEMPLATE_PAYLOAD}" 2>&1)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Template created successfully via API!"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 0
  elif [ "$HTTP_CODE" -eq 409 ]; then
    echo "⚠️  Template already exists (this is okay)"
    echo "Template is ready to use!"
    exit 0
  else
    echo "⚠️  API method failed (HTTP ${HTTP_CODE}), trying CLI..."
    echo ""
  fi
fi

# Fall back to CLI method
echo "Creating template via interactive CLI..."
echo ""
echo "The CLI will prompt you for:"
echo "  1. Repository: https://github.com/daytonaio-templates/blank"
echo "  2. Name: pithy-jaunt-dev"
echo "  3. Build: Select 'Custom image'"
echo "  4. Image: ${IMAGE_NAME}"
echo "  5. User: daytona"
echo ""

# Use printf to send input to the interactive command
# Note: This may not work perfectly if the CLI has complex prompts
printf "https://github.com/daytonaio-templates/blank\npithy-jaunt-dev\nCustom image\n${IMAGE_NAME}\ndaytona\n" | daytona workspace-template add 2>&1 || {
  echo ""
  echo "⚠️  Automated CLI input failed. Please run manually:"
  echo ""
  echo "  daytona workspace-template add"
  echo ""
  echo "When prompted, enter:"
  echo "  Repository: https://github.com/daytonaio-templates/blank"
  echo "  Name: pithy-jaunt-dev"
  echo "  Build: Custom image"
  echo "  Image: ${IMAGE_NAME}"
  echo "  User: daytona"
  exit 1
}

echo ""
echo "✅ Template creation completed!"
echo ""
echo "Verify with: daytona workspace-template list"

