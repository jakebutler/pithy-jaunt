# How to Test Task Execution Locally

## Quick Start (3 Steps)

### Step 1: Set Your API Keys

```bash
export OPENAI_API_KEY="sk-your-openai-key-here"
export GITHUB_TOKEN="ghp_your-github-token-here"  # Optional if using --skip-pr
```

### Step 2: Run the Test Script

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Update README.md to add installation instructions" \
  --skip-pr
```

### Step 3: Review the Results

The script will:
- Clone your repository
- Generate a patch using the AI agent
- Apply the patch
- Show you the changes
- Keep everything local (no PR created with `--skip-pr`)

## Detailed Examples

### Example 1: Test a Simple README Update

```bash
# Set API keys
export OPENAI_API_KEY="sk-..."
export GITHUB_TOKEN="ghp_..."  # Optional

# Run test
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Update README.md to add a new section about installation" \
  --skip-pr
```

**What happens:**
1. Script clones your repo to `/tmp/pj-local-test-*`
2. Creates a branch `pj/local-test-*`
3. Runs AI agent to generate patch
4. Applies the patch
5. Shows you the changes
6. Keeps workspace for review (doesn't push or create PR)

**Output:**
```
========================================
Local Task Execution Test
========================================

Repository: https://github.com/your-username/your-repo
Task: Update README.md to add a new section about installation
Task ID: local-test-1234567890
Branch: pj/local-test-1234567890
Provider: openai
Model: gpt-4o
Workspace: /tmp/pj-local-test-1234567890

Starting execution...

[pj] ========================================
[pj] Starting execution for task: local-test-1234567890
...
[pj] Patch generated successfully
[pj] Patch applied successfully
...

✓ Task execution completed successfully!

Workspace Directory: /tmp/pj-local-test-1234567890
Execution Log: /tmp/pj-local-test-1234567890/execution.log
Repository Location: /tmp/pj-local-test-1234567890/repo

To review changes:
  cd /tmp/pj-local-test-1234567890/repo
  git status
  git diff
```

### Example 2: Test Without Pushing to Remote

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Add error handling to the login function" \
  --skip-pr \
  --skip-push
```

This keeps everything completely local - no remote changes at all.

### Example 3: Test with Full PR Creation

```bash
# Make sure GITHUB_TOKEN is set
export GITHUB_TOKEN="ghp_..."

# Run test (will create PR)
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Update README.md to add installation instructions"
```

**Note:** This will actually create a PR in your repository!

### Example 4: Test with Anthropic

```bash
export ANTHROPIC_API_KEY="sk-ant-..."

./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Fix a bug in the authentication logic" \
  --provider anthropic \
  --model claude-3-5-sonnet-20241022 \
  --skip-pr
```

### Example 5: Keep Workspace for Debugging

```bash
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Your task description" \
  --skip-pr \
  --keep-workspace
```

The workspace will remain at `/tmp/pj-local-test-*` for inspection.

## Reviewing Results

### View Changes

```bash
# Navigate to workspace
cd /tmp/pj-local-test-*/repo

# Check git status
git status

# View changes
git diff

# View specific file changes
git diff README.md
```

### View Execution Log

```bash
# View full execution log
cat /tmp/pj-local-test-*/execution.log

# View last 50 lines
tail -50 /tmp/pj-local-test-*/execution.log

# Search for errors
grep -i error /tmp/pj-local-test-*/execution.log
```

### View Generated Patch

```bash
# View the patch that was generated
cat /tmp/patch.diff

# View patch with syntax highlighting (if you have bat or similar)
bat /tmp/patch.diff
```

## Common Use Cases

### Test Patch Generation Only

If you just want to test patch generation without the full execution:

```bash
./scripts/test-patch-generation.sh \
  /path/to/local/repo \
  "Update README.md"
```

### Test with Your Local Next.js App

If you want to test webhook integration:

```bash
# Terminal 1: Start your Next.js app
npm run dev

# Terminal 2: Run test with webhook
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Your task" \
  --webhook-url http://localhost:3000/api/webhook/daytona \
  --skip-pr
```

### Test Multiple Tasks Quickly

```bash
# Test task 1
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Update README.md" \
  --skip-pr

# Test task 2
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Add error handling" \
  --skip-pr

# Test task 3
./scripts/test-task-execution-local.sh \
  https://github.com/your-username/your-repo \
  "Fix bug in auth" \
  --skip-pr
```

## Troubleshooting

### Error: "OPENAI_API_KEY is required"

**Solution:**
```bash
export OPENAI_API_KEY="sk-your-key-here"
```

### Error: "Failed to clone repository"

**Solution:**
- Check the repository URL is correct
- Ensure the repository is public or you have access
- Verify your network connection

### Error: "Patch validation failed"

**Solution:**
1. Check the patch file:
   ```bash
   cat /tmp/patch.diff
   ```

2. Review the error in the execution log:
   ```bash
   grep -A 10 "validation failed" /tmp/pj-local-test-*/execution.log
   ```

3. The patch may have context mismatches - this is what we're trying to fix!

### Error: "Failed to create pull request"

**Solution:**
- Verify `GITHUB_TOKEN` is set and valid
- Check the token has `repo` permissions
- Use `--skip-pr` to test without PR creation

### Script is Slow

**This is normal:**
- First run: May take 1-2 minutes (AI agent generates patch)
- Subsequent runs: Usually faster (cached responses)
- Complex tasks: May take longer

## Tips

1. **Start Simple**: Test with "Update README.md" before complex tasks
2. **Use --skip-pr**: Faster iteration when you don't need PRs
3. **Check Logs**: Always review execution logs for detailed errors
4. **Test Incrementally**: Fix one issue at a time
5. **Keep Workspaces**: Use `--keep-workspace` to inspect results

## What Gets Created

When you run the script:

```
/tmp/pj-local-test-1234567890/
├── execution.log          # Full execution log
└── repo/                  # Cloned repository
    ├── README.md          # (modified)
    └── ...                # Other files
```

The workspace is automatically cleaned up unless you use `--keep-workspace`.

## Next Steps

1. ✅ Test locally with simple tasks
2. ✅ Fix any issues you find
3. ✅ Test with more complex tasks
4. ✅ Deploy to production when ready

## Related Scripts

- `scripts/test-patch-generation.sh` - Test patch generation only
- `scripts/test-task-execution-local.sh` - Test full execution flow
- `daytona/execution.sh` - The actual execution script (runs in Daytona)

