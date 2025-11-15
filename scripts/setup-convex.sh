#!/bin/bash

# Convex Setup Script
# This script helps you connect your Convex deployment

set -e

echo "🚀 Setting up Convex for Pithy Jaunt"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "⚠️  .env.local not found. Creating from example..."
  if [ -f env.example ]; then
    cp env.example .env.local
    echo "✅ Created .env.local from env.example"
    echo "📝 Please edit .env.local and add your Convex URL:"
    echo "   NEXT_PUBLIC_CONVEX_URL=https://rightful-chinchilla-44.convex.cloud"
    echo "   CONVEX_DEPLOYMENT=prod:rightful-chinchilla-44"
    echo ""
  else
    echo "❌ env.example not found. Please create .env.local manually."
    exit 1
  fi
fi

# Check if Convex URL is set
if ! grep -q "NEXT_PUBLIC_CONVEX_URL" .env.local; then
  echo "⚠️  NEXT_PUBLIC_CONVEX_URL not found in .env.local"
  echo "📝 Adding Convex configuration..."
  echo "" >> .env.local
  echo "# Convex Configuration" >> .env.local
  echo "NEXT_PUBLIC_CONVEX_URL=https://rightful-chinchilla-44.convex.cloud" >> .env.local
  echo "CONVEX_DEPLOYMENT=prod:rightful-chinchilla-44" >> .env.local
  echo "✅ Added Convex configuration to .env.local"
  echo ""
fi

echo "📦 Checking Convex CLI..."
if ! command -v npx &> /dev/null; then
  echo "❌ npx not found. Please install Node.js first."
  exit 1
fi

echo "✅ Convex CLI available"
echo ""

echo "🔐 Authenticating with Convex..."
echo "   (This will open a browser window)"
npx convex login || {
  echo "⚠️  Login failed or cancelled. You can run 'npx convex login' manually later."
}

echo ""
echo "🔗 Linking to deployment..."
echo "   Deployment: https://rightful-chinchilla-44.convex.cloud"
echo ""

# Try to configure
npx convex dev --configure --once --url https://rightful-chinchilla-44.convex.cloud 2>/dev/null || {
  echo "⚠️  Auto-configuration failed. Please run manually:"
  echo "   npx convex dev --configure"
  echo "   Then select 'Use existing deployment' and enter:"
  echo "   https://rightful-chinchilla-44.convex.cloud"
  echo ""
}

echo "📤 Deploying schema and functions..."
npx convex deploy --once || {
  echo "⚠️  Deployment failed. You can deploy manually with:"
  echo "   npx convex deploy"
  echo ""
}

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify deployment: npx convex dashboard"
echo "   2. Start dev server: npx convex dev (in one terminal)"
echo "   3. Start Next.js: npm run dev (in another terminal)"
echo ""
echo "📖 See docs/CONVEX_SETUP.md for more details"

