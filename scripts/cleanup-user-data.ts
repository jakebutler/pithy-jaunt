#!/usr/bin/env tsx
/**
 * Cleanup User Data Script
 * 
 * Deletes all repositories, tasks, execution logs, and related workspaces
 * for specified user(s) while preserving user account data.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-user-data.ts
 * 
 * Configuration:
 *   Edit the USER_EMAILS array below to specify which users to clean up.
 */

// Load environment variables FIRST using require (synchronous)
// This ensures env vars are loaded before any module evaluation
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

// Create Convex client directly (don't import from server.ts which validates at import time)
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  console.error("❌ Missing NEXT_PUBLIC_CONVEX_URL environment variable");
  console.error("Make sure .env.local or .env contains NEXT_PUBLIC_CONVEX_URL");
  process.exit(1);
}

const convexClient = new ConvexHttpClient(convexUrl);

// ============================================================================
// CONFIGURATION: Edit this array to specify which users to clean up
// ============================================================================
const USER_EMAILS = [
  "butler.jake@gmail.com",
  // Add more email addresses as needed:
  // "user2@example.com",
  // "user3@example.com",
];

// ============================================================================

interface CleanupStats {
  usersFound: number;
  reposDeleted: number;
  tasksDeleted: number;
  executionLogsDeleted: number;
  workspacesDeleted: number;
}

async function cleanupUserData() {
  const stats: CleanupStats = {
    usersFound: 0,
    reposDeleted: 0,
    tasksDeleted: 0,
    executionLogsDeleted: 0,
    workspacesDeleted: 0,
  };

  try {
    console.log("\n🧹 Starting user data cleanup...\n");
    console.log(`Target users: ${USER_EMAILS.join(", ")}\n`);

    if (USER_EMAILS.length === 0) {
      console.error("❌ No user emails specified. Please edit USER_EMAILS in the script.");
      process.exit(1);
    }

    // Step 1: Find all users by email
    console.log("Step 1: Finding users...");
    const users: Array<{ _id: Id<"users">; email: string }> = [];

    for (const email of USER_EMAILS) {
      const user = await convexClient.query(api.users.getUserByEmail, {
        email: email.trim(),
      });

      if (user) {
        users.push({ _id: user._id, email: user.email });
        console.log(`  ✓ Found user: ${user.email} (ID: ${user._id})`);
      } else {
        console.log(`  ⚠️  User not found: ${email}`);
      }
    }

    if (users.length === 0) {
      console.log("\n❌ No users found. Nothing to clean up.\n");
      process.exit(0);
    }

    stats.usersFound = users.length;
    console.log(`\nFound ${users.length} user(s) to clean up.\n`);

    // Step 2: Delete all repositories for each user
    console.log("Step 2: Deleting repositories...");
    for (const user of users) {
      const result = await convexClient.mutation(
        api.repos.deleteAllReposForUser,
        {
          userId: user._id,
        }
      );
      stats.reposDeleted += result.deleted;
      if (result.deleted > 0) {
        console.log(
          `  ✓ Deleted ${result.deleted} repository/repositories for ${user.email}`
        );
      }
    }

    // Step 3: Get all tasks for these users and collect task IDs
    console.log("\nStep 3: Collecting tasks...");
    const allTaskIds: Id<"tasks">[] = [];

    for (const user of users) {
      const tasks = await convexClient.query(api.tasks.getTasksByUser, {
        userId: user._id,
      });
      if (tasks) {
        allTaskIds.push(...tasks.map((task) => task._id));
      }
    }

    console.log(`  Found ${allTaskIds.length} task(s) to delete`);

    // Step 4: Delete execution logs for all tasks
    if (allTaskIds.length > 0) {
      console.log("\nStep 4: Deleting execution logs...");
      const logsResult = await convexClient.mutation(
        api.executionLogs.deleteLogsByTasks,
        {
          taskIds: allTaskIds,
        }
      );
      stats.executionLogsDeleted = logsResult.deleted;
      if (logsResult.deleted > 0) {
        console.log(`  ✓ Deleted ${logsResult.deleted} execution log(s)`);
      }
    }

    // Step 5: Delete workspaces that only have these tasks assigned
    if (allTaskIds.length > 0) {
      console.log("\nStep 5: Deleting related workspaces...");
      const workspacesResult = await convexClient.mutation(
        api.workspaces.deleteWorkspacesByTasks,
        {
          taskIds: allTaskIds,
        }
      );
      stats.workspacesDeleted = workspacesResult.deleted;
      if (workspacesResult.deleted > 0) {
        console.log(`  ✓ Deleted ${workspacesResult.deleted} workspace(s)`);
      }
    }

    // Step 6: Delete all tasks for each user
    console.log("\nStep 6: Deleting tasks...");
    for (const user of users) {
      const result = await convexClient.mutation(
        api.tasks.deleteAllTasksForUser,
        {
          userId: user._id,
        }
      );
      stats.tasksDeleted += result.deleted;
      if (result.deleted > 0) {
        console.log(
          `  ✓ Deleted ${result.deleted} task(s) for ${user.email}`
        );
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ Cleanup Complete!");
    console.log("=".repeat(60));
    console.log(`Users processed:     ${stats.usersFound}`);
    console.log(`Repositories deleted: ${stats.reposDeleted}`);
    console.log(`Tasks deleted:        ${stats.tasksDeleted}`);
    console.log(`Execution logs deleted: ${stats.executionLogsDeleted}`);
    console.log(`Workspaces deleted:   ${stats.workspacesDeleted}`);
    console.log("=".repeat(60));
    console.log("\n✓ User account data preserved (users can still log in)\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error during cleanup:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the cleanup
cleanupUserData();

