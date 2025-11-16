#!/bin/bash
# Complete setup script for Daytona - pushes image and creates template

set -e

echo "=========================================="
echo "Pithy Jaunt - Daytona Setup"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env.local ]; then
  echo "Loading environment from .env.local..."
  export $(grep -v '^#' .env.local | xargs)
fi

# Step 1: Push Docker Image
echo ""
echo "Step 1: Pushing Docker image to Docker Hub..."
echo "----------------------------------------"

IMAGE_NAME="butlerjake/pithy-jaunt-daytona:latest"

# Check if logged in
if docker info 2>/dev/null | grep -q "Username"; then
  echo "✅ Docker is logged in"
  if docker push "$IMAGE_NAME" 2>&1; then
    echo "✅ Image pushed successfully: $IMAGE_NAME"
    DOCKER_IMAGE="$IMAGE_NAME"
  else
    echo "❌ Failed to push image. Please run: docker login"
    echo "Then run this script again."
    exit 1
  fi
else
  echo "⚠️  Not logged into Docker Hub"
  echo ""
  echo "Please run: docker login"
  echo "Then run this script again, or push manually:"
  echo "  docker push $IMAGE_NAME"
  echo ""
  read -p "Continue with template creation anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
  DOCKER_IMAGE="$IMAGE_NAME"
fi

# Step 2: Create Daytona Template
echo ""
echo "Step 2: Creating Daytona template..."
echo "----------------------------------------"

if [ -z "$DAYTONA_API_KEY" ]; then
  echo "❌ Error: DAYTONA_API_KEY not found"
  echo ""
  echo "Please set it in .env.local:"
  echo "  DAYTONA_API_KEY=your-key"
  exit 1
fi

DAYTONA_API_URL="${DAYTONA_API_URL:-https://app.daytona.io/api}"

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

echo "Creating template: pithy-jaunt-dev"
echo "Image: ${DOCKER_IMAGE}"
echo ""

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
  echo "⚠️  Template already exists (this is okay)"
  echo "Template is ready to use!"
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
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Template Name: pithy-jaunt-dev"
echo "Image: ${DOCKER_IMAGE}"
echo ""
echo "You can now test task execution in your application!"

