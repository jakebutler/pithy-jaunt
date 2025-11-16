#!/bin/bash
# Script to fix Docker push issues

set -e

echo "=========================================="
echo "Fixing Docker Push Issues"
echo "=========================================="
echo ""

IMAGE_NAME="butlerjake/pithy-jaunt-daytona:latest"

# Step 1: Check if logged in
echo "Step 1: Checking Docker login status..."
if docker info 2>/dev/null | grep -q "Username:"; then
  USERNAME=$(docker info 2>/dev/null | grep "Username:" | awk '{print $2}')
  echo "✅ Logged in as: $USERNAME"
else
  echo "❌ Not logged into Docker Hub"
  echo ""
  echo "Please login:"
  echo "  docker login"
  echo ""
  read -p "Press Enter after logging in, or Ctrl+C to cancel..."
fi

# Step 2: Verify image exists locally
echo ""
echo "Step 2: Verifying local image..."
if docker images | grep -q "butlerjake/pithy-jaunt-daytona.*latest"; then
  echo "✅ Image found locally"
  docker images | grep "butlerjake/pithy-jaunt-daytona"
else
  echo "❌ Image not found. Building it first..."
  cd daytona
  docker build -t butlerjake/pithy-jaunt-daytona:latest -f Dockerfile ..
  cd ..
fi

# Step 3: Try pushing
echo ""
echo "Step 3: Pushing image to Docker Hub..."
echo "This may take a few minutes (957MB)..."
echo ""

if docker push "$IMAGE_NAME" 2>&1 | tee /tmp/docker-push.log; then
  echo ""
  echo "✅ Successfully pushed: $IMAGE_NAME"
  echo ""
  echo "You can verify at: https://hub.docker.com/r/butlerjake/pithy-jaunt-daytona"
else
  echo ""
  echo "❌ Push failed. Checking error..."
  
  if grep -q "unauthorized\|authentication required" /tmp/docker-push.log; then
    echo ""
    echo "Authentication issue. Please run:"
    echo "  docker login"
    echo "  docker push $IMAGE_NAME"
  elif grep -q "repository does not exist" /tmp/docker-push.log; then
    echo ""
    echo "Repository doesn't exist. Docker Hub will create it automatically."
    echo "Make sure you're logged in and try again:"
    echo "  docker login"
    echo "  docker push $IMAGE_NAME"
  else
    echo ""
    echo "Unknown error. Full log:"
    cat /tmp/docker-push.log
  fi
  exit 1
fi

