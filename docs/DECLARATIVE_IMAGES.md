# Declarative Images - Better Approach for Pithy Jaunt

## Overview

Daytona's **Declarative Images** provide a code-first approach to defining workspace images. Instead of manually building and pushing Docker images, you define the image programmatically using the SDK.

## Why Use Declarative Images?

### ✅ Benefits

1. **No Manual Docker Management**
   - No need to build/push Docker images manually
   - No Docker registry management
   - No version tagging headaches

2. **Version Controlled**
   - Image definition is in code (Git)
   - Easy to review changes
   - Can track image evolution

3. **Faster Iteration**
   - Modify image definition in code
   - Test locally without deploying
   - No need to rebuild/push for every change

4. **Automatic Caching**
   - Daytona caches images for 24 hours
   - Subsequent builds are almost instant
   - Same image definition = cached build

5. **More Flexible**
   - Can build images on-demand
   - Can create pre-built snapshots when needed
   - Easy to have multiple image variants

### ❌ Old Approach (Docker Images)

```bash
# Build image
docker build -t butlerjake/pithy-jaunt-daytona:v1.0.4 .

# Push to registry
docker push butlerjake/pithy-jaunt-daytona:v1.0.4

# Create snapshot in Daytona dashboard
# Update environment variables
# Deploy to production
# Test
# Repeat for every change...
```

### ✅ New Approach (Declarative Images)

```typescript
// Define image in code
const image = buildPithyJauntImage();

// Use it directly - Daytona builds and caches automatically
const sandbox = await daytona.create({ image });
```

## How It Works

### 1. Image Definition

The image is defined in `lib/daytona/declarative-image.ts`:

```typescript
export function buildPithyJauntImage(): Image {
  return Image.debianSlim("3.12")
    .runCommands("apt-get update && apt-get install -y git curl jq")
    .pipInstall(["openai", "anthropic"])
    .addLocalFile("daytona/execution.sh", "/app/execution.sh")
    .addLocalFile("daytona/agent-runner.py", "/app/agent-runner.py")
    // ... more configuration
}
```

### 2. Usage in SDK Client

The SDK client automatically uses declarative images:

```typescript
// lib/daytona/sdk-client.ts
const declarativeImage = buildPithyJauntImage();
const sandbox = await daytona.create({ image: declarativeImage });
```

### 3. Automatic Building

- First run: Daytona builds the image (takes a few minutes)
- Subsequent runs: Uses cached image (almost instant)
- Cache duration: 24 hours
- Cache key: Based on image definition hash

## Configuration

### Enable/Disable Declarative Images

By default, declarative images are **enabled**. To use pre-built snapshots instead:

```bash
# In .env.local or environment variables
DAYTONA_USE_DECLARATIVE_IMAGE=false
```

### Using Pre-built Snapshots

If you want to create a pre-built snapshot (for faster startup):

```typescript
import { buildPithyJauntImage, createPithyJauntSnapshot } from "./lib/daytona/declarative-image";

const daytona = new Daytona({ ... });
const image = buildPithyJauntImage();

// Create snapshot once
await createPithyJauntSnapshot(daytona, "pithy-jaunt-dev");

// Then use snapshot name in environment variable
// DAYTONA_SNAPSHOT_NAME=pithy-jaunt-dev
// DAYTONA_USE_DECLARATIVE_IMAGE=false
```

## Local Testing

You can test declarative image building locally:

```typescript
// test-declarative-image.ts
import { buildPithyJauntImage } from "./lib/daytona/declarative-image";
import { Daytona } from "@daytonaio/sdk";

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY,
  apiUrl: process.env.DAYTONA_API_URL,
});

const image = buildPithyJauntImage();

// Create a test workspace
const sandbox = await daytona.create(
  {
    image,
    envVars: {
      TARGET_REPO: "https://github.com/owner/repo",
      TASK_ID: "test-123",
      // ... other env vars
    },
  },
  {
    onSnapshotCreateLogs: console.log, // Watch build logs
  }
);

console.log("Workspace created:", sandbox.id);
```

## Comparison: Declarative vs Docker Images

| Aspect | Declarative Images | Docker Images |
|--------|-------------------|---------------|
| **Setup** | Define in code | Build Dockerfile |
| **Deployment** | Automatic | Manual build/push |
| **Version Control** | ✅ In Git | ⚠️ Separate registry |
| **Iteration Speed** | ⚡ Fast | 🐌 Slow |
| **Caching** | ✅ Automatic (24h) | ⚠️ Manual |
| **Testing** | ✅ Easy (local) | ⚠️ Requires registry |
| **Flexibility** | ✅ High | ⚠️ Medium |
| **Production Ready** | ✅ Yes | ✅ Yes |

## Migration Guide

### From Docker Images to Declarative Images

1. **Enable declarative images** (already enabled by default):
   ```bash
   # No action needed - it's the default
   ```

2. **Test locally**:
   ```bash
   # Use the local testing script
   ./scripts/test-task-execution-local.sh \
     https://github.com/owner/repo \
     "Update README.md"
   ```

3. **Deploy**:
   ```bash
   # Just commit and push - no Docker build needed!
   git add lib/daytona/declarative-image.ts
   git commit -m "Use declarative images"
   git push
   ```

4. **Monitor first run**:
   - First workspace creation will build the image (takes a few minutes)
   - Subsequent creations use cached image (almost instant)

### Keep Docker Images as Fallback

If you want to keep Docker images as a fallback:

```bash
# Set environment variable to use snapshots
DAYTONA_USE_DECLARATIVE_IMAGE=false
DAYTONA_SNAPSHOT_NAME=butlerjake/pithy-jaunt-daytona:v1.0.4
```

## Best Practices

1. **Start with Declarative Images**
   - Use declarative images for development and testing
   - Faster iteration and easier debugging

2. **Create Snapshots for Production** (Optional)
   - If you need instant workspace creation
   - Create a snapshot once and reuse it
   - Still maintain declarative definition in code

3. **Version Your Image Definition**
   - Keep image definition in Git
   - Review changes in PRs
   - Document significant changes

4. **Test Locally First**
   - Use local testing scripts
   - Verify image builds correctly
   - Test with simple tasks first

5. **Monitor Build Logs**
   - Watch build logs on first run
   - Identify any build issues early
   - Optimize build time if needed

## Troubleshooting

### Image Build Fails

**Symptom:** Workspace creation fails with build error

**Solution:**
- Check build logs in Daytona dashboard
- Verify all file paths in `declarative-image.ts` are correct
- Ensure all dependencies are available

### Slow First Build

**Symptom:** First workspace creation takes a long time

**Solution:**
- This is normal - image is being built
- Subsequent builds use cache (almost instant)
- Consider creating a pre-built snapshot for production

### Cache Not Working

**Symptom:** Every build takes a long time

**Solution:**
- Verify image definition is consistent
- Check Daytona cache settings
- Consider creating a pre-built snapshot

## Next Steps

1. ✅ Declarative images are already enabled by default
2. ✅ Test locally with `./scripts/test-task-execution-local.sh`
3. ✅ Deploy and monitor first run
4. ⚠️ Optional: Create pre-built snapshot for production

## Resources

- [Daytona Declarative Images Documentation](https://www.daytona.io/docs/en/declarative-images/)
- [TypeScript SDK Image API](https://www.daytona.io/docs/en/typescript-sdk/image)
- [Python SDK Image API](https://www.daytona.io/docs/en/python-sdk/common/image)

