#!/bin/bash
# Script to verify that a Daytona snapshot contains the latest execution.sh

set -e

SNAPSHOT_NAME="${1:-butlerjake/pithy-jaunt-daytona:v1.0.5}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXECUTION_SCRIPT="$PROJECT_ROOT/daytona/execution.sh"

echo "=========================================="
echo "Verifying Snapshot Contents"
echo "=========================================="
echo "Snapshot: $SNAPSHOT_NAME"
echo ""

# Check if we can pull the Docker image
echo "Step 1: Pulling Docker image..."
if ! docker pull "$SNAPSHOT_NAME" 2>/dev/null; then
    echo "⚠️  Warning: Could not pull image $SNAPSHOT_NAME"
    echo "   This might mean:"
    echo "   - Image is not in Docker Hub"
    echo "   - You need to login: docker login"
    echo "   - Image name is incorrect"
    echo ""
    echo "Skipping image verification, but you can still check manually."
    exit 0
fi

echo "✅ Image pulled successfully"
echo ""

# Extract execution.sh from the image
echo "Step 2: Extracting execution.sh from image..."
TEMP_CONTAINER=$(docker create "$SNAPSHOT_NAME")
TEMP_DIR=$(mktemp -d)

docker cp "$TEMP_CONTAINER:/app/execution.sh" "$TEMP_DIR/execution.sh" 2>/dev/null || {
    echo "❌ ERROR: Could not extract execution.sh from image"
    echo "   The snapshot might not have the execution script at /app/execution.sh"
    docker rm "$TEMP_CONTAINER" >/dev/null 2>&1
    rm -rf "$TEMP_DIR"
    exit 1
}

docker rm "$TEMP_CONTAINER" >/dev/null 2>&1

echo "✅ execution.sh extracted"
echo ""

# Compare files
echo "Step 3: Comparing with current execution.sh..."
echo ""

CURRENT_CHECKSUM=$(md5sum "$EXECUTION_SCRIPT" | cut -d' ' -f1)
SNAPSHOT_CHECKSUM=$(md5sum "$TEMP_DIR/execution.sh" | cut -d' ' -f1)

echo "Current execution.sh checksum: $CURRENT_CHECKSUM"
echo "Snapshot execution.sh checksum: $SNAPSHOT_CHECKSUM"
echo ""

if [ "$CURRENT_CHECKSUM" = "$SNAPSHOT_CHECKSUM" ]; then
    echo "✅ MATCH: Snapshot contains the latest execution.sh"
    echo ""
    
    # Check for version string
    if grep -q "Execution script version:" "$TEMP_DIR/execution.sh"; then
        VERSION_LINE=$(grep "Execution script version:" "$TEMP_DIR/execution.sh" | head -1)
        echo "Version info found in snapshot:"
        echo "  $VERSION_LINE"
    fi
else
    echo "❌ MISMATCH: Snapshot does NOT contain the latest execution.sh"
    echo ""
    echo "The snapshot was built with an older version of execution.sh"
    echo ""
    echo "To fix:"
    echo "1. Rebuild the Docker image:"
    echo "   ./scripts/build-and-push-daytona-image.sh v1.0.5"
    echo ""
    echo "2. Create a new snapshot in Daytona with the new image"
    echo ""
    echo "3. Update DAYTONA_SNAPSHOT_NAME in Vercel"
    echo ""
    
    # Show differences
    echo "Key differences (first 20 lines):"
    diff -u "$TEMP_DIR/execution.sh" "$EXECUTION_SCRIPT" | head -30 || true
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "=========================================="

