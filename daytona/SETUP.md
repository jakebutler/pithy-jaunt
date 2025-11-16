# Daytona Template Setup Guide

This guide walks you through setting up the Pithy Jaunt Daytona template for task execution.

## Prerequisites

1. **Daytona Account**: Access to Daytona dashboard or API
2. **Docker**: For building the template image
3. **Container Registry**: Docker Hub, GHCR, or other registry accessible to Daytona
4. **API Keys**: OpenAI or Anthropic API key for code generation

## Step 1: Build the Docker Image

```bash
cd daytona
docker build -t pithy-jaunt/daytona:latest -f Dockerfile ..
```

Or use the build script:

```bash
export DOCKER_REGISTRY=ghcr.io/your-username
./build-and-push.sh
```

## Step 2: Push to Container Registry

```bash
# Tag for your registry
docker tag pithy-jaunt/daytona:latest <registry>/pithy-jaunt/daytona:latest

# Push
docker push <registry>/pithy-jaunt/daytona:latest
```

**Common registries:**
- Docker Hub: `docker.io/username/pithy-jaunt-daytona:latest`
- GitHub Container Registry: `ghcr.io/username/pithy-jaunt-daytona:latest`
- AWS ECR: `<account>.dkr.ecr.<region>.amazonaws.com/pithy-jaunt-daytona:latest`

## Step 3: Create Template in Daytona

### Option A: Via Daytona Dashboard

1. Log into your Daytona dashboard
2. Navigate to **Templates** or **Workspace Templates**
3. Click **Create Template** or **New Template**
4. Fill in the template details:
   - **Name**: `pithy-jaunt-dev`
   - **Image**: `<registry>/pithy-jaunt/daytona:latest`
   - **Init Script**: `/app/execution.sh`
   - **Timeout**: `25` minutes
   - **Description**: "Pithy Jaunt AI Agent Execution Environment"

### Option B: Via Daytona CLI

```bash
daytona template create \
  --name pithy-jaunt-dev \
  --image <registry>/pithy-jaunt/daytona:latest \
  --init /app/execution.sh \
  --timeout 25
```

### Option C: Via Daytona API

```bash
curl -X POST "${DAYTONA_API_URL}/templates" \
  -H "Authorization: Bearer ${DAYTONA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @daytona.template.json
```

## Step 4: Configure Environment Variables

The template requires these environment variables when creating workspaces:

### Required Variables

- `TARGET_REPO` - Repository URL to clone
- `TASK_ID` - Unique task identifier
- `AGENT_PROMPT` - Task description for AI agent
- `GITHUB_TOKEN` - GitHub token with `repo` scope
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - LLM provider API key

### Optional Variables

- `BRANCH_NAME` - Branch name (default: `pj/{TASK_ID}`)
- `BASE_BRANCH` - Base branch for PR (default: `main`)
- `MODEL_PROVIDER` - `openai` or `anthropic` (default: `openai`)
- `MODEL` - Model name (default: `gpt-4o`)
- `WEBHOOK_URL` - Webhook callback URL
- `KEEP_ALIVE` - Set to `true` to keep workspace alive after completion

These are automatically set by the application when creating workspaces via the API.

## Step 5: Verify Template

Test the template by creating a workspace:

```bash
curl -X POST "${DAYTONA_API_URL}/workspace" \
  -H "Authorization: Bearer ${DAYTONA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "pithy-jaunt-dev",
    "repoUrl": "https://github.com/owner/test-repo",
    "branch": "main",
    "env": {
      "TARGET_REPO": "https://github.com/owner/test-repo",
      "TASK_ID": "test-123",
      "AGENT_PROMPT": "Add a README file",
      "GITHUB_TOKEN": "your-token",
      "OPENAI_API_KEY": "your-key",
      "MODEL_PROVIDER": "openai",
      "MODEL": "gpt-4o",
      "WEBHOOK_URL": "https://your-app.com/api/webhook/daytona"
    }
  }'
```

## Step 6: Update Application Configuration

Ensure your application has the correct Daytona configuration:

```env
DAYTONA_API_URL=https://app.daytona.io/api
DAYTONA_API_KEY=your-daytona-api-key
NEXT_PUBLIC_APP_URL=https://your-app.com
```

## Troubleshooting

### Template Not Found

- Verify the template name matches exactly: `pithy-jaunt-dev`
- Check that the template is created in the correct Daytona organization/account
- Ensure you have permissions to use the template

### Image Pull Errors

- Verify the image is accessible from Daytona's infrastructure
- Check registry authentication if using private registries
- Ensure the image tag is correct

### Execution Script Not Running

- Verify the init script path: `/app/execution.sh`
- Check that the script is executable in the image
- Review Daytona workspace logs for errors

### Webhook Not Received

- Verify `WEBHOOK_URL` is publicly accessible
- Check that the URL is correct: `https://your-app.com/api/webhook/daytona`
- Review application logs for webhook requests
- Test webhook endpoint manually with curl

### Agent Fails

- Verify API keys are set correctly
- Check that the model name is valid
- Review execution logs in Daytona dashboard
- Ensure Python dependencies are installed

## Next Steps

Once the template is set up:

1. Test with a simple task
2. Monitor execution logs
3. Verify PR creation works
4. Check webhook delivery
5. Review error handling

## Support

- **Daytona Docs**: https://www.daytona.io/docs
- **Daytona Dashboard**: https://app.daytona.io
- **Template Issues**: Check `daytona/README.md` for template-specific documentation

