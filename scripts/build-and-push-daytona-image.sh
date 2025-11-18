#!/bin/bash
# Build and push Daytona Docker image for linux/amd64 (Vercel-compatible)

set -e

VERSION="${1:-v1.0.5}"
IMAGE_NAME="butlerjake/pithy-jaunt-daytona:$VERSION"

echo "=========================================="
echo "Building Daytona Docker Image"
echo "=========================================="
echo "Version: $VERSION"
echo "Image: $IMAGE_NAME"
echo "Platform: linux/amd64 (Vercel-compatible)"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker daemon is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

# Check if logged in to Docker Hub
if ! docker info | grep -q "Username"; then
    echo "WARNING: Not logged in to Docker Hub"
    echo "You may need to run: docker login"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "Building image for linux/amd64 platform..."
docker buildx build \
    --platform linux/amd64 \
    -t "$IMAGE_NAME" \
    -f daytona/Dockerfile \
    . \
    --load

echo ""
echo "Build complete!"
echo ""
echo "Pushing to Docker Hub..."
docker push "$IMAGE_NAME"

echo ""
echo "=========================================="
echo "✅ Image built and pushed successfully!"
echo "=========================================="
echo ""
echo "Image: $IMAGE_NAME"
echo "Platform: linux/amd64"
echo ""
echo "Next steps:"
echo "1. Create snapshot in Daytona dashboard:"
echo "   Name: $IMAGE_NAME"
echo "   Image: $IMAGE_NAME"
echo ""
echo "2. Update Vercel environment variable:"
echo "   DAYTONA_SNAPSHOT_NAME=$IMAGE_NAME"
echo ""
echo "3. Redeploy your Vercel app"
echo ""

