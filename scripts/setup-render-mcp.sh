#!/bin/bash
# Setup script for Render MCP server configuration

set -e

MCP_CONFIG="$HOME/.cursor/mcp.json"
BACKUP_CONFIG="${MCP_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Render MCP Server Setup"
echo ""

# Check if API key is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <YOUR_RENDER_API_KEY>"
  echo ""
  echo "To get your API key:"
  echo "1. Go to https://dashboard.render.com/settings#api-keys"
  echo "2. Click 'Create API Key'"
  echo "3. Copy the key and run this script with it"
  exit 1
fi

API_KEY="$1"

# Backup existing config
if [ -f "$MCP_CONFIG" ]; then
  echo "📦 Backing up existing MCP config to $BACKUP_CONFIG"
  cp "$MCP_CONFIG" "$BACKUP_CONFIG"
fi

# Create or update MCP config
echo "📝 Updating MCP configuration..."

# Check if config exists and has render entry
if [ -f "$MCP_CONFIG" ] && grep -q '"render"' "$MCP_CONFIG"; then
  # Update existing render entry
  if command -v jq &> /dev/null; then
    # Use jq if available (cleaner)
    jq --arg key "$API_KEY" \
      '.mcpServers.render.headers.Authorization = "Bearer \($key)"' \
      "$MCP_CONFIG" > "${MCP_CONFIG}.tmp" && mv "${MCP_CONFIG}.tmp" "$MCP_CONFIG"
  else
    # Fallback to sed
    sed -i.bak "s|Bearer REPLACE_WITH_YOUR_RENDER_API_KEY|Bearer $API_KEY|g" "$MCP_CONFIG"
    rm -f "${MCP_CONFIG}.bak"
  fi
else
  # Add render entry
  if command -v jq &> /dev/null; then
    jq --arg key "$API_KEY" \
      '.mcpServers.render = {
        "url": "https://mcp.render.com/mcp",
        "headers": {
          "Authorization": "Bearer \($key)"
        }
      }' \
      "$MCP_CONFIG" > "${MCP_CONFIG}.tmp" && mv "${MCP_CONFIG}.tmp" "$MCP_CONFIG"
  else
    echo "⚠️  jq not found. Please install jq or manually update ~/.cursor/mcp.json"
    echo "Add this to your mcpServers object:"
    echo '  "render": {'
    echo '    "url": "https://mcp.render.com/mcp",'
    echo "    \"headers\": {"
    echo "      \"Authorization\": \"Bearer $API_KEY\""
    echo "    }"
    echo "  }"
    exit 1
  fi
fi

echo "✅ MCP configuration updated!"
echo ""
echo "🔄 Please restart Cursor for changes to take effect."
echo ""
echo "🧪 Test the connection by asking Cursor:"
echo "   'List my Render workspaces'"


