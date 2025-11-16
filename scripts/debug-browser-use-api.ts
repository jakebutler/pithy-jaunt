#!/usr/bin/env tsx
/**
 * Debug Browser Use Cloud API
 * 
 * Tests the API directly to see what's happening
 */

// Load environment variables
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const apiKey = process.env.BROWSER_USE_API_KEY;
if (!apiKey) {
  console.error("❌ BROWSER_USE_API_KEY not found");
  process.exit(1);
}
// TypeScript doesn't narrow after process.exit, so we assert the type
const apiKeyString: string = apiKey;

const TEST_REPO = "https://github.com/jakebutler/pithy-jaunt";

const task = `Navigate to https://gitingest.com/ and process the repository ${TEST_REPO}.

Steps:
1. Go to https://gitingest.com/
2. Find the input field for the repository URL
3. Enter the repository URL: ${TEST_REPO}
4. Submit the form or click the process/analyze button
5. Wait for processing to complete (30-60 seconds)
6. Extract the digest content from the page
7. Return the FULL, COMPLETE content as text`;

async function debugAPI() {
  console.log("🔍 Debugging Browser Use Cloud API...\n");
  console.log(`API URL: https://api.browser-use.com/api/v2/tasks\n`);

  try {
    // Step 1: Create task
    console.log("Step 1: Creating task...");
    const createResponse = await fetch("https://api.browser-use.com/api/v2/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Browser-Use-API-Key": apiKeyString,
      },
      body: JSON.stringify({ task }),
    });

    console.log(`Status: ${createResponse.status} ${createResponse.statusText}`);
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("❌ Error creating task:", errorText);
      process.exit(1);
    }

    const taskData = await createResponse.json();
    console.log("Task created:", JSON.stringify(taskData, null, 2));
    
    const taskId = taskData.id || taskData.task_id;
    if (!taskId) {
      console.error("❌ No task ID in response");
      process.exit(1);
    }

    console.log(`\n✓ Task ID: ${taskId}\n`);

    // Step 2: Poll for status
    console.log("Step 2: Polling for task status...");
    let attempts = 0;
    const maxAttempts = 20; // 20 attempts = ~1 minute
    
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      attempts++;

      const statusResponse = await fetch(
        `https://api.browser-use.com/api/v2/tasks/${taskId}`,
        {
          headers: {
            "X-Browser-Use-API-Key": apiKeyString,
          },
        }
      );

      if (!statusResponse.ok) {
        console.error(`❌ Status check failed: ${statusResponse.status} ${statusResponse.statusText}`);
        const errorText = await statusResponse.text();
        console.error("Error:", errorText);
        break;
      }

      const result = await statusResponse.json();
      console.log(`\nAttempt ${attempts}:`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Steps: ${result.steps?.length || 0}`);
      console.log(`  Has output: ${!!result.output}`);
      console.log(`  Output length: ${result.output ? (typeof result.output === 'string' ? result.output.length : JSON.stringify(result.output).length) : 0}`);
      
      // Show last step if available
      if (result.steps && result.steps.length > 0) {
        const lastStep = result.steps[result.steps.length - 1];
        console.log(`  Last step action: ${lastStep.action || lastStep.type || 'unknown'}`);
        console.log(`  Last step keys: ${Object.keys(lastStep).join(", ")}`);
        if (lastStep.error) {
          console.log(`  Last step error: ${lastStep.error}`);
        }
        if (lastStep.observation || lastStep.thought) {
          const obs = lastStep.observation || lastStep.thought;
          const obsStr = typeof obs === 'string' ? obs : JSON.stringify(obs);
          console.log(`  Last step observation: ${obsStr.substring(0, 200)}...`);
        }
      }
      
      if (result.status === "finished") {
        console.log("\n✅ Task finished!");
        console.log("\nFull response (first 2000 chars):");
        const responseStr = JSON.stringify(result, null, 2);
        console.log(responseStr.substring(0, 2000));
        if (responseStr.length > 2000) {
          console.log(`\n... (${responseStr.length - 2000} more characters)`);
        }
        break;
      }

      if (result.status === "stopped" || result.status === "failed") {
        console.log("\n❌ Task stopped/failed");
        console.log("Response:", JSON.stringify(result, null, 2));
        break;
      }

      if (result.status === "started" || result.status === "created") {
        console.log(`  Still running... (${result.status})`);
        // Check if we have output even if status is started
        if (result.output && typeof result.output === 'string' && result.output.length > 1000) {
          console.log(`  ⚠️  Has substantial output but status is still 'started'`);
          console.log(`  Output preview: ${result.output.substring(0, 200)}...`);
        }
      }
    }

    if (attempts >= maxAttempts) {
      console.log("\n⏱️  Reached max attempts, task may still be running");
    }

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugAPI();

