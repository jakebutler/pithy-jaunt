# Daytona Template Creation - Exact Steps

Based on [Daytona documentation](https://docs.app.codeanywhere.com/configuration/templates/), templates are managed through workspace templates, not dashboard UI templates. Here's how to create it:

## Method 1: Using Daytona CLI (Recommended)

The CLI method is the most reliable way to create templates:

```bash
daytona workspace-template add
```

**When prompted, enter:**

1. **Git repository:**
   ```
   https://github.com/daytonaio-templates/blank
   ```
   (This is a placeholder - the actual repo is specified when creating workspaces)

2. **Name:**
   ```
   pithy-jaunt-dev
   ```
   ⚠️ **CRITICAL:** Must match exactly - your code looks for this name.

3. **Choose a build configuration:**
   ```
   Custom image
   ```

4. **Custom image:**
   ```
   butlerjake/pithy-jaunt-daytona:latest
   ```

5. **User:**
   ```
   daytona
   ```

6. **Environment Variables:**
   ```
   (Press Enter to skip - env vars are set when creating workspaces)
   ```

## Method 2: Using Daytona API

If you have the API key configured:

```bash
# Load environment
source .env.local

# Create template
./scripts/create-daytona-template-api.sh
```

Or manually:

```bash
curl -X PUT "${DAYTONA_API_URL}/workspace-template" \
  -H "Authorization: Bearer ${DAYTONA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pithy-jaunt-dev",
    "repositoryUrl": "https://github.com/daytonaio-templates/blank",
    "image": "jakebutler/pithy-jaunt-daytona:latest",
    "buildConfig": {
      "type": "custom-image"
    },
    "envVars": {},
    "user": "daytona",
    "default": false
  }'
```

## Method 3: Automated Script

Run the complete setup script:

```bash
./scripts/setup-daytona-final.sh
```

This will:
1. Push the Docker image (if logged in)
2. Create the template via API
3. Fall back to CLI instructions if API fails

## Verify Template Created

Check that the template exists:

```bash
daytona workspace-template list
```

You should see `pithy-jaunt-dev` in the list.

Or via API:

```bash
curl -X GET "${DAYTONA_API_URL}/workspace-template/pithy-jaunt-dev" \
  -H "Authorization: Bearer ${DAYTONA_API_KEY}"
```

## Important Notes

1. **Template Name:** Must be exactly `pithy-jaunt-dev` (defined in `lib/daytona/client.ts:52`)

2. **Docker Image:** Must be pushed to a registry before creating the template:
   ```bash
   docker login
   docker push jakebutler/pithy-jaunt-daytona:latest
   ```

3. **Repository URL:** The template uses a placeholder repository (`daytonaio-templates/blank`). The actual repository is specified when creating workspaces via the API (in `repoUrl` parameter).

4. **Build Config:** Must be set to "Custom image" type to use our Docker image.

## Troubleshooting

**Template not found when creating workspace:**
- Verify template name matches exactly: `pithy-jaunt-dev`
- Check template exists: `daytona workspace-template list`
- Ensure you're using the correct Daytona organization/account

**Image pull fails:**
- Make sure image is pushed: `docker push jakebutler/pithy-jaunt-daytona:latest`
- Verify image is accessible from Daytona's infrastructure
- Check image name matches exactly in template

**API returns 404:**
- The `/workspace-template` endpoint might not be available in all Daytona deployments
- Use CLI method instead: `daytona workspace-template add`

## Next Steps

Once the template is created:

1. ✅ Verify template exists
2. ✅ Test workspace creation in your application
3. ✅ Monitor execution logs in Daytona dashboard
4. ✅ Verify webhooks are received

