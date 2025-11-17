#!/usr/bin/env node
/**
 * Reset database - delete all tasks, workspaces, and repositories
 * Keeps users intact
 * This uses the Convex HTTP client directly
 */

// Load environment variables
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ NEXT_PUBLIC_CONVEX_URL not set in environment");
  console.error("Make sure .env.local is configured");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function resetDatabase() {
  try {
    console.log("\n🗑️  Resetting database...\n");
    console.log("Note: This will delete ALL repos, tasks, and workspaces");
    console.log("Users will be preserved.\n");

    // Delete all repositories
    console.log("Deleting all repositories...");
    const reposResult = await client.mutation(api.repos.deleteAllRepos, {});
    console.log(`✓ Deleted ${reposResult.deleted} repositories\n`);

    // Delete all tasks
    console.log("Deleting all tasks...");
    const tasksResult = await client.mutation(api.tasks.deleteAllTasks, {});
    console.log(`✓ Deleted ${tasksResult.deleted} tasks\n`);

    // Delete all workspaces
    console.log("Deleting all workspaces...");
    const workspaceResult = await client.mutation(
      api.workspaces.deleteAllWorkspaces,
      {}
    );
    console.log(`✓ Deleted ${workspaceResult.deleted} workspaces\n`);
    
    console.log("✅ Database reset complete!");
    console.log("✓ Users preserved\n");
    
    process.exit(0);
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

resetDatabase();

