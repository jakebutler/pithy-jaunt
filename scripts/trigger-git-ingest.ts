#!/usr/bin/env tsx
/**
 * Manually Trigger Git Ingest Script
 * 
 * Manually triggers git ingest processing for a repository.
 * Useful for testing or retrying failed git ingest operations.
 * 
 * Usage:
 *   npx tsx scripts/trigger-git-ingest.ts [repoId]
 * 
 * If no repoId is provided, it will list all repos for the default user.
 */

// Load environment variables FIRST using require (synchronous)
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

// Create Convex client directly
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { processGitIngestWithRetry } from "../lib/gitingest/client";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  console.error("❌ Missing NEXT_PUBLIC_CONVEX_URL environment variable");
  process.exit(1);
}

const convexClient = new ConvexHttpClient(convexUrl);

// Default user email
const DEFAULT_USER_EMAIL = "butler.jake@gmail.com";

async function triggerGitIngest() {
  try {
    const repoIdArg = process.argv[2];
    const userEmail = process.argv[3] || DEFAULT_USER_EMAIL;

    // Find user by email
    const user = await convexClient.query(api.users.getUserByEmail, {
      email: userEmail.trim(),
    });

    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }

    // Get all repositories for the user
    const repos = await convexClient.query(api.repos.getReposByUser, {
      userId: user._id,
    });

    if (repos.length === 0) {
      console.log("No repositories found for this user.\n");
      process.exit(0);
    }

    let targetRepo;

    if (repoIdArg) {
      // Find specific repo by ID
      targetRepo = repos.find((r) => r._id === repoIdArg);
      if (!targetRepo) {
        console.error(`❌ Repository not found: ${repoIdArg}`);
        console.log("\nAvailable repositories:");
        repos.forEach((r) => {
          console.log(`  - ${r._id}: ${r.owner}/${r.name}`);
        });
        process.exit(1);
      }
    } else {
      // Use the most recent repo
      targetRepo = repos[0];
      console.log("\nNo repoId provided. Using most recent repository:");
      console.log(`  ${targetRepo.owner}/${targetRepo.name} (${targetRepo._id})\n`);
    }

    console.log("🚀 Triggering git ingest processing...\n");
    console.log(`Repository: ${targetRepo.owner}/${targetRepo.name}`);
    console.log(`URL: ${targetRepo.url}`);
    console.log(`Current Status: ${targetRepo.gitIngestStatus || "pending"}\n`);

    // Update status to processing
    await convexClient.mutation(api.repos.updateGitIngest, {
      repoId: targetRepo._id,
      status: "processing",
    });

    console.log("✓ Status updated to 'processing'\n");
    console.log("⏳ Processing git ingest (this may take 1-5 minutes)...\n");
    console.log("Using GitIngest Python package\n");

    // Process git ingest with retry
    const content = await processGitIngestWithRetry(
      targetRepo.url,
      true, // useCloud parameter kept for compatibility but not used
      1
    );

    console.log(`\n✓ Git ingest completed! Content length: ${content.length} characters\n`);

    // Update repository with git ingest content
    await convexClient.mutation(api.repos.updateGitIngest, {
      repoId: targetRepo._id,
      status: "completed",
      content,
      generatedAt: Date.now(),
    });

    console.log("✅ Repository updated with git ingest content");
    console.log(`\nYou can now check the status with:`);
    console.log(`  npx tsx scripts/check-git-ingest-status.ts\n`);

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);

    // Try to update status to failed if we have a repoId
    const repoIdArg = process.argv[2];
    if (repoIdArg) {
      try {
        await convexClient.mutation(api.repos.updateGitIngest, {
          repoId: repoIdArg as any,
          status: "failed",
        });
        console.log("\n✓ Status updated to 'failed'");
      } catch (updateError) {
        console.error("Failed to update status:", updateError);
      }
    }

    process.exit(1);
  }
}

// Run the trigger
triggerGitIngest();

