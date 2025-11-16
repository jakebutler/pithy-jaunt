#!/bin/bash
# Check status of a specific task
# Usage: ./scripts/check-specific-task.sh <taskId>

TASK_ID="${1:-j9716s3wspb4j7s01fjhbz19217vhztz}"

echo "🔍 Checking task: $TASK_ID"
echo ""

# Check if we have the required environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$NEXT_PUBLIC_CONVEX_URL" ]; then
  echo "❌ NEXT_PUBLIC_CONVEX_URL not set"
  echo "Please set it in .env.local or export it"
  exit 1
fi

# Use npx tsx to run a TypeScript check
npx tsx -e "
import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const taskId = '$TASK_ID';

async function checkTask() {
  try {
    // Get task
    const task = await client.query(api.tasks.getTaskById, { taskId });
    
    if (!task) {
      console.log('❌ Task not found');
      process.exit(1);
    }
    
    console.log('📋 Task Details:');
    console.log('  Title:', task.title);
    console.log('  Status:', task.status);
    console.log('  Created:', new Date(task.createdAt).toLocaleString());
    console.log('  Updated:', new Date(task.updatedAt).toLocaleString());
    console.log('');
    console.log('💻 Execution Details:');
    console.log('  Workspace ID:', task.assignedWorkspaceId || '(none)');
    console.log('  Branch:', task.branchName || '(none)');
    console.log('  PR URL:', task.prUrl || '(none)');
    console.log('');
    
    // Check how long it's been running
    const now = Date.now();
    const runningTime = now - task.updatedAt;
    const runningMinutes = Math.floor(runningTime / 60000);
    
    if (task.status === 'running') {
      console.log('⏱️  Running for:', runningMinutes, 'minutes');
      if (runningMinutes > 10) {
        console.log('⚠️  WARNING: Task has been running for more than 10 minutes');
        console.log('   This might indicate the task is stuck or webhook was not received');
      }
    }
    
    // Get logs
    const logs = await client.query(api.executionLogs.getLogsByTask, { taskId });
    console.log('');
    console.log('📝 Execution Logs:', logs.length, 'entries');
    
    if (logs.length > 0) {
      const latestLog = logs.sort((a, b) => b.createdAt - a.createdAt)[0];
      console.log('  Latest log status:', latestLog.status);
      console.log('  Latest log time:', new Date(latestLog.createdAt).toLocaleString());
      if (latestLog.error) {
        console.log('  Error:', latestLog.error);
      }
    } else {
      console.log('  No logs found yet');
    }
    
    // Get workspace if assigned
    if (task.assignedWorkspaceId) {
      const workspace = await client.query(api.workspaces.getWorkspaceByDaytonaId, {
        daytonaId: task.assignedWorkspaceId
      });
      
      if (workspace) {
        console.log('');
        console.log('🏗️  Workspace:');
        console.log('  Status:', workspace.status);
        console.log('  Created:', new Date(workspace.createdAt).toLocaleString());
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTask();
"

