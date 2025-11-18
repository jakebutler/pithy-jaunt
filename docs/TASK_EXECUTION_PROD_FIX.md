# Task Execution Production Fix

## Problem Summary

Tasks were failing in production with patch application errors, even though they worked locally. The error showed:

```
error: patch failed: README.md:1
error: README.md: patch does not apply
```

The patch was looking for content that didn't match the repository state in production.

## Root Cause

The `BASE_BRANCH` environment variable was **not being passed** to the execution script. This caused:

1. The execution script to default to `main` branch
2. The repository to be cloned/checked out on the wrong branch
3. The patch to be generated against file contents from the wrong branch
4. Patch application to fail because the context lines didn't match

## Fixes Applied

### 1. Pass BASE_BRANCH to Execution Script ✅

**Files Modified:**
- `lib/daytona/client.ts` - Added `BASE_BRANCH: params.branch` to env vars
- `lib/daytona/sdk-client.ts` - Added `BASE_BRANCH: params.branch` to env vars

**What it does:**
- Ensures the actual repository branch (from `repo.branch`) is passed to the execution script
- The execution script now uses the correct branch instead of defaulting to "main"

### 2. Improved Repository Cloning ✅

**File Modified:**
- `daytona/execution.sh` - Enhanced cloning and branch checkout logic

**What it does:**
- Clones with the specific branch if `BASE_BRANCH` is set: `git clone -b "$BASE_BRANCH" --single-branch`
- Fetches latest changes: `git fetch origin`
- Pulls latest changes: `git pull origin "$BASE_BRANCH"`
- Better error handling and fallback logic

### 3. Explicit Two-Step Patch Generation ✅

**File Modified:**
- `daytona/execution.sh` - Added explicit `--use-two-step` flag

**What it does:**
- Ensures the two-step approach is used (reads files first, then generates patch using git diff)
- This approach is more reliable because:
  1. Reads actual file contents from the repository
  2. Generates modified file content
  3. Uses `git diff` to create the patch (ensures correct context lines)

### 4. Enhanced Logging and Validation ✅

**File Modified:**
- `daytona/execution.sh` - Added repository state verification

**What it does:**
- Logs current branch and commit before generating patch
- Verifies repository is in clean state
- Helps debug issues if they occur

## How the Two-Step Approach Works

1. **Read Files**: The agent reads the actual file contents from the repository (after checking out the correct branch)
2. **Generate Modified Content**: The LLM generates the complete modified file content (not a diff)
3. **Create Patch**: Uses `git diff --no-index` to create a unified diff patch
4. **Apply Patch**: The patch is applied using `git apply`

This ensures the patch context lines match exactly because:
- Files are read from the same repository state that will receive the patch
- Git generates the diff, ensuring correct format and context
- No manual diff formatting that could introduce errors

## Testing

To verify the fix works:

1. **Local Testing** (already working):
   ```bash
   ./scripts/test-task-execution-local.sh \
     https://github.com/owner/repo \
     "Update README.md" \
     --skip-pr
   ```

2. **Production Testing**:
   - Create a task in production
   - Execute it
   - Verify the patch applies successfully
   - Check logs to confirm correct branch is used

## Expected Behavior After Fix

1. ✅ Repository is cloned with the correct branch
2. ✅ Latest changes are fetched and pulled
3. ✅ Files are read from the correct branch/commit
4. ✅ Patch is generated using two-step approach (git diff)
5. ✅ Patch applies successfully because context matches

## Monitoring

Watch for these log messages in production:
- `[pj] Base branch: <correct-branch>` (should match repo.branch)
- `[pj] Using two-step patch generation approach`
- `[pj] Current branch: <branch>`
- `[pj] Current commit: <commit-hash>`

If patch failures still occur, check:
1. Is BASE_BRANCH being set correctly?
2. Is the repository branch correct in the database?
3. Are there uncommitted changes in the repository?
4. Do the file contents match what the patch expects?

## Related Files

- `lib/daytona/client.ts` - REST API client
- `lib/daytona/sdk-client.ts` - SDK client
- `daytona/execution.sh` - Execution script
- `daytona/agent-runner.py` - Patch generation agent
- `app/api/task/[taskId]/execute/route.ts` - Task execution endpoint

