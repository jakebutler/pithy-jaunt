#!/bin/bash
# Complete automated setup for Daytona - pushes image and creates template

set -e

echo "=========================================="
echo "Pithy Jaunt - Complete Daytona Setup"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env.local ]; then
  echo "Loading environment from .env.local..."
  export $(grep -v '^#' .env.local | xargs)
fi

# Step 1: Push Docker Image
echo ""
echo "Step 1: Pushing Docker image..."
echo "----------------------------------------"

IMAGE_NAME="butlerjake/pithy-jaunt-daytona:latest"

# Check if already pushed by trying to pull
if docker pull "$IMAGE_NAME" &>/dev/null; then
  echo "✅ Image already exists in registry: $IMAGE_NAME"
  DOCKER_IMAGE="$IMAGE_NAME"
else
  echo "Pushing image to Docker Hub..."
  if docker push "$IMAGE_NAME" 2>&1; then
    echo "✅ Image pushed successfully: $IMAGE_NAME"
    DOCKER_IMAGE="$IMAGE_NAME"
  else
    echo "⚠️  Failed to push image. You may need to:"
    echo "   1. Run: docker login"
    echo "   2. Then run this script again"
    echo ""
    echo "For now, continuing with template creation..."
    echo "You'll need to push the image manually before using the template."
    DOCKER_IMAGE="$IMAGE_NAME"
  fi
fi

# Step 2: Create Template via API
echo ""
echo "Step 2: Creating Daytona template via API..."
echo "----------------------------------------"

if [ -z "$DAYTONA_API_KEY" ] || [ "$DAYTONA_API_KEY" = "your_daytona_key" ]; then
  echo "⚠️  DAYTONA_API_KEY not configured"
  echo ""
  echo "Please set it in .env.local:"
  echo "  DAYTONA_API_KEY=your-actual-key"
  echo ""
  echo "Then run this script again, or use the CLI method:"
  echo "  ./scripts/create-daytona-template-cli.sh"
  exit 1
fi

DAYTONA_API_URL="${DAYTONA_API_URL:-https://app.daytona.io/api}"

# Try API method first
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

echo "Attempting to create template via API..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${DAYTONA_API_URL}/workspace-template" \
  -H "Authorization: Bearer ${DAYTONA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${TEMPLATE_PAYLOAD}" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Template created successfully via API!"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 403 ]; then
  echo "❌ Authentication failed (HTTP ${HTTP_CODE})"
  echo "Please check your DAYTONA_API_KEY"
  exit 1
else
  echo "⚠️  API method failed (HTTP ${HTTP_CODE})"
  echo "Response: $BODY"
  echo ""
  echo "Trying CLI method instead..."
  
  # Try CLI if available
  if command -v daytona &> /dev/null; then
    echo ""
    echo "Using Daytona CLI to create template..."
    echo "This requires interactive input. Run manually:"
    echo ""
    echo "  daytona workspace-template add"
    echo ""
    echo "When prompted:"
    echo "  Repository: https://github.com/daytonaio-templates/blank"
    echo "  Name: pithy-jaunt-dev"
    echo "  Build: Custom image"
    echo "  Image: ${DOCKER_IMAGE}"
    echo "  User: daytona"
    echo ""
  else
    echo ""
    echo "Daytona CLI not found. Please create template manually:"
    echo ""
    echo "Option 1: Use Daytona Dashboard"
    echo "  1. Go to: https://app.daytona.io"
    echo "  2. Navigate to Templates section"
    echo "  3. Create new template with:"
    echo "     - Name: pithy-jaunt-dev"
    echo "     - Repository: https://github.com/daytonaio-templates/blank"
    echo "     - Build: Custom image"
    echo "     - Image: ${DOCKER_IMAGE}"
    echo ""
    echo "Option 2: Install Daytona CLI and run:"
    echo "  daytona workspace-template add"
    echo ""
  fi
fi

echo ""
echo "=========================================="
echo "Setup Summary"
echo "=========================================="
echo "Docker Image: ${DOCKER_IMAGE}"
echo "Template Name: pithy-jaunt-dev"
echo ""
echo "Next steps:"
echo "1. Verify template exists: Check Daytona dashboard or run 'daytona workspace-template list'"
echo "2. Test workspace creation in your application"
echo ""

