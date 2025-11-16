# Deploy to Production - Recommended for Testing

## Why Deploy to Production?

**The Problem:**
- Your `WEBHOOK_URL` is likely set to `http://localhost:3000`
- Daytona workspaces **cannot reach localhost** - they're in remote environments
- The execution script can't send webhooks back to your app
- Task status never updates, so it stays "running" forever

**The Solution:**
- Deploy to production (Vercel is easiest)
- Production URL is publicly accessible
- Daytona can reach it for webhooks
- Much easier to debug with production logs

## Quick Deploy to Vercel

### Step 1: Push to GitHub (if not already)

```bash
git add .
git commit -m "Ready for production deployment"
git push
```

### Step 2: Deploy to Vercel

1. **Go to:** https://vercel.com
2. **Sign in** with GitHub
3. **Click "Add New Project"**
4. **Import your repository:** `pithy-jaunt`
5. **Vercel will auto-detect Next.js** - just click "Deploy"

### Step 3: Set Environment Variables

In Vercel dashboard → Your Project → Settings → Environment Variables, add:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key

# Convex (Production)
CONVEX_DEPLOYMENT=your_prod_convex_url
NEXT_PUBLIC_CONVEX_URL=your_prod_convex_url

# App URL (IMPORTANT - Vercel will set this, but verify)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# GitHub
GITHUB_TOKEN=your_token

# LLM Providers
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key

# Daytona
DAYTONA_API_KEY=your_key
DAYTONA_API_URL=https://app.daytona.io/api

# Other services...
```

**Important:** After adding env vars, **redeploy** so they take effect.

### Step 4: Deploy Convex to Production

```bash
npx convex deploy --prod
```

Update `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` in Vercel with production values.

### Step 5: Test

1. **Go to your production URL:** `https://your-app.vercel.app`
2. **Create a task**
3. **Execute it**
4. **Check Vercel logs** for webhook activity
5. **Task should complete** and show PR URL!

## Benefits of Production Deployment

✅ **Public webhook URL** - Daytona can reach it  
✅ **Real logs** - Vercel dashboard shows all logs  
✅ **No ngrok needed** - No local port forwarding  
✅ **Easier debugging** - Production logs are accessible  
✅ **Real environment** - Tests actual deployment  

## Monitoring

**Vercel Logs:**
- Go to Vercel dashboard → Your Project → Logs
- See all webhook requests: `[Daytona Webhook] Received webhook`
- See task execution: `[TASK EXECUTE] Starting task execution`

**Task Status:**
- Check your app: `https://your-app.vercel.app/tasks/[taskId]`
- Should update to "completed" when webhook is received

## After Deployment

Once deployed, the webhook URL will automatically be:
```
https://your-app.vercel.app/api/webhook/daytona
```

Daytona can reach this, so:
1. ✅ Execution script can send webhooks
2. ✅ Task status will update
3. ✅ You'll see logs in Vercel dashboard
4. ✅ Everything will work!

## Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables set in Vercel
- [ ] Convex deployed to production
- [ ] Production URL updated in Convex env vars
- [ ] Vercel deployment successful
- [ ] Test task execution
- [ ] Check Vercel logs for webhooks

