# GitIngest Production Readiness Checklist

Use this checklist to verify everything is set up and ready to test.

## ✅ Render Service (GitIngest)

- [ ] Service is deployed and running on Render
- [ ] Service URL is accessible (e.g., `https://gitingest-service.onrender.com`)
- [ ] Health endpoint works: `curl https://gitingest-service.onrender.com/health`
- [ ] Environment variables set in Render:
  - [ ] `INGEST_API_KEY` = (your shared secret)
  - [ ] `LOG_LEVEL` = `info`
  - [ ] `ENV` = `production`
  - [ ] `MAX_TIMEOUT` = `300`
- [ ] Build command includes ignore script: `./scripts/render-ignore-build.sh && pip install --upgrade pip && pip install -r requirements.txt`
- [ ] Service logs show no errors

## ✅ Vercel App (Next.js)

- [ ] App is deployed and running on Vercel
- [ ] Environment variables set in Vercel:
  - [ ] `GIT_INGEST_BASE_URL` = `https://gitingest-service.onrender.com` (your Render URL)
  - [ ] `GIT_INGEST_API_KEY` = (same value as `INGEST_API_KEY` in Render)
  - [ ] `NEXT_PUBLIC_APP_URL` = (your Vercel app URL)
- [ ] Ignore build step configured: `bash ./scripts/vercel-ignore-build.sh`
- [ ] App builds successfully

## ✅ Integration Test

1. **Test GitIngest Health Endpoint:**
   ```bash
   curl https://gitingest-service.onrender.com/health
   ```
   Should return: `{"status":"healthy","service":"gitingest","version":"1.0.0"}`

2. **Test Repository Connection:**
   - Go to your Vercel app
   - Navigate to repositories page
   - Connect a test repository
   - Check Vercel logs for GitIngest service call
   - Check Render logs for report generation

3. **Verify Report Generation:**
   - After connecting a repo, check the repository detail page
   - Should show "Repository Report" section
   - Status should change from "processing" to "completed"
   - Report should display when complete

## 🔍 Troubleshooting

### GitIngest Service Not Responding
- Check Render service logs
- Verify service is not in "sleep" mode (free tier)
- Test health endpoint directly

### Authentication Errors
- Verify `GIT_INGEST_API_KEY` in Vercel matches `INGEST_API_KEY` in Render
- Check Authorization header format: `Bearer <key>`

### Webhook Callbacks Failing
- Verify `NEXT_PUBLIC_APP_URL` is set correctly in Vercel
- Check that `/api/repo/gitingest-callback` endpoint is accessible
- Review Render logs for webhook delivery attempts

### Reports Not Appearing
- Check Convex database for `gitingestReport` field
- Verify webhook callback was received (check Vercel logs)
- Check repository detail page for error messages

## 📝 Quick Test Commands

```bash
# Test GitIngest health
curl https://gitingest-service.onrender.com/health

# Test GitIngest with API key (replace with your key)
curl -X POST https://gitingest-service.onrender.com/ingest \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/jakebutler/pithy-jaunt",
    "branch": "main",
    "callbackUrl": "https://your-vercel-app.vercel.app/api/repo/gitingest-callback"
  }'
```

