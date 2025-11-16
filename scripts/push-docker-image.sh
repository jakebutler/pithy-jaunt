#!/bin/bash
# Script to push Docker image to registry

set -e

IMAGE_NAME="butlerjake/pithy-jaunt-daytona"
IMAGE_TAG="latest"

echo "Pushing Docker image to Docker Hub..."
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"

# Try Docker Hub first
if docker push "${IMAGE_NAME}:${IMAGE_TAG}" 2>&1; then
  echo "✅ Successfully pushed to Docker Hub: ${IMAGE_NAME}:${IMAGE_TAG}"
  echo ""
  echo "Image URL: docker.io/${IMAGE_NAME}:${IMAGE_TAG}"
  exit 0
else
  echo "❌ Failed to push to Docker Hub. You may need to:"
  echo "   1. Run: docker login"
  echo "   2. Then run this script again"
  echo ""
  echo "Or push manually:"
  echo "   docker push ${IMAGE_NAME}:${IMAGE_TAG}"
  exit 1
fi

