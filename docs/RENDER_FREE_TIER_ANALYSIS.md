# Render Free Tier Impact Analysis for GitIngest Service

## Free Tier Restrictions

### ✅ **Won't Impact Us:**

1. **No SSH access** - Not needed (deploying from GitHub)
2. **No scaling** - Not needed for MVP (single instance is fine)
3. **No one-off jobs** - Not needed
4. **No persistent disks** - Not needed (using in-memory job storage, which is fine since jobs are temporary)

### ⚠️ **Potential Impact:**

**Spins down after inactivity** - This is the main concern:

#### Impact Analysis:
- **Cold start delay**: First request after spin-down takes ~10-30 seconds to wake up
- **Our timeout**: Initial `/ingest` request has 30-second timeout
- **Risk**: If service is spun down, the first request might timeout

#### Mitigation:
1. **Webhook retries**: Our webhook callback has 3 retries with exponential backoff, so even if the first attempt fails during cold start, it will retry
2. **Async processing**: Report generation happens in background tasks, so the initial request returns immediately (202 Accepted)
3. **User experience**: Users see "processing" status, so a slight delay is acceptable
4. **Manual retry**: Users can manually retry if needed

#### Recommendation:
- **For MVP/Testing**: Free tier is acceptable
- **For Production**: Consider upgrading to Starter plan ($7/month) to avoid cold starts
- **Workaround**: Set up a simple cron job or health check ping to keep service warm (though this violates free tier terms)

## Python Version

**Yes, use Python 3** - Specifically Python 3.11 is recommended.

Render will auto-detect Python from your `requirements.txt`, but you can also specify it explicitly:

### Option 1: Let Render auto-detect (recommended)
- Render will detect Python from `requirements.txt`
- Will use latest Python 3.x (typically 3.11 or 3.12)

### Option 2: Specify explicitly
Create `apps/gitingest/runtime.txt`:
```
python-3.11.0
```

Or in Render dashboard, select "Python 3" or "Python 3.11" from the runtime dropdown.

## Conclusion

**Free tier is acceptable for MVP**, but be aware of:
- Potential cold start delays (10-30 seconds)
- First request after inactivity might timeout
- Webhook retries should handle most cases

**Upgrade to Starter plan ($7/month) when:**
- You have active users
- You need consistent performance
- Cold starts become a problem

