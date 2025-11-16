#!/bin/bash
# Check Docker Hub username and fix image tag if needed

echo "Checking Docker Hub login status..."

# Try to get username from docker info
USERNAME=$(docker info 2>/dev/null | grep -i "username" | awk '{print $2}' | head -1)

if [ -z "$USERNAME" ]; then
  # Try from config file
  if [ -f ~/.docker/config.json ]; then
    # Extract username from auths (this is tricky, so we'll just check if logged in)
    if grep -q "auths" ~/.docker/config.json; then
      echo "✅ Docker is logged in (but can't determine username from config)"
      echo ""
      echo "Please tell me your Docker Hub username, or try pushing with your username:"
      echo "  docker tag butlerjake/pithy-jaunt-daytona:latest YOUR_USERNAME/pithy-jaunt-daytona:latest"
      echo "  docker push YOUR_USERNAME/pithy-jaunt-daytona:latest"
      exit 0
    fi
  fi
  echo "⚠️  Could not determine Docker Hub username"
else
  echo "✅ Logged in as: $USERNAME"
fi

# Check if image tag matches username
CURRENT_TAG="butlerjake/pithy-jaunt-daytona:latest"

if [ -n "$USERNAME" ] && [ "$USERNAME" != "butlerjake" ]; then
  echo ""
  echo "⚠️  Image is tagged as 'butlerjake' but you're logged in as '$USERNAME'"
  echo ""
  echo "Retagging image to match your username..."
  NEW_TAG="${USERNAME}/pithy-jaunt-daytona:latest"
  docker tag "$CURRENT_TAG" "$NEW_TAG"
  echo "✅ Retagged: $NEW_TAG"
  echo ""
  echo "Now push with:"
  echo "  docker push $NEW_TAG"
  echo ""
  echo "Or run this script again to push automatically"
  exit 0
fi

echo ""
echo "Image tag matches username. Attempting push..."
docker push "$CURRENT_TAG"

