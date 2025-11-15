# Testing Repository Connection with Pithy Jaunt Repo

## Prerequisites

1. ✅ Authentication system working
2. ✅ Convex deployed and connected
3. ✅ GitHub token configured in `.env.local`
4. ✅ Next.js dev server running
5. ✅ Convex dev server running

## Test Steps

### 1. Start Development Servers

```bash
# Terminal 1: Convex
npx convex dev

# Terminal 2: Next.js
npm run dev
```

### 2. Log In

1. Open http://localhost:3000
2. Sign in or create an account
3. You should be redirected to the dashboard

### 3. Navigate to Repositories Page

1. Go to http://localhost:3000/repos
2. You should see the repository list page with a connection form

### 4. Connect Pithy Jaunt Repository

1. In the "Connect a Repository" form, enter:
   ```
   https://github.com/jakebutler/pithy-jaunt
   ```
   Or simply:
   ```
   jakebutler/pithy-jaunt
   ```

2. Leave branch empty (will use default: `main`)

3. Click "Connect Repository"

### 5. Expected Behavior

**Success Case:**
- Form submits and shows loading state
- Redirects to repository detail page
- Repository appears in the list
- Status shows "analyzing" or "pending"
- CodeRabbit config detection works (should detect if `.coderabbit.yaml` exists)

**What Happens:**
1. ✅ URL validation passes
2. ✅ GitHub API validates repository (public, exists)
3. ✅ Repository metadata fetched
4. ✅ CodeRabbit config checked
5. ✅ Repository record created in Convex
6. ✅ Status set to "analyzing" or "pending"

### 6. Verify in Convex Dashboard

1. Go to https://dashboard.convex.dev
2. Navigate to your deployment
3. Check the `repos` table
4. You should see:
   - `owner`: "jakebutler"
   - `name`: "pithy-jaunt"
   - `url`: "https://github.com/jakebutler/pithy-jaunt"
   - `analyzerStatus`: "analyzing" or "pending"
   - `coderabbitDetected`: true/false (depending on if config exists)

### 7. Test Repository List

1. Go back to http://localhost:3000/repos
2. You should see the pithy-jaunt repository card
3. Click on it to view details

### 8. Test Repository Detail Page

1. Navigate to `/repos/[repoId]`
2. You should see:
   - Repository name and owner
   - Repository URL
   - Branch information
   - CodeRabbit analysis status
   - Analysis report (when available)

## Testing CodeRabbit Integration

### Manual Test (Future)

Once Daytona workspace is set up:

1. Create a task for the connected repository
2. Daytona workspace will be created
3. CodeRabbit config will be added (if missing)
4. PR will be created
5. CodeRabbit will review the PR
6. Webhook will receive the comment
7. Tasks will be created automatically

### Simulate CodeRabbit Webhook

For testing without actual CodeRabbit:

```bash
# Simulate a CodeRabbit PR comment
curl -X POST http://localhost:3000/api/webhook/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: issue_comment" \
  -d '{
    "action": "created",
    "repository": {
      "full_name": "jakebutler/pithy-jaunt"
    },
    "issue": {
      "pull_request": {}
    },
    "comment": {
      "user": {
        "login": "coderabbit[bot]"
      },
      "body": "## Summary\n\nCode analysis completed.\n\n- **High Priority Issue**: Security vulnerability found\n- **Medium Priority**: Code quality improvements needed\n- **Low Priority**: Minor style suggestions"
    }
  }'
```

## Common Issues

### Issue: "Repository already connected"
**Solution**: The repo is already in your list. Check `/repos` page.

### Issue: "GitHub API rate limit exceeded"
**Solution**: Wait a few minutes or use a GitHub token with higher limits.

### Issue: "Repository not found"
**Solution**: 
- Verify the URL is correct
- Check the repository is public
- Verify GitHub token has access

### Issue: Convex errors
**Solution**:
- Ensure Convex dev server is running
- Check Convex dashboard for errors
- Verify schema is deployed: `npx convex deploy`

## Next Steps After Testing

1. ✅ Verify repository connection works
2. ✅ Test duplicate prevention
3. ✅ Verify CodeRabbit config detection
4. ⏳ Set up GitHub webhooks (for production)
5. ⏳ Test CodeRabbit analysis flow (when Daytona is ready)
6. ⏳ Test task creation from CodeRabbit reports

## Test Checklist

- [ ] Can connect pithy-jaunt repository
- [ ] Repository appears in list
- [ ] Repository detail page loads
- [ ] CodeRabbit config detection works
- [ ] Duplicate connection is prevented
- [ ] Error messages are user-friendly
- [ ] Status updates correctly
- [ ] Convex data is stored correctly

---

**Ready to test!** Start with step 1 above.

