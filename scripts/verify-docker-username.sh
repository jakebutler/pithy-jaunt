#!/bin/bash
# Verify Docker Hub username and fix tag if needed

echo "=========================================="
echo "Docker Hub Username Verification"
echo "=========================================="
echo ""

# The error "insufficient_scope" usually means the image tag username
# doesn't match your Docker Hub username

echo "The image is currently tagged as: butlerjake/pithy-jaunt-daytona:latest"
echo ""
echo "If 'butlerjake' is NOT your Docker Hub username, we need to retag it."
echo ""

read -p "What is your Docker Hub username? (or press Enter if it's 'butlerjake'): " DOCKER_USERNAME

if [ -z "$DOCKER_USERNAME" ]; then
  DOCKER_USERNAME="butlerjake"
  echo "Using: butlerjake"
else
  echo "Using: $DOCKER_USERNAME"
fi

echo ""
echo "Retagging image to: ${DOCKER_USERNAME}/pithy-jaunt-daytona:latest"
docker tag butlerjake/pithy-jaunt-daytona:latest ${DOCKER_USERNAME}/pithy-jaunt-daytona:latest

echo ""
echo "Attempting to push..."
if docker push ${DOCKER_USERNAME}/pithy-jaunt-daytona:latest; then
  echo ""
  echo "✅ Successfully pushed: ${DOCKER_USERNAME}/pithy-jaunt-daytona:latest"
  echo ""
  echo "⚠️  IMPORTANT: Update your Daytona template to use:"
  echo "   ${DOCKER_USERNAME}/pithy-jaunt-daytona:latest"
  echo ""
  echo "Or update scripts to use this image name."
else
  echo ""
  echo "❌ Push failed. Possible issues:"
  echo "   1. Wrong username"
  echo "   2. Not logged into Docker Hub (run: docker login)"
  echo "   3. Account doesn't have permission to create repositories"
  exit 1
fi

