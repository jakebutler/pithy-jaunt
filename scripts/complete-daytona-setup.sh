#!/bin/bash
# Complete automated setup - handles everything possible automatically

set -e

echo "=========================================="
echo "Pithy Jaunt - Complete Daytona Setup"
echo "=========================================="
echo ""

# Load environment
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

IMAGE_NAME="butlerjake/pithy-jaunt-daytona:latest"
DAYTONA_API_URL="${DAYTONA_API_URL:-https://app.daytona.io/api}"

# Step 1: Push Docker Image
echo "Step 1: Pushing Docker image..."
echo "----------------------------------------"

# Check if logged in by trying to access Docker Hub
if docker info 2>/dev/null | grep -q "Username:" || docker login --username dummy --password-stdin <<< "dummy" 2>&1 | grep -q "Login Succeeded"; then
  echo "Attempting to push image..."
  if docker push "$IMAGE_NAME" 2>&1 | tee /tmp/docker-push.log; then
    echo "✅ Image pushed successfully!"
  else
    if grep -q "unauthorized\|authentication required" /tmp/docker-push.log; then
      echo "⚠️  Docker login required. Please run:"
      echo "   docker login"
      echo "   docker push $IMAGE_NAME"
    else
      echo "⚠️  Push failed. Check logs above."
    fi
  fi
else
  echo "⚠️  Not logged into Docker Hub"
  echo "   Please run: docker login"
  echo "   Then: docker push $IMAGE_NAME"
fi

# Step 2: Create Template
echo ""
echo "Step 2: Creating Daytona template..."
echo "----------------------------------------"

if [ -z "$DAYTONA_API_KEY" ] || [ "$DAYTONA_API_KEY" = "your_daytona_key" ]; then
  echo "⚠️  DAYTONA_API_KEY not set in .env.local"
  echo ""
  echo "Please add to .env.local:"
  echo "  DAYTONA_API_KEY=your-actual-key"
  echo ""
  echo "Then run this script again."
  exit 1
fi

# Try API method
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

echo "Creating template via API..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${DAYTONA_API_URL}/workspace-template" \
  -H "Authorization: Bearer ${DAYTONA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${TEMPLATE_PAYLOAD}" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Template created successfully!"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "=========================================="
  echo "✅ Setup Complete!"
  echo "=========================================="
  echo "Template: pithy-jaunt-dev"
  echo "Image: ${IMAGE_NAME}"
  echo ""
  echo "You can now test task execution in your application!"
  exit 0
elif [ "$HTTP_CODE" -eq 404 ]; then
  echo "⚠️  API endpoint not found (HTTP 404)"
  echo "The /workspace-template endpoint may not be available."
  echo ""
  echo "Please create the template using Daytona CLI:"
  echo ""
  echo "  daytona workspace-template add"
  echo ""
  echo "When prompted:"
  echo "  Repository: https://github.com/daytonaio-templates/blank"
  echo "  Name: pithy-jaunt-dev"
  echo "  Build: Custom image"
  echo "  Image: ${IMAGE_NAME}"
  echo "  User: daytona"
  exit 1
else
  echo "❌ Failed to create template (HTTP ${HTTP_CODE})"
  echo "Response: $BODY"
  exit 1
fi

