#!/bin/bash
# Setup script for test environment
# This script helps set up .env.test from .env

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_TEST_FILE="$PROJECT_ROOT/.env.test"
ENV_TEST_EXAMPLE="$PROJECT_ROOT/env.test.example"

echo "Setting up test environment..."

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found at $ENV_FILE"
  echo "Please create .env first with your development credentials"
  exit 1
fi

# Copy example if .env.test doesn't exist
if [ ! -f "$ENV_TEST_FILE" ]; then
  echo "Creating .env.test from env.test.example..."
  cp "$ENV_TEST_EXAMPLE" "$ENV_TEST_FILE"
  echo "✓ Created .env.test"
else
  echo "✓ .env.test already exists"
fi

# Extract values from .env (if they exist)
echo ""
echo "Extracting values from .env..."
echo "NOTE: You should use SEPARATE test Supabase and Convex projects for testing!"
echo ""

# Function to get value from .env
get_env_value() {
  grep "^$1=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2- | sed 's/^"//;s/"$//' || echo ""
}

# Update .env.test with values from .env (user should verify these are test values)
SUPABASE_URL=$(get_env_value "NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY=$(get_env_value "NEXT_PUBLIC_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY=$(get_env_value "SUPABASE_SERVICE_ROLE_KEY")
CONVEX_DEPLOYMENT=$(get_env_value "CONVEX_DEPLOYMENT")
CONVEX_URL=$(get_env_value "NEXT_PUBLIC_CONVEX_URL")
GITHUB_TOKEN=$(get_env_value "GITHUB_TOKEN")

if [ -n "$SUPABASE_URL" ]; then
  echo "Found Supabase URL in .env"
  sed -i.bak "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL|" "$ENV_TEST_FILE"
fi

if [ -n "$SUPABASE_ANON_KEY" ]; then
  echo "Found Supabase Anon Key in .env"
  sed -i.bak "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" "$ENV_TEST_FILE"
fi

if [ -n "$SUPABASE_SERVICE_KEY" ]; then
  echo "Found Supabase Service Role Key in .env"
  sed -i.bak "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY|" "$ENV_TEST_FILE"
fi

if [ -n "$CONVEX_DEPLOYMENT" ]; then
  echo "Found Convex Deployment in .env"
  sed -i.bak "s|CONVEX_DEPLOYMENT=.*|CONVEX_DEPLOYMENT=$CONVEX_DEPLOYMENT|" "$ENV_TEST_FILE"
fi

if [ -n "$CONVEX_URL" ]; then
  echo "Found Convex URL in .env"
  sed -i.bak "s|NEXT_PUBLIC_CONVEX_URL=.*|NEXT_PUBLIC_CONVEX_URL=$CONVEX_URL|" "$ENV_TEST_FILE"
fi

if [ -n "$GITHUB_TOKEN" ]; then
  echo "Found GitHub Token in .env"
  sed -i.bak "s|GITHUB_TOKEN=.*|GITHUB_TOKEN=$GITHUB_TOKEN|" "$ENV_TEST_FILE"
fi

# Clean up backup file
rm -f "$ENV_TEST_FILE.bak"

echo ""
echo "✓ Test environment setup complete!"
echo ""
echo "IMPORTANT: Review .env.test and ensure you're using TEST credentials:"
echo "  - Use a separate Supabase project for testing"
echo "  - Use a separate Convex deployment for testing"
echo "  - Use a test GitHub token (or the same one if acceptable)"
echo ""
echo "To run tests:"
echo "  npm run test:unit    # Unit tests (no env needed)"
echo "  npm run test:e2e     # E2E tests (requires .env.test)"
echo ""

