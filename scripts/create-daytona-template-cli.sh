#!/bin/bash
# Script to create Daytona template using CLI
# This is an interactive script that guides through CLI template creation

set -e

echo "=========================================="
echo "Create Daytona Template via CLI"
echo "=========================================="
echo ""
echo "This script will guide you through creating the template using Daytona CLI."
echo "Make sure you have the Daytona CLI installed and authenticated."
echo ""

# Check if daytona CLI is installed
if ! command -v daytona &> /dev/null; then
  echo "❌ Daytona CLI is not installed"
  echo ""
  echo "Install it from: https://www.daytona.io/docs/installation"
  exit 1
fi

echo "✅ Daytona CLI found"
echo ""

# Check if authenticated
if ! daytona target list &> /dev/null; then
  echo "❌ Not authenticated with Daytona"
  echo "Please run: daytona auth login"
  exit 1
fi

echo "✅ Authenticated with Daytona"
echo ""

DOCKER_IMAGE="${DOCKER_IMAGE:-butlerjake/pithy-jaunt-daytona:latest}"

echo "Template Details:"
echo "  Name: pithy-jaunt-dev"
echo "  Image: ${DOCKER_IMAGE}"
echo "  Repository: https://github.com/daytonaio-templates/blank (placeholder)"
echo ""
echo "Note: The repository URL is a placeholder. The actual repository"
echo "will be specified when creating workspaces via the API."
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 1
fi

echo ""
echo "Creating template via CLI..."
echo "This will be interactive - follow the prompts:"
echo ""

# Use a blank template repository as base
# The actual repo gets overridden when creating workspaces
daytona workspace-template add <<EOF
https://github.com/daytonaio-templates/blank
pithy-jaunt-dev
Custom image
${DOCKER_IMAGE}
daytona

EOF

echo ""
echo "✅ Template creation initiated!"
echo ""
echo "Verify the template was created:"
echo "  daytona workspace-template list"

