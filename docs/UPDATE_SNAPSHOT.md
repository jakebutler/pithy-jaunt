# How to Update Daytona Snapshot After Code Changes

When you make changes to files in the `daytona/` directory (like `agent-runner.py`, `execution.sh`, etc.), you need to rebuild the Docker image and create a new snapshot.

## Step 1: Build and Push New Docker Image

### Option A: Using Docker Hub (if `butlerjake` is your Docker Hub username)

```bash
# Set the new version tag (increment from v1.0.4)
VERSION="v1.0.5"

# Build the image
docker build -t butlerjake/pithy-jaunt-daytona:$VERSION -f daytona/Dockerfile .

# Push to Docker Hub (make sure you're logged in: docker login)
docker push butlerjake/pithy-jaunt-daytona:$VERSION
```

### Option B: Using GitHub Container Registry (GHCR)

```bash
# Set the new version tag
VERSION="v1.0.5"

# Build the image
docker build -t ghcr.io/jakebutler/pithy-jaunt-daytona:$VERSION -f daytona/Dockerfile .

# Push to GHCR (make sure you're logged in: docker login ghcr.io)
docker push ghcr.io/jakebutler/pithy-jaunt-daytona:$VERSION
```

### Option C: Using the Build Script

```bash
# For Docker Hub
export DOCKER_REGISTRY="butlerjake"
./daytona/build-and-push.sh v1.0.5

# For GHCR
export DOCKER_REGISTRY="ghcr.io/jakebutler"
./daytona/build-and-push.sh v1.0.5
```

## Step 2: Create Snapshot in Daytona

You have two options:

### Option A: Using Daytona Dashboard

1. Go to your Daytona dashboard
2. Navigate to Snapshots
3. Click "Create Snapshot"
4. Enter:
   - **Name**: `butlerjake/pithy-jaunt-daytona:v1.0.5` (or your new version)
   - **Image**: `butlerjake/pithy-jaunt-daytona:v1.0.5` (or `ghcr.io/jakebutler/pithy-jaunt-daytona:v1.0.5`)
5. Click "Create"

### Option B: Using Daytona CLI

```bash
# Make sure you're authenticated
daytona auth login

# Create snapshot from the Docker image
daytona snapshot create \
  --name butlerjake/pithy-jaunt-daytona:v1.0.5 \
  --image butlerjake/pithy-jaunt-daytona:v1.0.5
```

### Option C: Using TypeScript SDK (Programmatic)

Create a script or run in Node.js:

```typescript
import { Daytona } from "@daytonaio/sdk";

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY,
  apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
});

// Create snapshot from Docker image
await daytona.snapshot.create({
  name: "butlerjake/pithy-jaunt-daytona:v1.0.5",
  image: "butlerjake/pithy-jaunt-daytona:v1.0.5", // Your Docker image
}, {
  onLogs: console.log,
});
```

## Step 3: Update Environment Variable in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Find `DAYTONA_SNAPSHOT_NAME`
4. Update it to: `butlerjake/pithy-jaunt-daytona:v1.0.5` (or your new version)
5. **Important**: Make sure to update it for **Production** environment
6. Click **Save**
7. **Redeploy** your application (or wait for the next deployment)

## Step 4: Verify

1. Create a new task in production
2. Execute it
3. Check the logs to confirm the new snapshot is being used
4. Verify the updated code (e.g., new validation in `agent-runner.py`) is working

## Quick Reference

**Current snapshot name pattern**: `butlerjake/pithy-jaunt-daytona:v1.0.X`

**Files that require snapshot rebuild**:
- `daytona/agent-runner.py` ✅ (just updated)
- `daytona/execution.sh` ✅ (just updated)
- `daytona/system-prompt.md`
- `daytona/requirements.txt`
- `daytona/Dockerfile`

**Files that DON'T require snapshot rebuild**:
- Next.js app code (`app/`, `lib/`, `components/`)
- These are deployed separately to Vercel

## Troubleshooting

### Image not found
- Make sure you pushed the image to the correct registry
- Verify the image name matches exactly (including registry prefix)

### Snapshot creation fails
- Check that the Docker image is publicly accessible (or your Daytona account has access)
- Verify the image name is correct
- Check Daytona logs for specific error messages

### Old snapshot still being used
- Make sure you updated `DAYTONA_SNAPSHOT_NAME` in Vercel
- Redeploy the Vercel app after updating the env var
- Check Vercel logs to see which snapshot name is being used

