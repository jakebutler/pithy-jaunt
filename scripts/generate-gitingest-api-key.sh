#!/bin/bash
# Generate a secure API key for GitIngest service

echo "🔑 Generating secure API key for GitIngest service..."
echo ""

API_KEY=$(openssl rand -hex 32)

echo "✅ Generated API Key:"
echo "$API_KEY"
echo ""
echo "📋 Use this key for:"
echo "   1. Render environment variable: INGEST_API_KEY"
echo "   2. Vercel environment variable: GIT_INGEST_API_KEY"
echo ""
echo "⚠️  Keep this key secure and don't commit it to git!"
echo ""
echo "💾 Copy the key above and use it in both:"
echo "   - Render dashboard → Environment Variables → INGEST_API_KEY"
echo "   - Vercel dashboard → Environment Variables → GIT_INGEST_API_KEY"

