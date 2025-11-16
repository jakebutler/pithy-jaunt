#!/usr/bin/env tsx
/**
 * Test Browser Use Cloud Git Ingest Integration
 * 
 * Tests the Browser Use Cloud API to process a repository through GitIngest.com
 */

// Load environment variables
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

import { processGitIngest } from "../lib/gitingest/client";

const TEST_REPO = "https://github.com/jakebutler/pithy-jaunt";

async function testBrowserUseCloud() {
  console.log("🧪 Testing Browser Use Cloud Git Ingest integration...\n");
  console.log(`Repository: ${TEST_REPO}\n`);

  const apiKey = process.env.BROWSER_USE_API_KEY;
  if (!apiKey) {
    console.error("❌ BROWSER_USE_API_KEY not found in environment variables");
    console.error("Please set it in .env.local or .env");
    process.exit(1);
  }

  console.log("✓ Browser Use API key found\n");
  console.log("⏳ Processing git ingest via Browser Use Cloud...");
  console.log("(This may take 1-5 minutes)\n");

  try {
    // Force use of Browser Use Cloud
    const content = await processGitIngest(TEST_REPO, true);
    
    console.log("✅ Success! Content retrieved:");
    console.log(`Content length: ${content.length} characters\n`);
    console.log("First 500 characters:");
    console.log(content.substring(0, 500));
    console.log("\n...\n");
    console.log("Last 500 characters:");
    console.log(content.substring(content.length - 500));
    
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

testBrowserUseCloud();

