# Create Daytona Template - Manual Instructions

Since the API endpoint and CLI installation had issues, here's how to create the template manually:

## Option 1: Daytona Dashboard (Recommended)

1. **Go to Daytona Dashboard:**
   - Open: https://app.daytona.io
   - Log in with your account

2. **Navigate to Workspace Templates:**
   - Look for "Templates" or "Workspace Templates" in the sidebar
   - OR go to Settings → Templates
   - OR look for "Template Management"

3. **Create New Template:**
   - Click "Create Template" or "New Template" button
   - OR click the "+" icon

4. **Fill in Template Details:**
   - **Name:** `pithy-jaunt-dev` (must match exactly)
   - **Repository URL:** `https://github.com/daytonaio-templates/blank`
   - **Build Configuration:** Select "Custom image"
   - **Custom Image:** `butlerjake/pithy-jaunt-daytona:latest`
   - **User:** `daytona`
   - **Description (optional):** "Pithy Jaunt AI Agent Execution Environment"

5. **Save/Create Template:**
   - Click "Create" or "Save"

6. **Verify:**
   - You should see `pithy-jaunt-dev` in your templates list

## Option 2: Install Daytona CLI Manually

If the Homebrew installation failed, try manual installation:

1. **Download Daytona CLI:**
   - Go to: https://www.daytona.io/docs/installation
   - Download the macOS binary for your architecture (ARM64 or x86_64)

2. **Install:**
   ```bash
   # For ARM64 (Apple Silicon)
   curl -L https://download.daytona.io/daytona/latest/daytona-darwin-arm64 -o /usr/local/bin/daytona
   chmod +x /usr/local/bin/daytona
   
   # OR for x86_64 (Intel)
   curl -L https://download.daytona.io/daytona/latest/daytona-darwin-amd64 -o /usr/local/bin/daytona
   chmod +x /usr/local/bin/daytona
   ```

3. **Authenticate:**
   ```bash
   daytona login --api-key YOUR_DAYTONA_API_KEY
   ```

4. **Create Template:**
   ```bash
   daytona workspace-template add
   ```
   
   When prompted:
   - **Repository:** `https://github.com/daytonaio-templates/blank`
   - **Name:** `pithy-jaunt-dev`
   - **Build:** `Custom image`
   - **Image:** `butlerjake/pithy-jaunt-daytona:latest`
   - **User:** `daytona`

## Option 3: Use Daytona Snapshots (Newer API)

Based on newer Daytona documentation, you might need to create a Snapshot instead:

```bash
# After installing CLI and authenticating
daytona snapshot create --name pithy-jaunt-dev --image butlerjake/pithy-jaunt-daytona:latest
```

However, your code references a template named `pithy-jaunt-dev`, so you may need to use the workspace-template method.

## Verify Template Created

After creating the template, verify it exists:

- **Dashboard:** Check the templates list
- **CLI:** `daytona workspace-template list`
- **API:** `curl -X GET "${DAYTONA_API_URL}/workspace-template/pithy-jaunt-dev" -H "Authorization: Bearer ${DAYTONA_API_KEY}"`

## Important Notes

- **Template Name:** Must be exactly `pithy-jaunt-dev` (defined in `lib/daytona/client.ts:52`)
- **Image:** `butlerjake/pithy-jaunt-daytona:latest` (already pushed to Docker Hub)
- **Repository:** The placeholder repo (`daytonaio-templates/blank`) is fine - the actual repo is specified when creating workspaces

## Next Steps

Once the template is created:
1. ✅ Test workspace creation in your application
2. ✅ Create a task and execute it
3. ✅ Monitor execution in Daytona dashboard

