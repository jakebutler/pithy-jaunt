# Daytona Setup - Using Snapshots Instead of Templates

Based on your Daytona dashboard, it appears Daytona uses **Snapshots** instead of Templates. Here's how to set this up:

## Option 1: Create a Snapshot (Recommended)

1. **Go to "Snapshots" in the Daytona dashboard**
2. **Click "Create Snapshot" or "New Snapshot"**
3. **Fill in:**
   - **Name:** `pithy-jaunt-dev`
   - **Image:** `butlerjake/pithy-jaunt-daytona:latest`
   - **Description:** "Pithy Jaunt AI Agent Execution Environment"
4. **Save/Create**

## Option 2: Modify Code to Use Snapshots

If Snapshots work differently than Templates, we may need to update the workspace creation code. Let me check the Daytona API to see if we can:
- Create workspaces directly with custom images (without templates)
- Use snapshots instead of templates
- Pass the image directly in the workspace creation request

## Option 3: Create Workspace Directly with Image

We might be able to bypass templates/snapshots entirely and pass the Docker image directly when creating workspaces. This would require updating `lib/daytona/client.ts` to include the image in the workspace creation request.

## Next Steps

Let me check the Daytona API documentation to see the correct approach for your version of Daytona.

