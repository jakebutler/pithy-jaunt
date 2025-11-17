# Manual Render Deployment for GitIngest Service

Since Render requires payment information to create services via API, here are the manual steps to deploy:

## Step 1: Create Web Service in Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `https://github.com/jakebutler/pithy-jaunt`
4. Configure the service:

### Basic Settings
- **Name**: `gitingest-service`
- **Region**: Oregon (or closest to you)
- **Branch**: `main`
- **Root Directory**: `apps/gitingest`
- **Runtime**: Python 3 (Render will auto-detect Python 3.11 from `runtime.txt`)
- **Build Command**: `./scripts/render-ignore-build.sh && pip install --upgrade pip && pip install -r requirements.txt`
  
  **Note**: The script checks if files in `apps/gitingest/` changed. If only files outside this directory changed, the build is skipped.
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Plan
- Select **Free** plan for MVP/testing (see `docs/RENDER_FREE_TIER_ANALYSIS.md` for impact)
- Or **Starter** plan ($7/month) for production to avoid cold starts

### Auto-Deploy
- Enable "Auto-Deploy" so it deploys on every push to main

## Step 2: Set Environment Variables

In the Render dashboard, go to your service → Environment → Add the following:

```
INGEST_API_KEY=your_shared_secret_key_here
GH_TOKEN=your_github_token_optional
LOG_LEVEL=info
ENV=production
MAX_TIMEOUT=300
```

**Important**: 
- `INGEST_API_KEY` should be a strong random string (generate one with: `openssl rand -hex 32`)
- This same key must be set in Vercel as `GIT_INGEST_API_KEY`
- `GH_TOKEN` is optional but recommended if you need to access private repos

## Step 3: Get Service URL

After deployment, Render will provide a URL like:
```
https://gitingest-service.onrender.com
```

Copy this URL - you'll need it for the next step.

## Step 4: Update Vercel Environment Variables

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add:

```
GIT_INGEST_BASE_URL=https://gitingest-service.onrender.com
GIT_INGEST_API_KEY=your_shared_secret_key_here
```

**Important**: The `GIT_INGEST_API_KEY` must match the `INGEST_API_KEY` you set in Render.

## Step 5: Test the Deployment

1. Check the Render service logs to ensure it started successfully
2. Test the health endpoint:
   ```bash
   curl https://gitingest-service.onrender.com/health
   ```
   Should return: `{"status":"healthy","service":"gitingest","version":"1.0.0"}`

3. Connect a repository in your app and verify GitIngest report generation works

## Troubleshooting

### Service won't start
- Check Render logs for errors
- Verify `requirements.txt` is correct
- Ensure Python 3.11 is selected (Render should auto-detect)

### Authentication errors
- Verify `INGEST_API_KEY` matches between Render and Vercel
- Check the Authorization header format: `Bearer <key>`

### Webhook callbacks failing
- Verify `NEXT_PUBLIC_APP_URL` is set correctly in Vercel
- Check that the callback URL is publicly accessible
- Review Render service logs for webhook delivery attempts

## Next Steps

After successful deployment:
1. Test repository connection with GitIngest integration
2. Monitor Render service logs for any issues
3. Consider setting up monitoring/alerting for the service
4. Integrate actual GitIngest Python library (currently placeholder)

