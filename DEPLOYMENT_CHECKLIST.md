# Production Deployment Checklist

## ✅ Step 1: Code Pushed to GitHub
- ✅ All code committed and pushed
- ✅ Repository: `jakebutler/pithy-jaunt`

## 🔄 Step 2: Deploy Convex to Production

Run this command:
```bash
npx convex deploy
```

(Convex deploys to production by default)

**After deployment, note these URLs:**
- Production Convex URL: `https://xxxxx.convex.cloud`
- Update these in Vercel environment variables

## 🚀 Step 3: Deploy to Vercel

### Via Web Interface:

1. **Go to:** https://vercel.com/new
2. **Sign in** with GitHub
3. **Import:** `jakebutler/pithy-jaunt`
4. **Configure:**
   - Framework: Next.js (auto-detected)
   - Root: `./`
   - Build: `npm run build`
5. **Add Environment Variables** (BEFORE deploying):
   
   Copy from your `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   CONVEX_DEPLOYMENT=https://xxxxx.convex.cloud
   NEXT_PUBLIC_CONVEX_URL=https://xxxxx.convex.cloud
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app (set after first deploy)
   GITHUB_TOKEN=...
   OPENAI_API_KEY=...
   ANTHROPIC_API_KEY=...
   DAYTONA_API_KEY=...
   DAYTONA_API_URL=https://app.daytona.io/api
   ```

6. **Click "Deploy"**
7. **Wait for build** (2-3 minutes)
8. **Get your URL:** `https://your-app.vercel.app`

## 🔧 Step 4: Update App URL

After first deployment:
1. Go to Vercel → Settings → Environment Variables
2. Edit `NEXT_PUBLIC_APP_URL`
3. Set to: `https://your-actual-vercel-url.vercel.app`
4. **Redeploy** (or it will auto-redeploy)

## ✅ Step 5: Test

1. Visit: `https://your-app.vercel.app`
2. Create a task
3. Execute it
4. Check Vercel logs for webhook activity
5. Task should complete!

## 📊 Monitoring

**Vercel Logs:**
- Dashboard → Your Project → Logs
- Filter: `[Daytona Webhook]` or `[TASK EXECUTE]`
- Real-time webhook monitoring

**Task Status:**
- Check app: `/tasks/[taskId]`
- Should update to "completed" when webhook received

