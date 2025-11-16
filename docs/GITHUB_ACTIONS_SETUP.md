# GitHub Actions Setup for Daytona Workspace Creation

## Overview

This approach uses GitHub Actions to create Daytona workspaces, bypassing the REST API limitation where custom snapshots are not supported. The workflow uses the Daytona CLI which properly supports custom snapshots.

## Latency Breakdown

**Total latency: ~45-105 seconds (cold start), ~35-80 seconds (warm)**

- **Workflow dispatch**: 1-5 seconds
- **Runner startup**: 10-30 seconds (cold), 1-5 seconds (warm)
- **Daytona CLI install**: 5-10 seconds (if not cached)
- **Workspace creation**: 30-60 seconds

**Note**: The first run will be slower due to runner cold start. Subsequent runs benefit from warm runners.

## Setup Instructions

### 1. Add Required Secrets to GitHub (For the Workflow)

Go to your repository → **Settings → Secrets and variables → Actions → New repository secret**, and add:

- `DAYTONA_API_KEY` - Your Daytona API key (used by workflow to authenticate with Daytona)
- `OPENAI_API_KEY` - Your OpenAI API key (if using OpenAI, passed to workspace)
- `ANTHROPIC_API_KEY` - Your Anthropic API key (if using Anthropic, passed to workspace)
- `GITHUB_TOKEN` - GitHub token with `repo` and `workflow` scopes (usually auto-provided, only add if you need a custom token)

**These secrets are used by the GitHub Actions workflow when it runs.**

### 2. Configure Environment Variables in Vercel (For Your App)

Add to your **Vercel project → Settings → Environment Variables**:

```env
# Enable GitHub Actions for workspace creation
DAYTONA_USE_GITHUB_ACTIONS=true

# GitHub repository info (where the workflow file is located)
GITHUB_REPO_OWNER=jakebutler
GITHUB_REPO_NAME=pithy-jaunt

# Daytona snapshot name
DAYTONA_SNAPSHOT_NAME=pithy-jaunt-dev

# Your GitHub token (must have workflow dispatch permission)
# This is used by your Next.js app to dispatch the workflow
GITHUB_TOKEN=your_github_token

# Your app URL (for webhook callbacks)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**These environment variables are used by your Next.js application to dispatch the workflow.**

### Summary: Two Places, Different Purposes

- **GitHub Secrets** → Used by the workflow when it runs (to authenticate with Daytona, pass API keys to workspace)
- **Vercel Environment Variables** → Used by your app to dispatch the workflow and configure behavior

### 3. Verify Workflow File

The workflow file should be at:
`.github/workflows/create-daytona-workspace.yml`

Make sure it's committed to the `main` branch (or the branch specified in the workflow dispatch).

### 4. Test the Setup

1. Create a task in your application
2. Execute the task
3. Check GitHub Actions tab to see the workflow running
4. Monitor the workflow logs to verify workspace creation

## How It Works

1. **User executes task** → Your app calls `createWorkspace()`
2. **GitHub Actions dispatch** → App dispatches the workflow via GitHub API
3. **Workflow runs** → Installs Daytona CLI, authenticates, creates workspace
4. **Webhook callback** → Workflow sends webhook with workspace ID
5. **App updates** → Your app receives webhook and updates task status

## Workflow Details

The workflow:
- Installs Daytona CLI
- Authenticates with your Daytona API key
- Creates workspace using CLI with custom snapshot
- Sets all required environment variables
- Sends webhook notification when complete

## Troubleshooting

### Workflow not triggering

- Check that `GITHUB_TOKEN` has `workflow` scope
- Verify `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` are correct
- Ensure workflow file is in the `main` branch

### Workspace creation fails

- Check GitHub Actions logs for detailed error messages
- Verify `DAYTONA_API_KEY` secret is set correctly
- Ensure snapshot name matches what's in Daytona dashboard

### Webhook not received

- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check that webhook endpoint is accessible
- Review webhook handler logs

## Advantages

✅ **Reliable snapshot support** - CLI properly supports custom snapshots  
✅ **No additional infrastructure** - Uses GitHub's runners  
✅ **Good for serverless** - Works from Vercel without CLI installation  
✅ **Audit trail** - All workspace creations visible in GitHub Actions  

## Disadvantages

⚠️ **Latency** - 45-105 seconds vs ~5-10 seconds for direct API  
⚠️ **GitHub dependency** - Requires GitHub repository and Actions  
⚠️ **Rate limits** - Subject to GitHub Actions usage limits  

## Alternative Approaches

If latency is a concern, consider:
- **Separate service** - Deploy a small service with Daytona CLI
- **Contact Daytona** - Request REST API snapshot support
- **Hybrid approach** - Use REST API when possible, fallback to Actions

