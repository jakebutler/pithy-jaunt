# Runtime Script Updates

## Overview

Instead of rebuilding Docker images every time we update execution scripts, we now use a **bootstrap approach** that downloads the latest scripts from GitHub at runtime.

## How It Works

1. **Base Docker Image**: Contains only dependencies (Python, Git, etc.) and fallback scripts
2. **Bootstrap Script**: Runs on workspace startup and downloads the latest scripts from GitHub
3. **Fallback**: If download fails, uses scripts baked into the image

## Benefits

- ✅ **Fast Updates**: Script changes take effect immediately (no Docker rebuild)
- ✅ **Version Control**: Scripts are versioned in Git
- ✅ **Pinning Support**: Can pin to specific commits/tags for stability
- ✅ **Resilient**: Falls back to image scripts if GitHub is unavailable

## Configuration

### Environment Variables

Set these in Vercel (or pass to Daytona workspace):

- `SCRIPT_REPO` (optional): GitHub repo (default: `jakebutler/pithy-jaunt`)
- `SCRIPT_BRANCH` (optional): Branch/commit/tag (default: `main`)
  - Use `main` for latest
  - Use commit SHA (e.g., `abc123def`) to pin to specific version
  - Use tag (e.g., `v1.0.0`) to pin to release
- `SCRIPT_DISABLE_DOWNLOAD` (optional): Set to `"true"` to skip download and use image scripts

### Examples

**Use latest from main branch** (default):
```bash
# No env vars needed - defaults to main branch
```

**Pin to specific commit**:
```bash
SCRIPT_BRANCH=abc123def456789
```

**Pin to release tag**:
```bash
SCRIPT_BRANCH=v1.0.0
```

**Disable download (use image scripts)**:
```bash
SCRIPT_DISABLE_DOWNLOAD=true
```

## Workflow

### Updating Scripts

1. **Make changes** to scripts in `daytona/` directory
2. **Commit and push** to GitHub
3. **Scripts are automatically used** on next workspace creation (if using `main` branch)
4. **No Docker rebuild needed!**

### Pinning to Stable Version

If you want to ensure all workspaces use a specific version:

1. **Tag the commit**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Set environment variable** in Vercel:
   ```
   SCRIPT_BRANCH=v1.0.0
   ```

### Testing Changes

1. **Create a test branch**:
   ```bash
   git checkout -b test-script-updates
   # Make changes
   git commit -m "Test script updates"
   git push origin test-script-updates
   ```

2. **Set environment variable** for testing:
   ```
   SCRIPT_BRANCH=test-script-updates
   ```

3. **Test in production**, then merge to main when ready

## When to Rebuild Docker Image

You only need to rebuild the Docker image when:

- ✅ **Dependencies change** (Python packages, system packages)
- ✅ **Base image changes** (Ubuntu version, Python version)
- ✅ **Bootstrap script changes** (the script that downloads other scripts)

You do **NOT** need to rebuild for:

- ❌ `execution.sh` changes
- ❌ `agent-runner.py` changes
- ❌ `system-prompt.md` changes
- ❌ `system-prompt-file-generation.md` changes

## Files Downloaded at Runtime

The bootstrap script downloads these files from GitHub:

- `execution.sh` - Main execution script
- `agent-runner.py` - Python agent runner
- `system-prompt.md` - System prompt for diff generation
- `system-prompt-file-generation.md` - System prompt for file generation

## Troubleshooting

### Scripts not updating

1. **Check environment variables**: Ensure `SCRIPT_BRANCH` is set correctly
2. **Check GitHub access**: Workspace needs internet access to download
3. **Check logs**: Look for bootstrap messages in workspace logs

### Download failures

- Scripts fall back to image versions automatically
- Check network connectivity in workspace
- Verify GitHub URL is accessible

### Want to force image scripts

Set `SCRIPT_DISABLE_DOWNLOAD=true` to skip download entirely.

