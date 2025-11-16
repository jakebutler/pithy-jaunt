#!/usr/bin/env tsx
/**
 * Delete all tasks and workspaces from the database
 * Usage: npx tsx scripts/delete-all-tasks.ts
 */

import { convexClient } from "../lib/convex/server";
import { api } from "../convex/_generated/api";

async function deleteAllTasks() {
  try {
    console.log("\n🗑️  Deleting all tasks and workspaces...\n");

    // Note: This requires adding delete mutations to Convex
    // For now, we'll just update all running tasks to cancelled

    // Get all tasks
    console.log("Fetching all tasks...");
    
    // This would need a new Convex query to get ALL tasks
    // For now, let's create a simpler approach using the API
    
    console.log("⚠️  Note: This script requires direct database access.");
    console.log("Please use the Convex dashboard to delete tasks:");
    console.log("1. Go to: https://dashboard.convex.dev");
    console.log("2. Select your project");
    console.log("3. Go to 'Data' tab");
    console.log("4. Select 'tasks' table");
    console.log("5. Delete all rows");
    console.log("6. Repeat for 'workspaces' table");
    console.log("\n");

  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

deleteAllTasks();

