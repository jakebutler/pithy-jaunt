#!/usr/bin/env tsx
/**
 * Test different parameter combinations for Daytona API workspace creation
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

const DAYTONA_API_URL = process.env.DAYTONA_API_URL || "https://app.daytona.io/api";
const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY;

if (!DAYTONA_API_KEY) {
  console.error("❌ DAYTONA_API_KEY required");
  process.exit(1);
}
// TypeScript doesn't narrow after process.exit, so we assert the type
const apiKeyString: string = DAYTONA_API_KEY;

const testRepo = "https://github.com/jakebutler/pithy-jaunt";
const testBranch = "main";

async function testParams(name: string, body: any) {
  console.log(`\n🧪 Test: ${name}`);
  console.log(`Request body:`, JSON.stringify(body, null, 2));
  
  try {
    const response = await fetch(`${DAYTONA_API_URL}/workspace`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKeyString}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const snapshot = data.snapshot || data.image || "unknown";
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`Snapshot used: ${snapshot}`);
    console.log(`Workspace ID: ${data.id || data.workspaceId || "none"}`);
    
    // Clean up
    if (data.id || data.workspaceId) {
      const workspaceId = data.id || data.workspaceId;
      await fetch(`${DAYTONA_API_URL}/workspace/${workspaceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKeyString}` },
      });
      console.log(`🧹 Cleaned up workspace ${workspaceId}`);
    }
    
    return snapshot === "pithy-jaunt-dev" || snapshot.includes("pithy");
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log("Testing different parameter combinations for Daytona API...\n");

  const tests = [
    {
      name: "snapshot parameter only",
      body: { snapshot: "pithy-jaunt-dev", repoUrl: testRepo, branch: testBranch, env: {} },
    },
    {
      name: "image parameter only",
      body: { image: "pithy-jaunt-dev", repoUrl: testRepo, branch: testBranch, env: {} },
    },
    {
      name: "both snapshot and image",
      body: { snapshot: "pithy-jaunt-dev", image: "pithy-jaunt-dev", repoUrl: testRepo, branch: testBranch, env: {} },
    },
    {
      name: "template parameter",
      body: { template: "pithy-jaunt-dev", repoUrl: testRepo, branch: testBranch, env: {} },
    },
  ];

  let success = false;
  for (const test of tests) {
    const result = await testParams(test.name, test.body);
    if (result) {
      console.log(`\n✅ SUCCESS! ${test.name} worked!`);
      success = true;
      break;
    }
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  if (!success) {
    console.log("\n❌ None of the parameter combinations worked.");
    console.log("The REST API may not support custom snapshots.");
    console.log("You may need to use the Daytona CLI or contact Daytona support.");
  }
}

runTests();

