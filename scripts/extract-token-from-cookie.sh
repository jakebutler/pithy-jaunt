#!/usr/bin/env bash
# Helper script to extract access_token from Supabase cookie
# Usage: ./scripts/extract-token-from-cookie.sh <cookie-value>

set -euo pipefail

COOKIE_VALUE="${1:-}"

if [ -z "$COOKIE_VALUE" ]; then
  echo "Usage: $0 <cookie-value>"
  echo ""
  echo "To get the cookie value:"
  echo "1. Open DevTools → Network tab"
  echo "2. Make a request to your app"
  echo "3. Find the Cookie header"
  echo "4. Copy the value of 'sb-<project-id>-auth-token' (the part after '=')"
  echo "5. Remove the 'base64-' prefix if present"
  echo ""
  echo "Example:"
  echo "  $0 'base64-eyJhY2Nlc3NfdG9rZW4iOi...'"
  exit 1
fi

# Remove base64- prefix if present
CLEANED_VALUE="${COOKIE_VALUE#base64-}"

echo "Extracting access token from cookie..."
echo ""

# Try to decode and extract access_token
DECODED=$(echo "$CLEANED_VALUE" | base64 -d 2>/dev/null || echo "")

if [ -z "$DECODED" ]; then
  echo "Error: Failed to decode cookie value"
  echo "Make sure you copied the entire cookie value"
  exit 1
fi

# Try to extract access_token using jq or grep
if command -v jq &> /dev/null; then
  ACCESS_TOKEN=$(echo "$DECODED" | jq -r '.access_token // empty' 2>/dev/null || echo "")
else
  # Fallback: use grep to find access_token
  ACCESS_TOKEN=$(echo "$DECODED" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || echo "")
fi

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo "Error: Could not find access_token in decoded cookie"
  echo ""
  echo "Decoded cookie content (first 200 chars):"
  echo "$DECODED" | head -c 200
  echo "..."
  echo ""
  echo "Try Method 1 or 2 from get-supabase-token.sh instead"
  exit 1
fi

echo "✅ Found access token!"
echo ""
echo "Set it as an environment variable:"
echo "export SUPABASE_ACCESS_TOKEN=\"$ACCESS_TOKEN\""
echo ""

