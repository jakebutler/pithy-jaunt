# Vercel Ignore Build Step Configuration

This document explains how to configure Vercel to skip builds when only GitIngest service files change.

## Problem

In a monorepo setup, changes to `apps/gitingest/` (deployed on Render) shouldn't trigger Vercel deployments. This saves build minutes and prevents unnecessary deployments.

## Solution

Vercel's "Ignore Build Step" feature allows you to run a script that determines whether to build. If the script exits with code 0, Vercel builds; if it exits with code 1, Vercel skips the build.

## Setup

### Step 1: Configure in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Git**
3. Scroll to **Ignore Build Step**
4. Enter the command:
   ```
   ./scripts/vercel-ignore-build.sh
   ```
5. Click **Save**

### Step 2: How It Works

The script (`scripts/vercel-ignore-build.sh`) checks which files changed in the commit:

- **If files outside `apps/gitingest/` changed**: Build runs (exit code 0)
- **If only `apps/gitingest/` files changed**: Build is skipped (exit code 1)
- **If no changes detected**: Build runs (safety default)

### Step 3: Testing

To test locally:

```bash
# Simulate only GitIngest changes
git diff HEAD~1 --name-only | grep -v "^apps/gitingest/" || echo "Only GitIngest changes"

# Run the script
./scripts/vercel-ignore-build.sh
```

## Alternative: Using Commit Messages

You can also use commit messages to control builds. Update the script to check for `[skip vercel]` or `[vercel skip]` in commit messages:

```bash
# In scripts/vercel-ignore-build.sh, add:
if git log -1 --pretty=%B | grep -q "\[skip vercel\]"; then
  echo "Commit message contains [skip vercel], skipping build..."
  exit 1
fi
```

Then use commits like:
```bash
git commit -m "fix: update GitIngest dependencies [skip vercel]"
```

## Render Configuration

Render also supports ignoring builds. In your Render service:

1. Go to **Settings** → **Build & Deploy**
2. Under **Build Command**, you can add a check:

```bash
# Only build if apps/gitingest/ files changed
if git diff --name-only HEAD~1 | grep -q "^apps/gitingest/"; then
  pip install --upgrade pip && pip install -r requirements.txt
else
  echo "No GitIngest changes, skipping build"
  exit 0
fi
```

However, Render's auto-deploy is typically fine since it only deploys when files in the root directory change.

## Benefits

- **Saves build minutes**: No unnecessary Vercel builds
- **Faster deployments**: Render deploys independently
- **Cleaner deployment history**: Only relevant deployments show up
- **Cost savings**: Fewer builds = lower costs (if on a paid plan)

## Troubleshooting

### Build is being skipped when it shouldn't

- Check the script output in Vercel build logs
- Verify the git diff is working correctly
- Ensure the script has execute permissions: `chmod +x scripts/vercel-ignore-build.sh`

### Build is running when it shouldn't

- Check if other files changed (maybe package.json, etc.)
- Review the script logic
- Check Vercel's build logs for the script output

## Manual Override

To force a build even if only GitIngest files changed:

1. Go to Vercel dashboard
2. Click **Deployments**
3. Click **Redeploy** on the latest deployment
4. Or use Vercel CLI: `vercel --force`

