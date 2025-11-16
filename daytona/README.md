# Pithy Jaunt Daytona Template

This directory contains all files needed to create and deploy a Daytona template for executing AI agent tasks.

## Files

- **Dockerfile** - Base Docker image for Daytona workspaces
- **daytona.template.json** - Daytona template configuration
- **execution.sh** - Main execution script that runs in the workspace
- **agent-runner.py** - Python script that uses LLM to generate code patches
- **system-prompt.md** - System prompt for the AI agent
- **requirements.txt** - Python dependencies for the agent runner

## Building and Deploying the Template

### 1. Build the Docker Image

```bash
cd daytona
docker build -t pithy-jaunt/daytona:latest .
```

### 2. Push to Container Registry

You'll need to push the image to a container registry that Daytona can access:

```bash
# Tag for your registry
docker tag pithy-jaunt/daytona:latest <your-registry>/pithy-jaunt/daytona:latest

# Push
docker push <your-registry>/pithy-jaunt/daytona:latest
```

### 3. Create Template in Daytona

You can create the template via:

**Option A: Daytona Dashboard**
1. Go to your Daytona dashboard
2. Navigate to Templates
3. Create a new template
4. Use the image: `pithy-jaunt/daytona:latest`
5. Set the init script: `/app/execution.sh`
6. Configure environment variables as needed

**Option B: Daytona CLI**
```bash
daytona template create \
  --name pithy-jaunt-dev \
  --image pithy-jaunt/daytona:latest \
  --init /app/execution.sh \
  --timeout 25
```

**Option C: Daytona API**
Use the `daytona.template.json` file as a reference for the API payload.

## Environment Variables

The template expects these environment variables to be set when creating a workspace:

- `TARGET_REPO` - Repository URL to clone and modify
- `BRANCH_NAME` - Branch name to create (default: `pj/{TASK_ID}`)
- `TASK_ID` - Unique task identifier
- `AGENT_PROMPT` - Task description for the AI agent
- `OPENAI_API_KEY` - OpenAI API key (if using OpenAI)
- `ANTHROPIC_API_KEY` - Anthropic API key (if using Anthropic)
- `GITHUB_TOKEN` - GitHub token for creating PRs
- `MODEL_PROVIDER` - LLM provider: `openai` or `anthropic`
- `MODEL` - Model name (e.g., `gpt-4o`, `claude-3-5-sonnet-20241022`)
- `WEBHOOK_URL` - URL to send completion webhooks
- `KEEP_ALIVE` - Set to `true` to keep workspace alive after completion (for debugging)
- `BASE_BRANCH` - Base branch for PR (default: `main`)

## Execution Flow

1. Daytona creates workspace from template
2. Template runs `/app/execution.sh` as init script
3. Script clones the target repository
4. Creates a new branch
5. Runs AI agent to generate code patch
6. Applies patch to repository
7. Commits and pushes changes
8. Creates pull request via GitHub CLI
9. Sends webhook to application with results

## Testing Locally

You can test the execution script locally:

```bash
export TARGET_REPO="https://github.com/owner/repo"
export BRANCH_NAME="pj/test-123"
export TASK_ID="test-123"
export AGENT_PROMPT="Add a new feature"
export OPENAI_API_KEY="your-key"
export GITHUB_TOKEN="your-token"
export MODEL_PROVIDER="openai"
export MODEL="gpt-4o"
export WEBHOOK_URL="http://localhost:3000/api/webhook/daytona"

./execution.sh
```

## Troubleshooting

### Workspace doesn't start
- Check that the Docker image is accessible
- Verify the init script path is correct
- Check Daytona logs for errors

### Agent fails to generate patch
- Verify API keys are set correctly
- Check that the model name is valid
- Review agent-runner.py logs

### Patch fails to apply
- The patch may conflict with existing code
- Check the patch format is valid unified diff
- Review git apply output

### PR creation fails
- Verify GITHUB_TOKEN has correct permissions
- Check that the branch was pushed successfully
- Ensure GitHub CLI is authenticated

## Support

For issues with:
- **Daytona**: See [Daytona Documentation](https://www.daytona.io/docs)
- **Template**: Check execution logs in Daytona dashboard
- **Agent**: Review agent-runner.py output and system-prompt.md

