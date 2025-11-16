# Daytona Template Setup - Exact Steps

## Quick Setup (Automated)

Run the complete setup script:

```bash
./scripts/setup-daytona-complete.sh
```

This will:
1. Push the Docker image to Docker Hub (requires `docker login` first)
2. Create the template in Daytona via API

## Manual Setup

### Step 1: Login to Docker Hub

```bash
docker login
```

Enter your Docker Hub username and password when prompted.

### Step 2: Push Docker Image

```bash
docker push butlerjake/pithy-jaunt-daytona:latest
```

**Expected output:** Image layers will upload. Wait for "latest: digest: sha256:..." message.

### Step 3: Create Template via API

```bash
# Make sure DAYTONA_API_KEY is set
export DAYTONA_API_KEY=your-key-here

# Or load from .env.local
source .env.local

# Create template
./scripts/create-daytona-template.sh
```

**Alternative: Create via Daytona Dashboard**

1. Go to: https://app.daytona.io
2. Navigate to **Templates** (or **Workspace Templates**)
3. Click **Create Template** or **New Template**
4. Fill in:
   - **Name**: `pithy-jaunt-dev` (exact name, required)
   - **Image**: `butlerjake/pithy-jaunt-daytona:latest`
   - **Init Script**: `/app/execution.sh`
   - **Timeout**: `25` minutes
   - **Description**: "Pithy Jaunt AI Agent Execution Environment"
5. Click **Create** or **Save**

### Step 4: Verify Template

Check that the template exists:

```bash
curl -X GET "${DAYTONA_API_URL}/templates" \
  -H "Authorization: Bearer ${DAYTONA_API_KEY}" | jq '.[] | select(.name=="pithy-jaunt-dev")'
```

Or check in the Daytona dashboard - you should see `pithy-jaunt-dev` in your templates list.

## Troubleshooting

### Docker Push Fails

**Error: "push access denied"**
- Run `docker login` first
- Make sure you're logged into the correct Docker Hub account
- Verify the repository name matches your username: `jakebutler/pithy-jaunt-daytona`

**Error: "repository does not exist"**
- Docker Hub will create the repository automatically on first push
- Make sure the image is tagged correctly: `butlerjake/pithy-jaunt-daytona:latest`

### Template Creation Fails

**Error: "401 Unauthorized"**
- Check your `DAYTONA_API_KEY` is correct
- Verify the key has template creation permissions
- Get a new key from: https://app.daytona.io/settings/api-keys

**Error: "404 Not Found"**
- Check `DAYTONA_API_URL` is correct (default: `https://app.daytona.io/api`)
- Verify you're using the correct API endpoint

**Error: "Template already exists"**
- This is okay! The template is ready to use
- You can verify it in the dashboard

### Image Not Found When Creating Workspace

- Verify the image was pushed successfully: `docker pull butlerjake/pithy-jaunt-daytona:latest`
- Check the image name in the template matches exactly
- Make sure the image is public OR Daytona has access to your private registry

## Verification Checklist

- [ ] Docker image pushed to registry
- [ ] Template `pithy-jaunt-dev` exists in Daytona
- [ ] Template has correct image: `butlerjake/pithy-jaunt-daytona:latest`
- [ ] Template has init script: `/app/execution.sh`
- [ ] Template timeout is set to 25 minutes
- [ ] `DAYTONA_API_KEY` is set in `.env.local`
- [ ] `DAYTONA_API_URL` is set (or using default)
- [ ] `NEXT_PUBLIC_APP_URL` is set for webhooks

## Next Steps

Once the template is created, you can test task execution:

1. Start your app: `npm run dev`
2. Start ngrok: `ngrok http 3000`
3. Update `NEXT_PUBLIC_APP_URL` in `.env.local` with ngrok URL
4. Create a task in the UI
5. Click "Execute"
6. Check Daytona dashboard for workspace creation
7. Monitor execution logs

