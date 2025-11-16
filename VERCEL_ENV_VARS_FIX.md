# Fix Vercel Middleware Error

## Error: `MIDDLEWARE_INVOCATION_FAILED`

This error occurs when the middleware can't access required environment variables.

## Quick Fix

### Step 1: Check Environment Variables in Vercel

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your `pithy-jaunt` project
3. Go to **Settings** → **Environment Variables**
4. Verify these are set (they're required for middleware):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 2: Add Missing Variables

If they're missing, add them:

1. Click **"Add New"**
2. Add each variable:
   - **Key:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** Your Supabase project URL (from Supabase dashboard)
   - **Environment:** Select all (Production, Preview, Development)
3. Repeat for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 3: Redeploy

After adding variables:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger a new deployment

## All Required Environment Variables

Make sure these are set in Vercel:

### Required for Middleware (causes 500 error if missing):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Required for App Functionality:
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `GITHUB_TOKEN`
- `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`)
- `DAYTONA_API_KEY`
- `DAYTONA_API_URL`
- `NEXT_PUBLIC_APP_URL` (set to your Vercel URL)

## Verify Variables Are Set

After redeploying, check the logs:

1. Go to **Deployments** → Latest deployment → **Logs**
2. Look for any errors about missing environment variables
3. The middleware will now log clearer error messages if variables are missing

## Still Having Issues?

1. **Check Vercel logs** for the specific error message
2. **Verify Supabase credentials** are correct
3. **Make sure you redeployed** after adding environment variables
4. **Check variable names** match exactly (case-sensitive, no extra spaces)

