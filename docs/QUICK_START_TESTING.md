# Quick Start: Testing Task Execution

## The Problem We Solved

You asked: **"Is there an easier and quicker way to test task execution without deploying to production every time?"**

**Answer: YES!** We've created two solutions:

1. **Local Testing Script** - Test the full execution flow locally
2. **Declarative Images** - No more manual Docker builds/pushes

## Solution 1: Local Testing (Fastest for Development)

### Test a Simple README Update

```bash
# Set your API keys
export OPENAI_API_KEY="your-key"
export GITHUB_TOKEN="your-token"  # Optional if using --skip-pr

# Test updating a README
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Update README.md to add installation instructions" \
  --skip-pr
```

**What happens:**
- ✅ Clones your repository locally
- ✅ Creates a branch
- ✅ Runs AI agent to generate patch
- ✅ Applies the patch
- ✅ Shows you the changes
- ✅ No PR created (with `--skip-pr`)
- ✅ No deployment needed
- ✅ Fast feedback loop

**Time:** ~30 seconds to 2 minutes (depending on task complexity)

### Test Without Pushing to Remote

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Your task description" \
  --skip-pr \
  --skip-push
```

This keeps everything completely local - no remote changes at all.

## Solution 2: Declarative Images (Better for Production)

### What Changed

**Before (Old Way):**
```bash
# Build Docker image
docker build -t butlerjake/pithy-jaunt-daytona:v1.0.4 .

# Push to registry
docker push butlerjake/pithy-jaunt-daytona:v1.0.4

# Create snapshot in Daytona
# Update environment variables
# Deploy
# Test
# Repeat for every change... 😫
```

**After (New Way):**
```typescript
// Image is defined in code (lib/daytona/declarative-image.ts)
// Daytona builds it automatically
// No manual steps needed! 🎉
```

### Benefits

1. **No Manual Docker Management**
   - No `docker build` / `docker push`
   - No Docker registry management
   - No version tagging

2. **Version Controlled**
   - Image definition in Git
   - Easy to review changes
   - Track image evolution

3. **Faster Iteration**
   - Modify image in code
   - Test locally
   - Deploy immediately

4. **Automatic Caching**
   - Daytona caches for 24 hours
   - Subsequent builds are instant
   - Same definition = cached build

### How It Works

1. **Image Definition** (in `lib/daytona/declarative-image.ts`):
   ```typescript
   export function buildPithyJauntImage(): Image {
     return Image.base("ubuntu:22.04")
       .runCommands("apt-get update && apt-get install -y git curl jq")
       .pipInstall(["openai", "anthropic"])
       .addLocalFile("daytona/execution.sh", "/app/execution.sh")
       // ... more configuration
   }
   ```

2. **Automatic Usage** (already enabled):
   - SDK client uses declarative images by default
   - Daytona builds on-demand
   - Caches for 24 hours

3. **First Run:**
   - Builds image (takes a few minutes)
   - Caches the result

4. **Subsequent Runs:**
   - Uses cached image (almost instant)

### Disable Declarative Images (Use Snapshots)

If you want to use pre-built snapshots instead:

```bash
# In .env.local
DAYTONA_USE_DECLARATIVE_IMAGE=false
DAYTONA_SNAPSHOT_NAME=butlerjake/pithy-jaunt-daytona:v1.0.4
```

## Recommended Workflow

### For Development & Testing

1. **Use Local Testing Script:**
   ```bash
   ./scripts/test-task-execution-local.sh \
     https://github.com/owner/repo \
     "Your task" \
     --skip-pr
   ```

2. **Iterate Quickly:**
   - Fix issues in code
   - Test again immediately
   - No deployment needed

3. **Once It Works:**
   - Commit changes
   - Deploy to production
   - Test with real task

### For Production

1. **Use Declarative Images** (default):
   - Image builds automatically
   - No manual steps
   - Version controlled

2. **Optional: Create Snapshot** (for instant startup):
   ```typescript
   import { createPithyJauntSnapshot } from "./lib/daytona/declarative-image";
   
   await createPithyJauntSnapshot(daytona, "pithy-jaunt-dev");
   ```

## Testing Checklist

### ✅ Simple Test (README Update)

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/test-repo \
  "Update README.md to add a new section" \
  --skip-pr
```

**Expected Result:**
- ✅ Patch generated
- ✅ Patch applied successfully
- ✅ Changes visible in workspace directory
- ✅ No errors

### ✅ Full Test (With PR)

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/test-repo \
  "Update README.md to add a new section"
```

**Expected Result:**
- ✅ Patch generated
- ✅ Patch applied
- ✅ Changes committed
- ✅ Branch pushed
- ✅ PR created
- ✅ Webhook sent (if app is running)

### ✅ Production Test

1. Deploy to production
2. Create a task in the UI
3. Execute the task
4. Monitor execution logs
5. Verify PR is created

## Troubleshooting

### Local Test Fails

**Check:**
- API keys are set correctly
- Repository URL is accessible
- Network connection is working

**Solution:**
- Review execution log: `/tmp/pj-local-test-*/execution.log`
- Check patch file: `cat /tmp/patch.diff`
- Verify repository access

### Declarative Image Build Fails

**Check:**
- All file paths in `declarative-image.ts` are correct
- Files exist in the repository
- Daytona API is accessible

**Solution:**
- Review build logs in Daytona dashboard
- Verify file paths
- Check Daytona API status

### Slow First Build

**This is normal!**
- First build takes a few minutes
- Subsequent builds use cache (almost instant)
- Cache lasts 24 hours

## Next Steps

1. ✅ **Test locally** with the test script
2. ✅ **Use declarative images** (already enabled)
3. ✅ **Deploy** when ready
4. ✅ **Monitor** first production run

## Resources

- [Local Testing Guide](./LOCAL_TESTING_GUIDE.md) - Detailed testing guide
- [Declarative Images Guide](./DECLARATIVE_IMAGES.md) - Complete declarative images documentation
- [Task Execution Troubleshooting](./TASK_EXECUTION_TROUBLESHOOTING.md) - Common issues and solutions

