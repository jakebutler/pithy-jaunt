#!/usr/bin/env tsx
/**
 * Create a Daytona snapshot from the declarative image definition
 * 
 * This script creates a pre-built snapshot from the declarative image
 * defined in lib/daytona/declarative-image.ts. This combines the benefits
 * of version-controlled image definitions with the reliability and speed
 * of pre-built snapshots.
 * 
 * Usage:
 *   npx tsx scripts/create-snapshot-from-declarative.ts <snapshot-name>
 * 
 * Example:
 *   npx tsx scripts/create-snapshot-from-declarative.ts pithy-jaunt-v1.0.6
 * 
 * Environment variables required:
 *   DAYTONA_API_KEY - Your Daytona API key
 *   DAYTONA_API_URL - Daytona API URL (default: https://app.daytona.io/api)
 *   DAYTONA_TARGET - Daytona target region (default: us)
 */

import { Daytona } from "@daytonaio/sdk";
import { createPithyJauntSnapshot } from "../lib/daytona/declarative-image";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  // Get snapshot name from command line argument
  const snapshotName = process.argv[2];

  if (!snapshotName) {
    console.error("❌ Error: Snapshot name is required");
    console.error("");
    console.error("Usage:");
    console.error("  npx tsx scripts/create-snapshot-from-declarative.ts <snapshot-name>");
    console.error("");
    console.error("Example:");
    console.error("  npx tsx scripts/create-snapshot-from-declarative.ts pithy-jaunt-v1.0.6");
    process.exit(1);
  }

  // Validate required environment variables
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: DAYTONA_API_KEY environment variable is required");
    console.error("");
    console.error("Set it in your .env.local file or export it:");
    console.error("  export DAYTONA_API_KEY=your_key_here");
    process.exit(1);
  }

  const apiUrl = process.env.DAYTONA_API_URL || "https://app.daytona.io/api";
  const target = process.env.DAYTONA_TARGET || "us";

  console.log("🚀 Creating Daytona snapshot from declarative image...");
  console.log("");
  console.log("Configuration:");
  console.log(`  Snapshot name: ${snapshotName}`);
  console.log(`  API URL: ${apiUrl}`);
  console.log(`  Target: ${target}`);
  console.log("");

  try {
    // Initialize Daytona SDK
    const daytona = new Daytona({
      apiKey,
      apiUrl,
      target,
    });

    // Create snapshot from declarative image
    console.log("📦 Building snapshot from declarative image definition...");
    console.log("   (This may take a few minutes - streaming build logs below)");
    console.log("");

    await createPithyJauntSnapshot(daytona, snapshotName);

    console.log("");
    console.log("✅ Snapshot created successfully!");
    console.log("");
    console.log("Next steps:");
    console.log(`  1. Update DAYTONA_SNAPSHOT_NAME=${snapshotName} in your environment`);
    console.log("  2. Ensure DAYTONA_USE_DECLARATIVE_IMAGE is not set (or false)");
    console.log("  3. Deploy/restart your application");
    console.log("");
    console.log("The snapshot is now available for use when creating workspaces.");
  } catch (error) {
    console.error("");
    console.error("❌ Error creating snapshot:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error("");
        console.error("Stack trace:");
        console.error(error.stack);
      }
    } else {
      console.error(`   ${String(error)}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});

