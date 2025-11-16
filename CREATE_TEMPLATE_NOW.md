# Create Daytona Template - Quick Guide

The Daytona CLI installation had issues, so here's the **easiest way** to create the template:

## ✅ Use Daytona Dashboard (Easiest Method)

1. **Go to:** https://app.daytona.io
2. **Log in** with your account
3. **Find Templates section:**
   - Look in the left sidebar for "Templates" or "Workspace Templates"
   - OR go to Settings → Templates
   - OR look for "Template Management"
4. **Click "Create Template" or "New Template"**
5. **Fill in these exact values:**
   - **Name:** `pithy-jaunt-dev` ⚠️ Must match exactly
   - **Repository URL:** `https://github.com/daytonaio-templates/blank`
   - **Build Configuration:** Select "Custom image"
   - **Custom Image:** `butlerjake/pithy-jaunt-daytona:latest`
   - **User:** `daytona`
6. **Click "Create" or "Save"**
7. **Verify:** You should see `pithy-jaunt-dev` in your templates list

## That's It!

Once the template is created, your application can use it. The template name `pithy-jaunt-dev` is hardcoded in your application (`lib/daytona/client.ts:52`), so it must match exactly.

## Verify Template Works

After creating the template, test it:
1. Go to your Pithy Jaunt application
2. Create a task
3. Click "Execute"
4. Check the Daytona dashboard - a workspace should be created using the `pithy-jaunt-dev` template

## Troubleshooting

**Can't find Templates section in dashboard:**
- Try different sections: Settings, Configuration, Workspaces
- Check if you have admin/owner permissions
- Look for "Template Management" or "Workspace Templates"

**Template name already exists:**
- Either delete the old one or use a different name
- If using a different name, update `lib/daytona/client.ts:52` to match

**Image not found:**
- Verify image is pushed: `docker pull butlerjake/pithy-jaunt-daytona:latest`
- Check Docker Hub: https://hub.docker.com/r/butlerjake/pithy-jaunt-daytona

