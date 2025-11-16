#!/bin/bash
# Install Daytona CLI on macOS

set -e

echo "=========================================="
echo "Installing Daytona CLI"
echo "=========================================="
echo ""

# Check if already installed
if command -v daytona &> /dev/null; then
  echo "✅ Daytona CLI is already installed"
  daytona --version
  exit 0
fi

echo "Installing Daytona CLI via Homebrew..."
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
  echo "❌ Homebrew not found"
  echo ""
  echo "Please install Homebrew first:"
  echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  echo ""
  echo "Or install Daytona CLI manually from:"
  echo "  https://www.daytona.io/docs/installation"
  exit 1
fi

echo "✅ Homebrew found"
echo ""

# Install Daytona CLI
echo "Running: brew install daytonaio/daytona/daytona"
brew install daytonaio/daytona/daytona

echo ""
echo "✅ Daytona CLI installed successfully!"
echo ""

# Verify installation
if command -v daytona &> /dev/null; then
  daytona --version
  echo ""
  echo "Next steps:"
  echo "  1. Authenticate: daytona auth login"
  echo "  2. Create template: ./scripts/create-template-cli-auto.sh"
else
  echo "❌ Installation may have failed. Please check the output above."
  exit 1
fi

