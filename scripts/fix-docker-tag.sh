#!/bin/bash
# Fix Docker image tag to match your Docker Hub username

set -e

echo "=========================================="
echo "Fixing Docker Image Tag"
echo "=========================================="
echo ""

# Try to determine username by testing a push
echo "Attempting to determine your Docker Hub username..."
echo ""

# Test push to see the actual error
TEST_OUTPUT=$(docker push butlerjake/pithy-jaunt-daytona:latest 2>&1 || true)

if echo "$TEST_OUTPUT" | grep -q "denied: requested access to the resource is denied"; then
  echo "❌ Push denied - username mismatch detected"
  echo ""
  echo "The image is tagged as 'butlerjake' but that might not be your Docker Hub username."
  echo ""
  read -p "What is your Docker Hub username? " DOCKER_USERNAME
  
  if [ -z "$DOCKER_USERNAME" ]; then
    echo "❌ Username required. Exiting."
    exit 1
  fi
  
  echo ""
  echo "Retagging image to: ${DOCKER_USERNAME}/pithy-jaunt-daytona:latest"
  docker tag butlerjake/pithy-jaunt-daytona:latest ${DOCKER_USERNAME}/pithy-jaunt-daytona:latest
  
  echo ""
  echo "Pushing to Docker Hub..."
  if docker push ${DOCKER_USERNAME}/pithy-jaunt-daytona:latest; then
    echo ""
    echo "✅ Successfully pushed: ${DOCKER_USERNAME}/pithy-jaunt-daytona:latest"
    echo ""
    echo "⚠️  IMPORTANT: Update your template to use this image:"
    echo "   ${DOCKER_USERNAME}/pithy-jaunt-daytona:latest"
    echo ""
    echo "Or update the scripts to use: ${DOCKER_USERNAME}/pithy-jaunt-daytona:latest"
  else
    echo "❌ Push still failed. Please check your Docker Hub credentials."
    exit 1
  fi
elif echo "$TEST_OUTPUT" | grep -q "digest:"; then
  echo "✅ Push successful! Image is already pushed."
elif echo "$TEST_OUTPUT" | grep -q "unauthorized\|authentication"; then
  echo "❌ Authentication issue. Please run: docker login"
  exit 1
else
  echo "Unexpected output:"
  echo "$TEST_OUTPUT"
  exit 1
fi

