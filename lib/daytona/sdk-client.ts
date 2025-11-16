/**
 * Daytona TypeScript SDK Client
 * 
 * Uses the official Daytona TypeScript SDK to create and manage workspaces.
 * This is simpler and more reliable than using the REST API or CLI.
 * 
 * Documentation: https://www.daytona.io/docs/en/typescript-sdk/
 */

import { Daytona, Image } from "@daytonaio/sdk";

const DAYTONA_SNAPSHOT_NAME = process.env.DAYTONA_SNAPSHOT_NAME || "butlerjake/pithy-jaunt-daytona:v1.0.2";
// The snapshot name is the same as the Docker image name
const DAYTONA_IMAGE_NAME = process.env.DAYTONA_IMAGE_NAME || "butlerjake/pithy-jaunt-daytona:v1.0.2";

interface CreateWorkspaceParams {
  repoUrl: string;
  branch: string;
  taskId: string;
  taskDescription: string;
  modelProvider: "openai" | "anthropic";
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
    image: DAYTONA_IMAGE_NAME,
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
    // Use snapshot approach - CreateSandboxFromSnapshotParams
    // The snapshot name should be the name registered in Daytona (e.g., "pithy-jaunt-dev")
    console.log("[Daytona SDK] Creating workspace with snapshot:", DAYTONA_SNAPSHOT_NAME);
    
    // First, try to verify the snapshot exists (optional check)
    try {
      const snapshotList = await daytona.snapshot.list();
      const snapshotExists = snapshotList.items.some((s: any) => s.name === DAYTONA_SNAPSHOT_NAME);
      console.log("[Daytona SDK] Snapshot check:", {
        snapshotName: DAYTONA_SNAPSHOT_NAME,
        exists: snapshotExists,
        availableSnapshots: snapshotList.items.map((s: any) => s.name),
      });
      
      if (!snapshotExists) {
        console.warn(`[Daytona SDK] ⚠️ Snapshot "${DAYTONA_SNAPSHOT_NAME}" not found!`);
        console.warn(`[Daytona SDK] Available snapshots:`, snapshotList.items.map((s: any) => s.name));
        console.warn(`[Daytona SDK] Will attempt to create anyway - SDK may use default if snapshot doesn't exist`);
      }
    } catch (snapshotCheckError: any) {
      console.warn("[Daytona SDK] Could not verify snapshot existence:", snapshotCheckError.message);
      // Continue anyway - the create call will fail if snapshot doesn't exist
    }
    
    const sandbox = await daytona.create({
      snapshot: DAYTONA_SNAPSHOT_NAME,
      envVars,
    });

    console.log("[Daytona SDK] Workspace created successfully:", {
      workspaceId: sandbox.id,
      snapshotUsed: DAYTONA_SNAPSHOT_NAME,
    });

    // Execute the execution script in the workspace
    // The script is located at /app/execution.sh and will handle the entire task execution
    // We execute it asynchronously in a session so it doesn't block the API call
    // The script will run in the background and send webhooks as it progresses
    console.log("[Daytona SDK] Executing task script in workspace...");
    
    try {
      // Create a persistent session for this task execution
      const sessionId = `task-${params.taskId}`;
      await sandbox.process.createSession(sessionId);

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
    } catch (execError: any) {
      // Log the error but don't fail the workspace creation
      // The script might still work, or webhooks will report failures
      console.error("[Daytona SDK] Error executing script:", {
        error: execError.message,
        name: execError.name,
        stack: execError.stack,
      });
      // Continue - the workspace is created, even if script execution failed
      // Webhooks will report the actual status
    }

    return {
      workspaceId: sandbox.id,
      status: "running" as const, // Workspace is running and script is executing
    };
  } catch (error: any) {
    console.error("[Daytona SDK] Error creating workspace:", {
      error: error.message,
      name: error.name,
      stack: error.stack,
    });

    throw new Error(`Failed to create workspace via SDK: ${error.message}`);
  }
}

/**
 * Check if SDK is available (has required env vars)
 */
export function isSDKAvailable(): boolean {
  return !!process.env.DAYTONA_API_KEY;
}

