#!/bin/bash
# Script to build and push the Daytona template Docker image

set -e

IMAGE_NAME="pithy-jaunt/daytona"
IMAGE_TAG="${1:-latest}"
REGISTRY="${DOCKER_REGISTRY:-}"

if [ -z "$REGISTRY" ]; then
  echo "Error: DOCKER_REGISTRY environment variable not set"
  echo "Example: export DOCKER_REGISTRY=ghcr.io/your-username"
  exit 1
fi

FULL_IMAGE_NAME="$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"

echo "Building Docker image: $FULL_IMAGE_NAME"
docker build -t "$FULL_IMAGE_NAME" -f daytona/Dockerfile .

echo "Pushing to registry: $FULL_IMAGE_NAME"
docker push "$FULL_IMAGE_NAME"

echo "Image pushed successfully!"
echo ""
echo "To use this image in Daytona, update your template configuration:"
echo "  Image: $FULL_IMAGE_NAME"
echo "  Init script: /app/execution.sh"

