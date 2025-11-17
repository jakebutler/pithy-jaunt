/**
 * Script to clear all repositories and tasks from the database
 * Keeps users intact
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;

if (!convexUrl) {
  console.error("Error: NEXT_PUBLIC_CONVEX_URL or CONVEX_URL environment variable not set");
  console.error("Make sure you have a .env.local file with NEXT_PUBLIC_CONVEX_URL set");
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);

async function clearData() {
  try {
    console.log("Clearing all repositories and tasks...");
    console.log(`Using Convex URL: ${convexUrl}\n`);
    
    // Delete all tasks
    console.log("Deleting all tasks...");
    const deleteTasksResult = await client.mutation(api.tasks.deleteAllTasks, {});
    console.log(`✅ Deleted ${deleteTasksResult.deleted} tasks\n`);
    
    // Delete all repos
    console.log("Deleting all repositories...");
    const deleteReposResult = await client.mutation(api.repos.deleteAllRepos, {});
    console.log(`✅ Deleted ${deleteReposResult.deleted} repositories\n`);
    
    console.log("✅ Data cleared successfully!");
    console.log("Users remain intact.");
    
  } catch (error) {
    console.error("Error clearing data:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  }
}

clearData();

