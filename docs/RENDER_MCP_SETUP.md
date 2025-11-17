# Render MCP Server Setup

This guide helps you set up the Render MCP server to deploy and manage the GitIngest service.

## Step 1: Get Your Render API Key

1. Go to [Render Account Settings](https://dashboard.render.com/settings#api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "Pithy Jaunt MCP")
4. Copy the API key (you'll only see it once!)

## Step 2: Update MCP Configuration

The Render MCP server has been added to your Cursor MCP configuration at `~/.cursor/mcp.json`.

You need to update it with your API key. You have two options:

### Option A: Set Environment Variable (Recommended)

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export RENDER_API_KEY=your_api_key_here
```

Then restart Cursor.

### Option B: Update Config Directly

Edit `~/.cursor/mcp.json` and replace `${RENDER_API_KEY}` with your actual API key:

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ACTUAL_API_KEY_HERE"
      }
    }
  }
}
```

**Note:** The current config uses `${RENDER_API_KEY}` which should work if the environment variable is set.

## Step 3: Verify MCP Server Connection

After setting up your API key, restart Cursor and verify the MCP server is working by asking:

"List my Render workspaces"

If it works, you'll see your Render workspaces. If not, check:
- API key is correct
- Cursor has been restarted
- Environment variable is set (if using Option A)

## Step 4: Deploy GitIngest Service

Once the MCP server is working, you can deploy the GitIngest service using prompts like:

"Create a new web service named gitingest-service using Python 3.11, pointing to the apps/gitingest directory in my GitHub repository"

Or we can use the MCP tools directly to create the service.

## Next Steps

After deployment, you'll need to:
1. Set environment variables in Render dashboard
2. Update Vercel with the GitIngest service URL
3. Test the integration

See `docs/GITINGEST_SETUP.md` for full deployment details.


