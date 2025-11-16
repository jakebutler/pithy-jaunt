# Fix Daytona "fetch failed" Error

## Error: `{"error":"Failed to create workspace","details":"fetch failed"}`

This error occurs when the application cannot connect to the Daytona API.

## Quick Fix

### Step 1: Check Environment Variables in Vercel

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your `pithy-jaunt` project
3. Go to **Settings** → **Environment Variables**
4. Verify these are set:

```
DAYTONA_API_URL=https://app.daytona.io/api
DAYTONA_API_KEY=your_daytona_api_key
```

### Step 2: Verify Daytona API URL

The default URL should be: `https://app.daytona.io/api`

**Important:** Make sure:
- The URL uses `https://` (not `http://`)
- The URL ends with `/api` (not `/api/` or without `/api`)
- No trailing slashes

### Step 3: Get Your Daytona API Key

1. Go to https://app.daytona.io
2. Sign in to your account
3. Go to **Settings** → **API Keys** (or similar)
4. Create a new API key or copy an existing one
5. Add it to Vercel as `DAYTONA_API_KEY`

### Step 4: Redeploy

After adding/updating variables:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**

## Common Issues

### Issue 1: Missing Environment Variables

**Symptom:** Error says "fetch failed" with no additional details

**Fix:** Add `DAYTONA_API_URL` and `DAYTONA_API_KEY` to Vercel environment variables

### Issue 2: Incorrect API URL

**Symptom:** DNS lookup failed or connection refused

**Fix:** 
- Verify the URL is `https://app.daytona.io/api`
- Check for typos
- Make sure it's using HTTPS

### Issue 3: Invalid API Key

**Symptom:** 401 Unauthorized or 403 Forbidden

**Fix:**
- Regenerate your API key in Daytona dashboard
- Update `DAYTONA_API_KEY` in Vercel
- Make sure there are no extra spaces or quotes

### Issue 4: Network/SSL Issues

**Symptom:** SSL/TLS errors or certificate errors

**Fix:**
- Verify the URL uses HTTPS
- Check if your Vercel deployment can reach external APIs
- Contact Daytona support if the API is down

## Verify Configuration

After redeploying, check the Vercel logs:

1. Go to **Deployments** → Latest deployment → **Logs**
2. Look for `[Daytona] Creating workspace:` log entries
3. Check for any error messages about:
   - Missing API key
   - Incorrect URL
   - Connection errors

## Test the Connection

You can test if the Daytona API is reachable by checking the logs. The improved error handling will now show:
- Connection refused → URL is wrong or service is down
- DNS lookup failed → URL is incorrect
- Timeout → API is slow or unreachable
- SSL error → HTTPS configuration issue

## Still Having Issues?

1. **Check Vercel logs** for the specific error message (now more detailed)
2. **Verify Daytona API is accessible** from your browser: https://app.daytona.io
3. **Test the API key** by making a manual request (use curl or Postman)
4. **Contact Daytona support** if the API appears to be down

