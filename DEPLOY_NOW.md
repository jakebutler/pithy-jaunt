# Deploy to Vercel - Quick Steps

## ✅ Code is Pushed to GitHub

Your code has been pushed to: `jakebutler/pithy-jaunt`

## 🚀 Deploy to Vercel

### Option 1: Via Web Interface (Easiest)

1. **Go to:** https://vercel.com/new
2. **Sign in** with GitHub
3. **Import Repository:**
   - Search for: `pithy-jaunt`
   - Click "Import"
4. **Configure Project:**
   - Framework: Next.js (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
5. **Set Environment Variables** (IMPORTANT - do this before deploying):
   - Click "Environment Variables"
   - Add all variables from your `.env.local`
   - **Critical:** Set `NEXT_PUBLIC_APP_URL` to your Vercel URL after first deploy
6. **Click "Deploy"**
7. **Wait for build** (2-3 minutes)
8. **Get your URL:** `https://your-app.vercel.app`

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: pithy-jaunt
# - Directory: ./
# - Override settings? No

# Set environment variables
vercel env add NEXT_PUBLIC_APP_URL
# Enter: https://your-app.vercel.app (after first deploy)

# Add all other env vars
vercel env add DAYTONA_API_KEY
vercel env add OPENAI_API_KEY
# ... etc
```

## 📋 Environment Variables Checklist

Copy these from your `.env.local` to Vercel:

### Required
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `CONVEX_DEPLOYMENT` (production URL)
- [ ] `NEXT_PUBLIC_CONVEX_URL` (production URL)
- [ ] `NEXT_PUBLIC_APP_URL` (set to Vercel URL after deploy)
- [ ] `GITHUB_TOKEN`
- [ ] `OPENAI_API_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `DAYTONA_API_KEY`
- [ ] `DAYTONA_API_URL` (https://app.daytona.io/api)

### Optional
- [ ] `CODERABBIT_API_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `GALILEO_API_KEY`

## 🔄 Deploy Convex to Production First

**Before deploying Next.js**, deploy Convex:

```bash
npx convex deploy --prod
```

This gives you production Convex URLs. Use these in Vercel env vars.

## ✅ After Deployment

1. **Update `NEXT_PUBLIC_APP_URL`** in Vercel to your actual Vercel URL
2. **Redeploy** so the change takes effect
3. **Test task execution** - Should work now!
4. **Check Vercel logs** for webhook activity

## 🎯 Quick Test

After deployment:
1. Go to: `https://your-app.vercel.app`
2. Create a task
3. Execute it
4. Check Vercel logs → Should see `[Daytona Webhook] Received webhook`
5. Task should complete and show PR URL!

