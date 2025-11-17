# GitIngest Production Testing Guide

## ✅ Pre-Flight Check

All systems verified:
- ✅ GitIngest service is healthy: `https://pithy-jaunt.onrender.com`
- ✅ Health endpoint responding correctly
- ✅ Vercel build successful
- ✅ Environment variables configured

## 🧪 Testing Steps

### 1. Test Repository Connection

1. Go to your Vercel app: `https://your-app.vercel.app`
2. Navigate to **Repositories** page
3. Click **Connect Repository**
4. Enter a test repository URL (e.g., `https://github.com/jakebutler/pithy-jaunt`)
5. Click **Connect**

### 2. Verify GitIngest Integration

**What to check:**

1. **Repository Connection:**
   - Repository should connect successfully
   - Should redirect to repository detail page

2. **GitIngest Report Status:**
   - On repository detail page, look for "Repository Report" section
   - Status should show "processing" initially
   - After ~30 seconds, should change to "completed" or "failed"

3. **Vercel Logs:**
   - Go to Vercel dashboard → Your Project → Logs
   - Look for: `"Failed to trigger GitIngest report generation"` (if error)
   - Or successful API call to GitIngest service

4. **Render Logs:**
   - Go to Render dashboard → Your Service → Logs
   - Look for: `"Started ingest job"` message
   - Check for any errors during report generation
   - Look for webhook callback attempts

### 3. Verify Report Display

Once status is "completed":
- Repository detail page should show the GitIngest report
- Report should include:
  - Summary
  - Repository structure
  - Patterns & architecture
  - Dependencies
  - LLM context

### 4. Test Error Handling

**Test with invalid repository:**
- Try connecting a non-existent repository
- Should show appropriate error message
- GitIngest should not be called

**Test with GitIngest service down:**
- If service is sleeping (free tier), first request may timeout
- Repository connection should still succeed
- Report status should show "pending" or "failed"
- User can manually retry later

## 🔍 Monitoring

### Vercel Logs
- Watch for GitIngest API calls
- Check for authentication errors
- Monitor webhook callback receipts

### Render Logs
- Watch for incoming `/ingest` requests
- Monitor report generation progress
- Check webhook callback delivery

### Convex Database
- Check `repos` table for `gitingestReport` field
- Verify `gitingestReportStatus` updates correctly
- Check `gitingestReportGeneratedAt` timestamp

## 🐛 Common Issues

### Issue: Report Status Stuck on "processing"
**Possible causes:**
- GitIngest service is sleeping (free tier cold start)
- Webhook callback failed
- Report generation timed out

**Solution:**
- Wait 1-2 minutes for service to wake up
- Check Render logs for errors
- Manually trigger report generation via UI

### Issue: "Failed to trigger GitIngest report generation"
**Possible causes:**
- `GIT_INGEST_BASE_URL` not set in Vercel
- `GIT_INGEST_API_KEY` doesn't match Render's `INGEST_API_KEY`
- Service URL incorrect

**Solution:**
- Verify environment variables in Vercel
- Check API keys match between services
- Test health endpoint manually

### Issue: Webhook Callback Not Received
**Possible causes:**
- `NEXT_PUBLIC_APP_URL` not set correctly
- Callback endpoint not accessible
- Network/firewall issues

**Solution:**
- Verify `NEXT_PUBLIC_APP_URL` in Vercel
- Test callback endpoint: `curl -X POST https://your-app.vercel.app/api/repo/gitingest-callback`
- Check Render logs for webhook delivery attempts

## ✅ Success Criteria

You'll know everything is working when:
1. ✅ Repository connects successfully
2. ✅ GitIngest report status changes from "processing" to "completed"
3. ✅ Report displays on repository detail page
4. ✅ No errors in Vercel or Render logs
5. ✅ Report data is stored in Convex database

## 📝 Next Steps After Testing

Once everything works:
1. Test with multiple repositories
2. Verify report quality (currently placeholder, will improve with actual GitIngest library)
3. Monitor for any performance issues
4. Consider upgrading Render to Starter plan if cold starts are problematic

