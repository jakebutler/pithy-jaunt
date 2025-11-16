#!/usr/bin/env tsx
/**
 * Check Git Ingest Status Script
 * 
 * Shows the git ingest processing status for all repositories for a user.
 * 
 * Usage:
 *   npx tsx scripts/check-git-ingest-status.ts [email]
 * 
 * If no email is provided, uses the default from USER_EMAIL below.
 */

// Load environment variables FIRST using require (synchronous)
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

// Create Convex client directly
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  console.error("❌ Missing NEXT_PUBLIC_CONVEX_URL environment variable");
  process.exit(1);
}

const convexClient = new ConvexHttpClient(convexUrl);

// Default user email (can be overridden via command line argument)
const DEFAULT_USER_EMAIL = "butler.jake@gmail.com";

async function checkGitIngestStatus() {
  try {
    // Get email from command line or use default
    const userEmail = process.argv[2] || DEFAULT_USER_EMAIL;

    console.log("\n🔍 Checking git ingest status...\n");
    console.log(`User: ${userEmail}\n`);

    // Find user by email
    const user = await convexClient.query(api.users.getUserByEmail, {
      email: userEmail.trim(),
    });

    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.email} (ID: ${user._id})\n`);

    // Get all repositories for the user
    const repos = await convexClient.query(api.repos.getReposByUser, {
      userId: user._id,
    });

    if (repos.length === 0) {
      console.log("No repositories found for this user.\n");
      process.exit(0);
    }

    console.log(`Found ${repos.length} repository/repositories:\n`);
    console.log("=".repeat(80));

    for (const repo of repos) {
      const gitIngestStatus = repo.gitIngestStatus || "pending";
      const gitIngestGeneratedAt = repo.gitIngestGeneratedAt
        ? new Date(repo.gitIngestGeneratedAt).toLocaleString()
        : "N/A";
      const hasContent = repo.gitIngestContent ? "Yes" : "No";
      const contentLength = repo.gitIngestContent
        ? `${(repo.gitIngestContent.length / 1024).toFixed(2)} KB`
        : "N/A";

      // Status emoji
      const statusEmoji =
        gitIngestStatus === "completed"
          ? "✅"
          : gitIngestStatus === "processing"
          ? "⏳"
          : gitIngestStatus === "failed"
          ? "❌"
          : "⏸️";

      console.log(`\nRepository: ${repo.owner}/${repo.name}`);
      console.log(`  URL: ${repo.url}`);
      console.log(`  Branch: ${repo.branch}`);
      console.log(`  Git Ingest Status: ${statusEmoji} ${gitIngestStatus}`);
      console.log(`  Generated At: ${gitIngestGeneratedAt}`);
      console.log(`  Has Content: ${hasContent}`);
      if (repo.gitIngestContent) {
        console.log(`  Content Size: ${contentLength}`);
        // Show first 200 characters as preview
        const preview = repo.gitIngestContent.substring(0, 200).replace(/\n/g, " ");
        console.log(`  Content Preview: ${preview}...`);
      }
      console.log(`  Created: ${new Date(repo.createdAt).toLocaleString()}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("\nStatus Legend:");
    console.log("  ✅ completed - Git ingest finished successfully");
    console.log("  ⏳ processing - Git ingest is currently running");
    console.log("  ❌ failed - Git ingest encountered an error");
    console.log("  ⏸️  pending - Git ingest has not started yet");
    console.log("\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the check
checkGitIngestStatus();

