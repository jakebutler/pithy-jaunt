#!/usr/bin/env tsx
/**
 * Debug script to check task status
 * Usage: npx tsx scripts/check-task.ts <taskId>
 */

import { convexClient } from "../lib/convex/server";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

const taskId = process.argv[2];

if (!taskId) {
  console.error("Usage: npx tsx scripts/check-task.ts <taskId>");
  process.exit(1);
}

async function checkTask() {
  try {
    console.log(`\n🔍 Checking task: ${taskId}\n`);

    // Get task
    const task = await convexClient.query(api.tasks.getTaskById, {
      taskId: taskId as Id<"tasks">,
    });

    if (!task) {
      console.error("❌ Task not found");
      process.exit(1);
    }

    console.log("📋 Task Details:");
    console.log("  Title:", task.title);
    console.log("  Description:", task.description);
    console.log("  Status:", task.status);
    console.log("  Priority:", task.priority);
    console.log("  Created:", new Date(task.createdAt).toLocaleString());
    console.log("  Updated:", new Date(task.updatedAt).toLocaleString());
    console.log("\n💻 Execution Details:");
    console.log("  Workspace ID:", task.assignedWorkspaceId || "(none)");
    console.log("  Branch:", task.branchName || "(none)");
    console.log("  PR URL:", task.prUrl || "(none)");

    // Get repository
    const repo = await convexClient.query(api.repos.getRepoById, {
      repoId: task.repoId,
    });

    if (repo) {
      console.log("\n📦 Repository:");
      console.log("  Name:", `${repo.owner}/${repo.name}`);
      console.log("  URL:", repo.url);
      console.log("  Branch:", repo.branch);
    }

    // Get workspace if assigned
    if (task.assignedWorkspaceId) {
      const workspace = await convexClient.query(
        api.workspaces.getWorkspaceByDaytonaId,
        { daytonaId: task.assignedWorkspaceId }
      );

      if (workspace) {
        console.log("\n🖥️  Workspace:");
        console.log("  Daytona ID:", workspace.daytonaId);
        console.log("  Status:", workspace.status);
        console.log("  Template:", workspace.template);
        console.log("  Created:", new Date(workspace.createdAt).toLocaleString());
        console.log("  Last Used:", new Date(workspace.lastUsedAt).toLocaleString());
      } else {
        console.log("\n⚠️  Workspace not found in database (but ID is assigned)");
      }
    }

    console.log("\n");

    // Provide recommendations
    if (task.status === "running") {
      const runningTime = Date.now() - task.updatedAt;
      const runningMinutes = Math.floor(runningTime / 60000);

      console.log("⏱️  Task has been running for:", runningMinutes, "minutes");
      
      if (runningMinutes > 10) {
        console.log("\n⚠️  WARNING: Task has been running for a long time.");
        console.log("   Possible issues:");
        console.log("   - Daytona workspace is stuck or failed");
        console.log("   - Webhook from Daytona is not being received");
        console.log("   - Network/connectivity issues");
        console.log("\n   Recommendations:");
        console.log("   1. Check server logs for Daytona API errors");
        console.log("   2. Verify DAYTONA_API_URL and DAYTONA_API_KEY are set");
        console.log("   3. Check if Daytona workspace actually exists");
        console.log("   4. Manually cancel and retry the task");
      }
    }

    if (task.status === "completed" && task.prUrl) {
      console.log("✅ Task completed successfully!");
      console.log("   View PR:", task.prUrl);
    }

    if (task.status === "failed") {
      console.log("❌ Task failed. Check execution logs for details.");
    }

  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkTask();


