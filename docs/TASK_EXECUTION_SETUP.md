# Task Execution Setup - Current Status & Next Steps

## ✅ What's Working

1. **Authentication & User Management**
   - Supabase auth integration
   - User login/signup
   - Session management

2. **Task Management**
   - Creating tasks via UI
   - Task status tracking (queued, running, completed, failed, cancelled)
   - Task detail pages with execution logs

3. **Webhook Infrastructure**
   - ngrok tunnel configured: `https://backdoor-kristine-calflike.ngrok-free.dev`
   - Webhook endpoint receiving data: `/api/webhook/daytona`
   - Task status updates via webhooks
   - UI properly displays completed tasks with "View PR" button

4. **Database**
   - Convex integration
   - Tasks, workspaces, repos, users all syncing correctly

5. **Development Tools**
   - Debug endpoints: `/api/debug/task/[taskId]`
   - Manual task completion script: `./scripts/complete-task-manually.sh`
   - Full reset script: `./scripts/full-reset.sh`

## ❌ What's NOT Working

**Root Issue: Daytona Template Missing**

Your app calls the Daytona API to create workspaces with template `"pithy-jaunt-dev"`, but this template doesn't exist in your Daytona account. As a result:

- ✅ Workspace gets created in Daytona (status: "Started")
- ❌ No execution script runs inside the workspace
- ❌ No code is generated
- ❌ No PR is created
- ❌ No webhook is sent back to your app
- ❌ Task stays "running" forever

## 🔧 What Needs to Be Done

### Option 1: Create Daytona Template (Recommended for Production)

You need to set up a custom Daytona template that:

1. **Clones your repository**
   ```bash
   git clone $TARGET_REPO repo
   cd repo
   git checkout -b $BRANCH_NAME
   ```

2. **Runs an AI agent** to make code changes
   - Uses OpenAI or Anthropic API
   - Takes the task description ($AGENT_PROMPT)
   - Generates code changes

3. **Creates a PR**
   ```bash
   git add -A
   git commit -m "Pithy Jaunt: $TASK_ID"
   git push origin $BRANCH_NAME
   gh pr create --title "..." --body "..." --base main
   ```

4. **Sends webhook** back to your app
   ```bash
   curl -X POST $WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{
       "type": "task.completed",
       "workspaceId": "'$WORKSPACE_ID'",
       "taskId": "'$TASK_ID'",
       "branchName": "'$BRANCH_NAME'",
       "prUrl": "'$PR_URL'",
       "status": "success"
     }'
   ```

**Reference:** See `/daytona/execution.sh` in your codebase for a template script.

### Option 2: Use Different Execution Backend

Instead of Daytona, integrate with:
- **Vercel AI SDK** for code generation
- **GitHub Actions** for execution
- **Modal.com** for serverless execution
- **AWS Lambda** or similar

### Option 3: Manual Testing (Current State)

For UI/flow testing without real execution:
```bash
# Manually complete tasks to test the UI
./scripts/complete-task-manually.sh <taskId> <prUrl>
```

## 📋 Environment Variables Required

Your `.env.local` needs:

```bash
# Database
NEXT_PUBLIC_CONVEX_URL=https://your-convex-url.convex.cloud

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Daytona (if using)
DAYTONA_API_URL=https://app.daytona.io/api
DAYTONA_API_KEY=your_daytona_key

# GitHub (for PR creation)
GITHUB_TOKEN=your_github_token

# AI Models (for code generation)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key  # optional

# Public URL for webhooks (ngrok)
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok-free.dev
```

## 🚀 How to Test Current Setup

### 1. Start All Services

```bash
# Terminal 1: Convex
npx convex dev

# Terminal 2: Next.js
npm run dev

# Terminal 3: ngrok
ngrok http 3000
# Copy the HTTPS URL and add to .env.local as NEXT_PUBLIC_APP_URL
# Then restart Next.js
```

### 2. Test Task Creation & Manual Completion

```bash
# 1. Create a task via UI
# 2. Execute the task (it will get stuck)
# 3. Manually complete it to test UI:
./scripts/complete-task-manually.sh <taskId> "https://github.com/owner/repo/pull/123"
# 4. Refresh task page - should see "View PR" button
```

### 3. Verify Webhook Receiving

```bash
# Test webhook endpoint is publicly accessible
curl -X POST https://your-ngrok-url.ngrok-free.dev/api/webhook/daytona \
  -H "Content-Type: application/json" \
  -d '{"type":"test","workspaceId":"test","taskId":"test"}'
```

## 🐛 Debug Tools

### Check Task Status
```bash
curl http://localhost:3000/api/debug/task/<taskId> | jq .
```

### View All Tasks
```bash
# Go to: http://localhost:3000/tasks
```

### Reset Database
```bash
# Delete all tasks and workspaces
./scripts/full-reset.sh
```

### Cancel Stuck Task
```bash
curl -X POST http://localhost:3000/api/admin/cancel-task/<taskId>
```

## 📝 Key Files

- **Daytona Client**: `lib/daytona/client.ts` - Makes API calls to Daytona
- **Webhook Handler**: `app/api/webhook/daytona/route.ts` - Receives completion webhooks
- **Task Execution**: `app/api/task/[taskId]/execute/route.ts` - Starts task execution
- **Execution Script Template**: `daytona/execution.sh` - Script that should run in Daytona workspace
- **Convex Schema**: `convex/schema.ts` - Database schema
- **Task Queries**: `convex/tasks.ts` - Database operations

## 🔐 ngrok Setup (For Webhooks)

```bash
# 1. Install
brew install ngrok

# 2. Sign up & get token
# Visit: https://dashboard.ngrok.com/get-started/your-authtoken

# 3. Add token
ngrok config add-authtoken YOUR_TOKEN

# 4. Start tunnel
ngrok http 3000

# 5. Copy HTTPS URL and add to .env.local
NEXT_PUBLIC_APP_URL=https://your-url.ngrok-free.dev

# 6. Restart Next.js
```

## 🎯 Next Steps (Priority Order)

1. **Decide on execution backend**:
   - Create Daytona template (best for cloud execution)
   - OR use different service (GitHub Actions, Modal, etc.)
   - OR build custom execution engine

2. **If using Daytona**:
   - Contact Daytona support about creating "pithy-jaunt-dev" template
   - OR use their template builder to create one
   - Test execution script locally first

3. **If using alternative**:
   - Replace `lib/daytona/client.ts` with new integration
   - Ensure it sends webhooks to `/api/webhook/daytona` (or create new endpoint)
   - Update task execution flow in `app/api/task/[taskId]/execute/route.ts`

4. **Production deployment**:
   - Replace ngrok with permanent public URL
   - Set up proper webhook authentication/signing
   - Add error handling and retries
   - Set up monitoring/alerting

## 🤝 Current Working State

For demonstration/testing purposes, you can:
1. Create tasks via UI ✅
2. Execute tasks (creates Daytona workspace) ✅
3. Manually complete tasks via script ✅
4. View task status and PR links in UI ✅

For actual code generation, you need to set up the execution backend.

## 📞 Support

- Daytona Docs: https://www.daytona.io/docs
- Daytona Dashboard: https://app.daytona.io
- ngrok Docs: https://ngrok.com/docs

---

**Last Updated**: 2025-11-16
**Status**: Webhook infrastructure complete, execution backend needed

