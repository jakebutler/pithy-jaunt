/**
 * Daytona TypeScript SDK Client
 * 
 * Uses the official Daytona TypeScript SDK to create and manage workspaces.
 * This is simpler and more reliable than using the REST API or CLI.
 * 
 * Documentation: https://www.daytona.io/docs/en/typescript-sdk/
 */

import { Daytona } from "@daytonaio/sdk";
import { buildPithyJauntImage } from "./declarative-image";

// Use declarative images by default (more scalable and flexible)
// Set DAYTONA_USE_DECLARATIVE_IMAGE=false to use pre-built snapshots
const USE_DECLARATIVE_IMAGE = process.env.DAYTONA_USE_DECLARATIVE_IMAGE !== "false";

// Fallback to snapshot name if not using declarative images
const DAYTONA_SNAPSHOT_NAME = process.env.DAYTONA_SNAPSHOT_NAME || "butlerjake/pithy-jaunt-daytona:v1.0.4";

interface CreateWorkspaceParams {
  repoUrl: string;
  branch: string;
  taskId: string;
  taskDescription: string;
  modelProvider: "openai" | "anthropic" | "openrouter";
  model: string;
  keepWorkspaceAlive?: boolean;
}

/**
 * Create a Daytona workspace using the TypeScript SDK
 */
export async function createWorkspaceViaSDK(
  params: CreateWorkspaceParams
): Promise<{
  workspaceId: string;
  status: "creating" | "running";
}> {
  // Initialize SDK (uses DAYTONA_API_KEY, DAYTONA_API_URL, DAYTONA_TARGET from env)
  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
    target: process.env.DAYTONA_TARGET || "us",
  });

  console.log("[Daytona SDK] Creating workspace:", {
    snapshot: DAYTONA_SNAPSHOT_NAME,
    repoUrl: params.repoUrl,
    branch: params.branch,
  });

  // Build environment variables
  const envVars: Record<string, string> = {
    TARGET_REPO: params.repoUrl,
    BRANCH_NAME: `pj/${params.taskId}`,
    TASK_ID: params.taskId,
    AGENT_PROMPT: params.taskDescription,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
    MODEL_PROVIDER: params.modelProvider,
    MODEL: params.model,
    WEBHOOK_URL: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/api/webhook/daytona`,
    KEEP_ALIVE: params.keepWorkspaceAlive ? "true" : "false",
  };

  try {
    let sandbox;
    
    if (USE_DECLARATIVE_IMAGE) {
      // Use declarative image (recommended - more scalable and flexible)
      console.log("[Daytona SDK] Creating workspace with declarative image...");
      console.log("[Daytona SDK] Image will be built on-demand and cached for 24 hours");
      
      const declarativeImage = buildPithyJauntImage();
      
      // Create workspace with declarative image
      // Daytona will build the image on-demand and cache it for 24 hours
      // Note: We don't pass onSnapshotCreateLogs callback because it can cause hangs
      // when the runner isn't ready yet. Build logs aren't critical for workspace creation.
      sandbox = await daytona.create({
        image: declarativeImage,
        envVars,
      });
      
      console.log("[Daytona SDK] Workspace created with declarative image");
    } else {
      // Use pre-built snapshot (fallback)
      console.log("[Daytona SDK] Creating workspace with snapshot:", DAYTONA_SNAPSHOT_NAME);
      
      // First, try to verify the snapshot exists (optional check)
      try {
        const snapshotList = await daytona.snapshot.list();
        const snapshotExists = snapshotList.items.some((s: { name?: string }) => s.name === DAYTONA_SNAPSHOT_NAME);
        console.log("[Daytona SDK] Snapshot check:", {
          snapshotName: DAYTONA_SNAPSHOT_NAME,
          exists: snapshotExists,
          availableSnapshots: snapshotList.items.map((s: { name?: string }) => s.name),
        });
        
        if (!snapshotExists) {
          console.warn(`[Daytona SDK] ⚠️ Snapshot "${DAYTONA_SNAPSHOT_NAME}" not found!`);
          console.warn(`[Daytona SDK] Available snapshots:`, snapshotList.items.map((s: { name?: string }) => s.name));
          console.warn(`[Daytona SDK] Will attempt to create anyway - SDK may use default if snapshot doesn't exist`);
        }
      } catch (snapshotCheckError: unknown) {
        const error = snapshotCheckError as { message?: string }
        console.warn("[Daytona SDK] Could not verify snapshot existence:", error.message || String(snapshotCheckError));
        // Continue anyway - the create call will fail if snapshot doesn't exist
      }
      
      sandbox = await daytona.create({
        snapshot: DAYTONA_SNAPSHOT_NAME,
        envVars,
      });
    }

    console.log("[Daytona SDK] Workspace created successfully:", {
      workspaceId: sandbox.id,
      imageType: USE_DECLARATIVE_IMAGE ? "declarative" : "snapshot",
      snapshotUsed: USE_DECLARATIVE_IMAGE ? "N/A (declarative)" : DAYTONA_SNAPSHOT_NAME,
    });

    // Wait for workspace runner to be ready before executing commands
    // This is critical - the workspace may be created but the runner might not be assigned yet
    console.log("[Daytona SDK] Waiting for workspace runner to be ready...");
    const maxWaitTime = 60000; // 60 seconds max wait
    const pollInterval = 2000; // Check every 2 seconds
    const startTime = Date.now();
    const sessionId = `task-${params.taskId}`;
    let runnerReady = false;

    // Try to create the actual session, retrying if runner isn't ready
    while (!runnerReady && (Date.now() - startTime) < maxWaitTime) {
      try {
        await sandbox.process.createSession(sessionId);
        runnerReady = true;
        console.log("[Daytona SDK] Workspace runner is ready, session created");
        break;
      } catch (error: unknown) {
        const err = error as { message?: string; statusCode?: number };
        const errorMessage = err.message || String(error);
        const statusCode = err.statusCode;
        
        if (errorMessage.includes("no runner assigned") || statusCode === 404) {
          const elapsed = Date.now() - startTime;
          console.log(`[Daytona SDK] Runner not ready yet, waiting... (${elapsed}ms elapsed)`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        } else {
          // Different error - might be a different issue, but try to continue
          console.log("[Daytona SDK] Got different error when creating session:", errorMessage);
          // If it's a session already exists error, that's fine - runner is ready
          if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
            runnerReady = true;
            console.log("[Daytona SDK] Session already exists, runner is ready");
            break;
          }
          // For other errors, wait a bit and retry once more
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      }
    }

    if (!runnerReady) {
      throw new Error("Workspace runner did not become ready within timeout period (60s)");
    }

    // Execute the execution script in the workspace
    // The script is located at /app/execution.sh and will handle the entire task execution
    // We execute it asynchronously in a session so it doesn't block the API call
    // The script will run in the background and send webhooks as it progresses
    // Note: sessionId is already created above during the wait loop
    console.log("[Daytona SDK] Executing task script in workspace...");
    
    try {

      // Set environment variables in the session
      // Note: envVars are already set at workspace creation, but we ensure they're available in the session
      // Also add WORKSPACE_ID which is only available after workspace creation
      const sessionEnvVars = {
        ...envVars,
        WORKSPACE_ID: sandbox.id,
      };
      
      const envExports = Object.entries(sessionEnvVars)
        .map(([key, value]) => `export ${key}="${value}"`)
        .join(" && ");

      if (envExports) {
        await sandbox.process.executeSessionCommand(sessionId, {
          command: envExports,
        });
      }

      // Execute the script asynchronously (non-blocking)
      // The script will run in the background and send webhooks to update the task status
      const asyncCmd = await sandbox.process.executeSessionCommand(sessionId, {
        command: "cd /app && /app/execution.sh",
        runAsync: true, // Execute asynchronously so it doesn't block
      });

      console.log("[Daytona SDK] Execution script started asynchronously:", {
        sessionId,
        commandId: asyncCmd.cmdId,
        status: "running",
      });

      // Don't wait for the script to complete - it will send webhooks as it progresses
      // The script will handle its own completion and send a webhook when done
    } catch (execError: unknown) {
      // Script execution failed - this is a critical error
      // We need to throw so the task can be marked as failed
      const error = execError instanceof Error ? execError : { message: String(execError), name: 'UnknownError', stack: undefined }
      console.error("[Daytona SDK] Error executing script:", {
        error: error.message,
        name: error.name,
        stack: error.stack,
      });
      // Throw the error so the task execution route can handle it properly
      throw new Error(`Failed to execute task script in workspace: ${error.message}`);
    }

    return {
      workspaceId: sandbox.id,
      status: "running" as const, // Workspace is running and script is executing
    };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : { message: String(error), name: 'UnknownError', stack: undefined }
    console.error("[Daytona SDK] Error creating workspace:", {
      error: err.message,
      name: err.name,
      stack: err.stack,
    });

    throw new Error(`Failed to create workspace via SDK: ${err.message}`);
  }
}

/**
 * Check if SDK is available (has required env vars)
 */
export function isSDKAvailable(): boolean {
  return !!process.env.DAYTONA_API_KEY;
}

