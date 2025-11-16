# Daytona Snapshot Approach

## Why We Need a Custom Snapshot

The default Daytona snapshot (`daytonaio/sandbox:0.4.3`) is a basic development environment that **does not include**:

1. **Execution Script** (`/app/execution.sh`) - The script that runs automatically when a workspace starts
2. **AI Agent Runner** (`/app/agent-runner.py`) - The Python script that generates code changes using LLMs
3. **Python Dependencies** - Required packages for the agent runner
4. **Workflow Logic** - The entire flow that:
   - Clones the target repository
   - Creates a branch
   - Runs the AI agent to generate code changes
   - Applies the patch
   - Commits and pushes changes
   - Creates a pull request
   - Sends webhooks back to the application

**Without the custom snapshot, workspaces start but nothing happens** - no code is generated, no PRs are created, and tasks stay "running" forever.

## The Problem: REST API Doesn't Support Snapshots

Our testing shows that the Daytona REST API (`POST /api/workspace`) **ignores the `snapshot` parameter**. Even when we send:

```json
{
  "snapshot": "pithy-jaunt-dev",
  "repoUrl": "...",
  "branch": "..."
}
```

Daytona still uses the default snapshot (`daytonaio/sandbox:0.4.3`).

However, the **Daytona CLI** properly supports custom snapshots:

```bash
daytona sandbox create --snapshot pithy-jaunt-dev --repo <url> --branch <branch>
```

## Solution Options

### Option 1: Separate Service with CLI (Recommended for Production)

Create a separate service/worker that has the Daytona CLI installed and can create workspaces programmatically.

**Pros:**
- Works reliably with custom snapshots
- Can be deployed separately (not constrained by Vercel serverless)
- Can be scaled independently

**Cons:**
- Requires additional infrastructure
- More complex deployment

**Implementation:**
- Create a simple Node.js/Express service
- Install Daytona CLI in the container
- Authenticate with Daytona API key
- Expose an endpoint that your Vercel app can call
- The service uses the CLI to create workspaces

### Option 2: GitHub Actions (Good for Testing/Development)

Use GitHub Actions to create workspaces when tasks are executed.

**Pros:**
- No additional infrastructure needed
- GitHub Actions can install and use the CLI
- Good for CI/CD workflows

**Cons:**
- Requires GitHub repository
- Adds latency (GitHub Actions startup time)
- More complex workflow

**Implementation:**
- When a task is executed, create a GitHub Actions workflow dispatch
- The workflow installs Daytona CLI
- Creates the workspace using CLI
- Reports back via webhook

### Option 3: Contact Daytona Support

The REST API should support snapshots. This might be:
- A bug in the API
- Missing documentation
- A feature that needs to be enabled

**Action:**
- Contact Daytona support about REST API snapshot support
- Request documentation or fix for the API endpoint

### Option 4: CLI Fallback (Current Implementation)

The code now includes a CLI fallback that:
1. Tries REST API first
2. Detects if wrong snapshot is used
3. Falls back to CLI if available

**Limitation:** This won't work in Vercel serverless (CLI not available).

**Use Case:** Good for local development or environments where CLI is installed.

## Current Implementation

The codebase now includes:

1. **`lib/daytona/client.ts`** - REST API client with CLI fallback detection
2. **`lib/daytona/cli-client.ts`** - CLI-based client implementation

To enable CLI fallback, set:
```env
DAYTONA_USE_CLI_FALLBACK=true
```

## Recommended Next Steps

1. **Short-term:** Test if the REST API works in production (maybe it's a staging issue)
2. **Medium-term:** Set up Option 1 (separate service) for production
3. **Long-term:** Work with Daytona to fix/enable REST API snapshot support

## Testing the CLI Approach Locally

```bash
# Make sure Daytona CLI is installed and authenticated
daytona --version
daytona auth login

# Set environment variable
export DAYTONA_USE_CLI_FALLBACK=true

# Run your app
npm run dev

# Create and execute a task - it should use CLI if REST API fails
```

## Separate Service Example

If you want to implement Option 1, here's a simple Express service:

```typescript
// daytona-service/server.ts
import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();

app.post('/workspace', async (req, res) => {
  const { snapshot, repoUrl, branch, env } = req.body;
  
  const envFlags = Object.entries(env)
    .map(([k, v]) => `--env "${k}=${v}"`)
    .join(' ');
  
  const command = `daytona sandbox create \
    --snapshot "${snapshot}" \
    --repo "${repoUrl}" \
    --branch "${branch}" \
    ${envFlags} \
    --output json`;
  
  try {
    const { stdout } = await execAsync(command);
    const data = JSON.parse(stdout);
    res.json({ workspaceId: data.id, status: 'creating' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3002);
```

Then update your Vercel app to call this service instead of the Daytona API directly.

