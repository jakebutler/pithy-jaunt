# Fixing Docker Push Error

The error "push access denied, repository does not exist or may require authorization" means you need to authenticate with Docker Hub first.

## Quick Fix

1. **Login to Docker Hub:**
   ```bash
   docker login
   ```
   
   Enter your Docker Hub username and password when prompted.

2. **Push the image:**
   ```bash
   docker push butlerjake/pithy-jaunt-daytona:latest
   ```

## Automated Fix Script

Run the automated fix script:

```bash
./scripts/fix-docker-push.sh
```

This will:
- Check if you're logged in
- Verify the image exists locally
- Attempt to push with better error handling

## Alternative: Use GitHub Container Registry

If you prefer to use GitHub Container Registry instead:

```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u butlerjake --password-stdin

# Tag for GHCR
docker tag butlerjake/pithy-jaunt-daytona:latest ghcr.io/butlerjake/pithy-jaunt-daytona:latest

# Push
docker push ghcr.io/butlerjake/pithy-jaunt-daytona:latest
```

Then update the template to use: `ghcr.io/butlerjake/pithy-jaunt-daytona:latest`

## Verify Push Success

After pushing, verify the image is available:

```bash
docker pull butlerjake/pithy-jaunt-daytona:latest
```

Or check on Docker Hub: https://hub.docker.com/r/jakebutler/pithy-jaunt-daytona

## Common Issues

**"unauthorized" error:**
- Make sure you ran `docker login`
- Verify your Docker Hub credentials are correct
- Check that your Docker Hub account is active

**"repository does not exist":**
- Docker Hub will automatically create the repository on first push
- Make sure the repository name matches your username: `jakebutler/pithy-jaunt-daytona`
- The repository will be created as public by default

**"insufficient_scope":**
- Your Docker Hub account might not have push permissions
- Make sure you're using the correct account
- Try logging out and back in: `docker logout && docker login`

