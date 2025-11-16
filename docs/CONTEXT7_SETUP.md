# Context7 MCP Setup

Context7 provides up-to-date code documentation for LLMs and AI code editors. This guide explains how to configure it in Cursor.

## Overview

Context7 MCP server allows you to fetch documentation for libraries and frameworks directly within Cursor. It's configured to only be used when explicitly requested (not automatically invoked).

## Setup Instructions

### ✅ Step 1: API Key Added

Your Context7 API key has been added to `.env.local`:
- API Key: `ctx7sk-d144c7fa-3bd2-42ca-904d-5dc7d5a6abe8`

### ✅ Step 2: Configuration Reference Created

A reference configuration file has been created at `.cursor/mcp-config.json` with your API key.

### Step 3: Configure MCP Server in Cursor

**You need to manually add this to Cursor's settings:**

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Navigate to **Features** → **Model Context Protocol** (or search for "MCP" in settings)
3. Click **Add Server** or edit your MCP configuration
4. Copy and paste the following configuration (or reference `.cursor/mcp-config.json`):

**With API Key (Your Configuration):**
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {
        "CONTEXT7_API_KEY": "ctx7sk-d144c7fa-3bd2-42ca-904d-5dc7d5a6abe8"
      }
    }
  }
}
```

**Note:** This configuration is also saved in `.cursor/mcp-config.json` for reference.

**Without API Key (rate limited):**
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

**Alternative: Using Environment Variable**

If you prefer to use the environment variable from your `.env` file, you can reference it in your MCP configuration (depending on how Cursor handles environment variables in your setup).

### 4. Restart Cursor

After adding the MCP server configuration, restart Cursor to load the new server.

## Usage

Context7 will be available but **only used when explicitly requested**. To use it:

1. **Explicit Request**: Ask for library documentation, e.g., "Use Context7 to get the documentation for Next.js routing"
2. **Library ID Format**: You can specify a library using Context7's ID format: `/library/name` (e.g., `/vercel/next.js`)

### Available Tools

- `resolve-library-id`: Resolves a library name into a Context7-compatible library ID
- `get-library-docs`: Fetches documentation for a library

### Example Usage

```
Get me the Next.js documentation for routing using Context7
```

```
Use Context7 to fetch React hooks documentation
```

```
Show me Supabase authentication docs using /supabase/supabase
```

## Troubleshooting

### Module Not Found Errors

If you encounter `ERR_MODULE_NOT_FOUND`, try using `bunx` instead of `npx`:

```json
{
  "mcpServers": {
    "context7": {
      "command": "bunx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

### ESM Resolution Issues

For errors like `Error: Cannot find module 'uriTemplate.js'`, add the experimental flag:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "--node-options=--experimental-vm-modules", "@upstash/context7-mcp@latest"]
    }
  }
}
```

### TLS/Certificate Issues

Use the `--experimental-fetch` flag:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "--node-options=--experimental-fetch", "@upstash/context7-mcp"]
    }
  }
}
```

## Resources

- [Context7 GitHub Repository](https://github.com/upstash/context7)
- [Context7 Website](https://context7.com)
- [Get API Key](https://context7.com/dashboard)

