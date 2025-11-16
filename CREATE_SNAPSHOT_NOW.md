# Create Daytona Snapshot - Required!

The error shows that Daytona needs the Docker image to be registered as a **Snapshot** before it can be used. Here's how to create it:

## ✅ Create Snapshot in Daytona Dashboard

1. **Go to:** https://app.daytona.io
2. **Click on "Snapshots"** in the left sidebar (you should see this option)
3. **Click "Create Snapshot" or "New Snapshot"** button
4. **Fill in:**
   - **Name:** `butlerjake/pithy-jaunt-daytona:v1.0.0` (must match exactly - this is the image name)
   - **Image:** `butlerjake/pithy-jaunt-daytona:v1.0.0`
   - **Description (optional):** "Pithy Jaunt AI Agent Execution Environment"
5. **Click "Create" or "Save"**

## Alternative: Try Different Snapshot Name

If the above doesn't work, try creating a snapshot with a simpler name:

- **Name:** `pithy-jaunt-dev`
- **Image:** `butlerjake/pithy-jaunt-daytona:v1.0.0`

Then we'll need to update the code to reference the snapshot name instead of the image directly.

## After Creating Snapshot

Once the snapshot is created:
1. Try executing a task again
2. The workspace should be created successfully

## If Snapshot Creation Fails

If you can't create a snapshot, we may need to:
1. Update the code to use a different approach
2. Check if there's a different way to register images in your Daytona version

Let me know what options you see in the Snapshots section!

