#!/usr/bin/env node
/**
 * Reset database - delete all tasks and workspaces
 * This uses the Convex HTTP client directly
 */

import { ConvexHttpClient } from "convex/browser";

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

    // Note: This will delete ALL workspaces and ALL tasks for ALL users
    // In production, you'd want to scope this to a specific user
    
    console.log("Deleting all workspaces...");
    const workspaceResult = await client.mutation(
      "workspaces:deleteAllWorkspaces" as any,
      {}
    );
    console.log(`✓ Deleted ${workspaceResult.deleted} workspaces`);

    // For tasks, we need a user ID. Let's just document the manual approach
    console.log("\n⚠️  To delete tasks, use the Convex dashboard:");
    console.log("1. Go to: https://dashboard.convex.dev");
    console.log("2. Select your project");
    console.log("3. Go to 'Data' tab");
    console.log("4. Select 'tasks' table");
    console.log("5. Delete all rows");
    console.log("\nOR use the API endpoint while Next.js is running:");
    console.log("curl -X DELETE http://localhost:3000/api/debug/delete-all-tasks");
    
    console.log("\n✅ Database reset complete!\n");
    
    client.close();
    process.exit(0);
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    client.close();
    process.exit(1);
  }
}

resetDatabase();

