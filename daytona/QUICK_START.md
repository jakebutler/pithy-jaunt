# Quick Start - Testing Daytona Integration

## ✅ What's Done

1. ✅ Docker image built: `pithy-jaunt/daytona:latest` (also tagged as `butlerjake/pithy-jaunt-daytona:latest`)
2. ✅ All code updated to use Daytona workspaces
3. ✅ Execution script with error handling and webhooks
4. ✅ Webhook handler ready to receive callbacks

## 🚀 Next Steps to Test

### Step 1: Push Docker Image to Registry

You need to push the image to a registry that Daytona can access. Choose one:

**Option A: Docker Hub (Recommended for testing)**
```bash
# Login to Docker Hub
docker login

# Push the image
docker push butlerjake/pithy-jaunt-daytona:latest
```

**Option B: GitHub Container Registry**
```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u butlerjake --password-stdin

# Tag for GHCR
docker tag pithy-jaunt/daytona:latest ghcr.io/butlerjake/pithy-jaunt-daytona:latest

# Push
docker push ghcr.io/butlerjake/pithy-jaunt-daytona:latest
```

### Step 2: Create Template in Daytona

Go to your Daytona dashboard and create a template:

**Template Name:** `pithy-jaunt-dev`

**Image:** 
- Docker Hub: `butlerjake/pithy-jaunt-daytona:latest`
- OR GHCR: `ghcr.io/butlerjake/pithy-jaunt-daytona:latest`

**Init Script:** `/app/execution.sh`

**Timeout:** `25` minutes

### Step 3: Verify Environment Variables

Make sure your `.env.local` has:
```env
DAYTONA_API_URL=https://app.daytona.io/api
DAYTONA_API_KEY=your-daytona-api-key
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok-free.dev
OPENAI_API_KEY=your-openai-key
GITHUB_TOKEN=your-github-token
```

### Step 4: Test in Application

1. Start your Next.js app: `npm run dev`
2. Start ngrok: `ngrok http 3000`
3. Update `NEXT_PUBLIC_APP_URL` with ngrok URL
4. Create a task in the UI
5. Click "Execute"
6. Check Daytona dashboard for workspace creation
7. Monitor execution logs
8. Verify webhook is received when task completes

## 🔍 Troubleshooting

**Image not found in Daytona:**
- Make sure you pushed to a public registry OR
- Configure Daytona with registry credentials if using private registry

**Template not found:**
- Verify template name is exactly `pithy-jaunt-dev`
- Check template is in the correct Daytona organization

**Webhook not received:**
- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check ngrok is running and URL is accessible
- Test webhook endpoint: `curl -X POST https://your-ngrok-url/api/webhook/daytona -H "Content-Type: application/json" -d '{"type":"test"}'`

**Execution fails:**
- Check Daytona workspace logs
- Verify API keys are set in environment variables
- Check execution script logs in Daytona dashboard

## 📝 Current Image Location

The image is built locally and tagged as:
- `pithy-jaunt/daytona:latest`
- `butlerjake/pithy-jaunt-daytona:latest`

You need to push one of these to a registry before Daytona can use it.

