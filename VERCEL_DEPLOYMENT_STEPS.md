# Vercel Deployment Steps

## After Code is Pushed to GitHub

### Step 1: Connect Repository to Vercel

1. **Go to:** https://vercel.com
2. **Sign in** with your GitHub account
3. **Click "Add New Project"** or "Import Project"
4. **Select your repository:** `pithy-jaunt` (or `jakebutler/pithy-jaunt`)
5. **Vercel will auto-detect:**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Step 2: Configure Build Settings

Vercel should auto-detect everything, but verify:
- **Framework Preset:** Next.js
- **Root Directory:** `./` (root)
- **Build Command:** `npm run build` (or leave default)
- **Output Directory:** `.next` (or leave default)
- **Install Command:** `npm install` (or leave default)

### Step 3: Set Environment Variables

**Before deploying**, click "Environment Variables" and add all of these:

#### Required Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key

# Convex (Production)
CONVEX_DEPLOYMENT=your_prod_convex_url
NEXT_PUBLIC_CONVEX_URL=your_prod_convex_url

# App URL (Vercel will set this automatically, but verify)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# GitHub
GITHUB_TOKEN=your_github_token

# LLM Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Daytona
DAYTONA_API_KEY=your_daytona_key
DAYTONA_API_URL=https://app.daytona.io/api

# Optional Services
CODERABBIT_API_KEY=your_key
RESEND_API_KEY=your_key
GALILEO_API_KEY=your_key
```

**Important Notes:**
- Set `NEXT_PUBLIC_APP_URL` to your Vercel URL **after** first deployment
- Or Vercel will auto-set it, but you may need to update it manually
- All `NEXT_PUBLIC_*` variables are exposed to the browser
- Keep secrets (API keys) out of `NEXT_PUBLIC_*` variables

### Step 4: Deploy Convex to Production First

**Before deploying Next.js**, deploy Convex:

```bash
npx convex deploy --prod
```

This will give you production Convex URLs. Update these in Vercel:
- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`

### Step 5: Deploy to Vercel

1. **Click "Deploy"** in Vercel
2. **Wait for build** (usually 2-3 minutes)
3. **Get your production URL:** `https://your-app.vercel.app`

### Step 6: Update App URL

After deployment, update `NEXT_PUBLIC_APP_URL` in Vercel:
1. Go to Settings → Environment Variables
2. Edit `NEXT_PUBLIC_APP_URL`
3. Set to: `https://your-actual-vercel-url.vercel.app`
4. **Redeploy** so the change takes effect

### Step 7: Verify Deployment

1. **Visit your production URL**
2. **Test login/signup**
3. **Create a test task**
4. **Execute the task**
5. **Check Vercel logs** for webhook activity

## Monitoring Production

### View Logs

1. **Vercel Dashboard** → Your Project → Logs
2. **Filter by:** `[Daytona Webhook]` or `[TASK EXECUTE]`
3. **Real-time logs** show all webhook requests

### Check Task Execution

1. **Create a task** in production app
2. **Execute it**
3. **Watch Vercel logs** for:
   - `[TASK EXECUTE] Starting task execution`
   - `[Daytona] Creating workspace`
   - `[Daytona Webhook] Received webhook`
   - `[Daytona Webhook] Task completed`

## Troubleshooting

### Build Fails

- Check Vercel build logs
- Verify all dependencies are in `package.json`
- Check for TypeScript errors

### Environment Variables Not Working

- Make sure you **redeployed** after adding env vars
- Check variable names match exactly (case-sensitive)
- Verify `NEXT_PUBLIC_*` variables are set correctly

### Webhooks Not Working

- Verify `NEXT_PUBLIC_APP_URL` is set to production URL
- Check Vercel logs for webhook requests
- Ensure URL is publicly accessible

## Next Steps After Deployment

1. ✅ Test task execution
2. ✅ Verify webhooks are received
3. ✅ Check GitHub for branches/PRs
4. ✅ Monitor Vercel logs
5. ✅ Update documentation with production URL

