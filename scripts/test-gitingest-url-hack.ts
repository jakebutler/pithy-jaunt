#!/usr/bin/env tsx
/**
 * Test GitIngest URL Hack Implementation
 * 
 * Tests the URL hack approach to see if we can extract digest content
 */

// Load environment variables
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

import { processGitIngest } from "../lib/gitingest/client";

const TEST_REPO = "https://github.com/jakebutler/pithy-jaunt";

async function testUrlHack() {
  console.log("🧪 Testing GitIngest URL hack implementation...\n");
  console.log(`Repository: ${TEST_REPO}\n`);

  try {
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
    console.error("❌ Error:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

testUrlHack();

