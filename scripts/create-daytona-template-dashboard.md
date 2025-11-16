# Create Daytona Template via Dashboard

Since the Daytona API endpoint for templates may vary, here are the **exact steps** to create the template via the dashboard:

## Step-by-Step Instructions

1. **Go to Daytona Dashboard**
   - Open: https://app.daytona.io
   - Log in with your account

2. **Navigate to Templates**
   - Look for **"Templates"** in the left sidebar
   - OR go to **"Settings"** → **"Templates"**
   - OR look for **"Workspace Templates"** or **"Template Management"**

3. **Create New Template**
   - Click **"Create Template"** or **"New Template"** button
   - OR click the **"+"** icon

4. **Fill in Template Details**

   **Template Name:**
   ```
   pithy-jaunt-dev
   ```
   ⚠️ **CRITICAL:** This name must match exactly - the code looks for this specific name.

   **Docker Image:**
   ```
   butlerjake/pithy-jaunt-daytona:latest
   ```
   (Or use the full path: `docker.io/butlerjake/pithy-jaunt-daytona:latest`)

   **Init Script / Startup Command:**
   ```
   /app/execution.sh
   ```

   **Timeout:**
   ```
   25
   ```
   (in minutes)

   **Description (optional):**
   ```
   Pithy Jaunt AI Agent Execution Environment
   ```

5. **Save/Create Template**
   - Click **"Create"**, **"Save"**, or **"Submit"**

6. **Verify Template Created**
   - You should see `pithy-jaunt-dev` in your templates list
   - The template should show as "Active" or "Ready"

## Alternative: Using Daytona CLI

If you have the Daytona CLI installed:

```bash
daytona template create \
  --name pithy-jaunt-dev \
  --image butlerjake/pithy-jaunt-daytona:latest \
  --init /app/execution.sh \
  --timeout 25
```

## What to Do After Template Creation

Once the template is created:

1. **Push the Docker image** (if not already done):
   ```bash
   docker login
   docker push butlerjake/pithy-jaunt-daytona:latest
   ```

2. **Test in your application:**
   - Create a task
   - Click "Execute"
   - Check Daytona dashboard for workspace creation
   - Monitor execution logs

## Troubleshooting

**Can't find Templates section:**
- Check if you have the right permissions (admin/owner role)
- Look in different sections: Settings, Configuration, Workspaces
- Try searching for "template" in the dashboard

**Template name already exists:**
- Either delete the old one or use a different name
- If using a different name, update `lib/daytona/client.ts` line 52 to match

**Image not found:**
- Make sure you've pushed the image: `docker push butlerjake/pithy-jaunt-daytona:latest`
- Verify the image name matches exactly in the template
- Check Docker Hub: https://hub.docker.com/r/jakebutler/pithy-jaunt-daytona

