# Pre-built Snapshots with Declarative Builder - Recommended Approach

## Overview

This document explains the **recommended approach** for Pithy Jaunt: using **Pre-built Snapshots created from Declarative Images**. This combines the best of both worlds:

- ✅ **Version-controlled image definition** (in code via declarative builder)
- ✅ **Reliability and speed** (pre-built snapshots, no build latency)
- ✅ **No manual Docker management** (Daytona builds the snapshot from declarative definition)

## Current State

**You are currently using:** Pre-built Snapshots (traditional Docker image approach)
- Manual Docker builds (`docker build`)
- Manual pushes to registry (`docker push`)
- Manual snapshot creation in Daytona dashboard
- Using snapshot name: `butlerjake/pithy-jaunt-daytona:v1.0.6`

**Recommended approach:** Pre-built Snapshots with Declarative Builder
- Image definition in code (`lib/daytona/declarative-image.ts`)
- Create snapshot programmatically from declarative definition
- Use snapshot name when creating workspaces
- No manual Docker builds/pushes needed

## Why This Approach?

### Problems with Current Approach (Manual Docker Images)
1. **Manual process**: Build → Push → Create snapshot → Update env vars
2. **Not version-controlled**: Docker image definition separate from code
3. **Error-prone**: Easy to forget steps or use wrong version
4. **Slow iteration**: Every change requires full Docker workflow

### Problems with On-Demand Declarative Images
1. **Build latency**: First workspace creation takes several minutes
2. **Reliability issues**: Can cause hangs during workspace creation
3. **24-hour cache**: Cache expires, causing delays again

### Benefits of Pre-built Snapshots with Declarative Builder
1. ✅ **Version-controlled**: Image definition in Git (`declarative-image.ts`)
2. ✅ **Fast workspace creation**: Snapshot is pre-built and ready
3. ✅ **Reliable**: No build latency or hangs
4. ✅ **Easy updates**: Change code, create new snapshot, update env var
5. ✅ **No Docker registry**: Daytona handles everything

## How It Works

### 1. Image Definition (Already Done)

The image is defined declaratively in `lib/daytona/declarative-image.ts`:

```typescript
export function buildPithyJauntImage(): Image {
  return Image.base("ubuntu:22.04")
    .runCommands("apt-get update && apt-get install -y git curl jq")
    .pipInstall(["openai", "anthropic"])
    .addLocalFile("daytona/execution.sh", "/app/execution.sh")
    .addLocalFile("daytona/agent-runner.py", "/app/agent-runner.py")
    // ... more configuration
}
```

### 2. Create Snapshot from Declarative Image

Use the helper function to create a snapshot:

```typescript
import { createPithyJauntSnapshot } from "./lib/daytona/declarative-image";
import { Daytona } from "@daytonaio/sdk";

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY,
  apiUrl: process.env.DAYTONA_API_URL,
  target: process.env.DAYTONA_TARGET || "us",
});

// Create snapshot from declarative image
await createPithyJauntSnapshot(daytona, "pithy-jaunt-v1.0.6");
```

Or use the script:
```bash
npm run create-snapshot -- pithy-jaunt-v1.0.6
```

### 3. Use Snapshot When Creating Workspaces

The SDK client already supports this (it's the default):

```typescript
// lib/daytona/sdk-client.ts
// DAYTONA_USE_DECLARATIVE_IMAGE is not set (or false)
// DAYTONA_SNAPSHOT_NAME=pithy-jaunt-v1.0.6

const sandbox = await daytona.create({
  snapshot: DAYTONA_SNAPSHOT_NAME, // Uses pre-built snapshot
  envVars: { ... }
});
```

## Migration Steps

### Step 1: Create Snapshot from Declarative Image

Run the snapshot creation script:

```bash
# Set your Daytona credentials
export DAYTONA_API_KEY=your_key
export DAYTONA_API_URL=https://app.daytona.io/api
export DAYTONA_TARGET=us

# Create snapshot
npm run create-snapshot -- pithy-jaunt-v1.0.6
```

Or use the TypeScript script directly:

```bash
npx tsx scripts/create-snapshot-from-declarative.ts pithy-jaunt-v1.0.6
```

### Step 2: Update Environment Variables

In Vercel (or your environment):

```bash
# Remove (not needed anymore)
DAYTONA_IMAGE_NAME=...

# Update to use the new snapshot
DAYTONA_SNAPSHOT_NAME=pithy-jaunt-v1.0.6

# Keep this as false (or unset)
DAYTONA_USE_DECLARATIVE_IMAGE=false
```

### Step 3: Test

Create a test workspace and verify it uses the snapshot:

```bash
# Check logs - should show:
# [Daytona SDK] Creating workspace with snapshot: pithy-jaunt-v1.0.6
```

### Step 4: Update Workflow

Going forward, when you need to update the image:

1. **Update declarative image definition** in `lib/daytona/declarative-image.ts`
2. **Create new snapshot**:
   ```bash
   npm run create-snapshot -- pithy-jaunt-v1.0.7
   ```
3. **Update environment variable**:
   ```bash
   DAYTONA_SNAPSHOT_NAME=pithy-jaunt-v1.0.7
   ```
4. **Deploy** (Vercel will pick up the new env var)

No Docker builds or pushes needed!

## Comparison

| Aspect | Manual Docker | On-Demand Declarative | Pre-built Declarative Snapshot |
|--------|--------------|----------------------|-------------------------------|
| **Image Definition** | Dockerfile | Code (declarative) | Code (declarative) |
| **Version Control** | ❌ Separate | ✅ In Git | ✅ In Git |
| **Build Process** | Manual | Automatic (on-demand) | Automatic (one-time) |
| **Workspace Creation Speed** | ⚡ Fast | 🐌 Slow (first time) | ⚡ Fast |
| **Reliability** | ✅ High | ⚠️ Can hang | ✅ High |
| **Iteration Speed** | 🐌 Slow | ⚡ Fast | ⚡ Fast |
| **Docker Registry** | ✅ Required | ❌ Not needed | ❌ Not needed |
| **Manual Steps** | Many | None | One (create snapshot) |

## Scripts

### Create Snapshot Script

```bash
# scripts/create-snapshot-from-declarative.ts
# Usage: npx tsx scripts/create-snapshot-from-declarative.ts <snapshot-name>
```

This script:
1. Loads Daytona credentials from environment
2. Builds the declarative image
3. Creates a snapshot from it
4. Streams build logs
5. Confirms success

### Verify Snapshot Script

```bash
# scripts/verify-snapshot.sh
# Usage: ./scripts/verify-snapshot.sh <snapshot-name>
```

This script verifies that a snapshot exists and shows its details.

## Best Practices

1. **Version your snapshots**: Use semantic versioning (e.g., `pithy-jaunt-v1.0.6`)
2. **Update declarative definition first**: Always update `declarative-image.ts` before creating a new snapshot
3. **Test locally**: Create a test snapshot before updating production
4. **Document changes**: Add comments in `declarative-image.ts` for significant changes
5. **Keep old snapshots**: Don't delete old snapshots immediately (in case you need to rollback)

## Troubleshooting

### Snapshot Creation Fails

**Symptom:** `createPithyJauntSnapshot()` fails with build error

**Solution:**
- Check build logs in the script output
- Verify all file paths in `declarative-image.ts` are correct
- Ensure all dependencies are available
- Check Daytona API credentials

### Snapshot Not Found

**Symptom:** Workspace creation fails with "snapshot not found"

**Solution:**
- Verify snapshot name matches exactly (case-sensitive)
- Check snapshot exists: `daytona.snapshot.list()`
- Ensure `DAYTONA_SNAPSHOT_NAME` env var is set correctly

### Workspace Creation Still Slow

**Symptom:** Workspace creation takes a long time even with snapshot

**Solution:**
- Verify you're using snapshot (check logs for `Creating workspace with snapshot:`)
- Ensure `DAYTONA_USE_DECLARATIVE_IMAGE` is not set or is `false`
- Check Daytona runner availability

## Next Steps

1. ✅ Create snapshot from declarative image: `npm run create-snapshot -- pithy-jaunt-v1.0.6`
2. ✅ Update `DAYTONA_SNAPSHOT_NAME` in Vercel
3. ✅ Remove `DAYTONA_IMAGE_NAME` (not needed)
4. ✅ Test workspace creation
5. ✅ Update workflow to use declarative snapshots going forward

## Resources

- [Daytona Declarative Images Documentation](https://www.daytona.io/docs/en/declarative-images/)
- [Daytona Snapshots Documentation](https://www.daytona.io/docs/en/snapshots/)
- [TypeScript SDK Image API](https://www.daytona.io/docs/en/typescript-sdk/image)
- [TypeScript SDK Snapshot API](https://www.daytona.io/docs/en/typescript-sdk/snapshot)

