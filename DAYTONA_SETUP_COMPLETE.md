# Daytona Setup - Complete Instructions

## ✅ What's Ready

1. ✅ Docker image built: `pithy-jaunt/daytona:latest` (957MB)
2. ✅ Image tagged: `butlerjake/pithy-jaunt-daytona:latest`
3. ✅ All code updated to use Daytona workspaces
4. ✅ Execution script with error handling
5. ✅ Webhook handler ready

## 🚀 What You Need to Do

### Step 1: Push Docker Image

**Login to Docker Hub:**
```bash
docker login
```

**Push the image:**
```bash
docker push butlerjake/pithy-jaunt-daytona:latest
```

This will take a few minutes (957MB image). Wait for the "digest: sha256:..." message.

### Step 2: Create Template in Daytona Dashboard

**Go to:** https://app.daytona.io

**Navigate to Templates:**
- Look for "Templates" in sidebar
- OR "Settings" → "Templates"
- OR "Workspace Templates"

**Click "Create Template" or "New Template"**

**Fill in exactly:**
- **Name:** `pithy-jaunt-dev` (must match exactly)
- **Image:** `butlerjake/pithy-jaunt-daytona:latest`
- **Init Script:** `/app/execution.sh`
- **Timeout:** `25` minutes

**Click "Create" or "Save"**

**See detailed instructions:** `scripts/create-daytona-template-dashboard.md`

### Step 3: Verify Setup

**Check template exists:**
- Should see `pithy-jaunt-dev` in your templates list

**Check image is accessible:**
```bash
docker pull butlerjake/pithy-jaunt-daytona:latest
```

### Step 4: Test in Application

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Start ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Update `.env.local`:**
   ```env
   NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok-free.dev
   DAYTONA_API_KEY=your-key
   DAYTONA_API_URL=https://app.daytona.io/api
   ```

4. **Create and execute a task:**
   - Go to your app
   - Create a task
   - Click "Execute"
   - Check Daytona dashboard for workspace
   - Monitor execution logs

## 📋 Quick Reference

**Docker Image:** `butlerjake/pithy-jaunt-daytona:latest`

**Template Name:** `pithy-jaunt-dev`

**Init Script:** `/app/execution.sh`

**Timeout:** `25` minutes

## 🔧 Scripts Available

- `./scripts/push-docker-image.sh` - Push image to Docker Hub
- `./scripts/create-daytona-template.sh` - Create template via API (may not work)
- `./scripts/setup-daytona-complete.sh` - Complete automated setup

## 📚 Documentation

- `daytona/QUICK_START.md` - Quick start guide
- `daytona/SETUP.md` - Detailed setup guide
- `daytona/DAYTONA_TEMPLATE_SETUP.md` - Template setup instructions
- `scripts/create-daytona-template-dashboard.md` - Dashboard step-by-step

## ⚠️ Important Notes

1. **Template name must be exact:** `pithy-jaunt-dev` (defined in `lib/daytona/client.ts:52`)

2. **Image must be pushed before creating template** - Daytona will try to pull it

3. **Webhook URL must be publicly accessible** - Use ngrok for local testing

4. **API keys must be set** in `.env.local`:
   - `DAYTONA_API_KEY`
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
   - `GITHUB_TOKEN`
   - `NEXT_PUBLIC_APP_URL`

## 🎯 Ready to Test

Once you've:
- ✅ Pushed the Docker image
- ✅ Created the template in Daytona dashboard
- ✅ Set all environment variables

You can test task execution in your application!

