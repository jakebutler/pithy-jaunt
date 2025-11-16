/**
 * Daytona TypeScript SDK Client
 * 
 * Uses the official Daytona TypeScript SDK to create and manage workspaces.
 * This is simpler and more reliable than using the REST API or CLI.
 * 
 * Documentation: https://www.daytona.io/docs/en/typescript-sdk/
 */

import { Daytona, Image } from "@daytonaio/sdk";

const DAYTONA_SNAPSHOT_NAME = process.env.DAYTONA_SNAPSHOT_NAME || "pithy-jaunt-dev";
// The snapshot name might be the Docker image name, or we might need to use the image directly
// If snapshot name is "pithy-jaunt-dev", the actual Docker image is likely "butlerjake/pithy-jaunt-daytona:v1.0.0"
const DAYTONA_IMAGE_NAME = process.env.DAYTONA_IMAGE_NAME || "butlerjake/pithy-jaunt-daytona:v1.0.0";

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
    // Create sandbox using the custom image
    // Use Image.base() to specify our Docker image
    const image = Image.base(DAYTONA_IMAGE_NAME);
    
    const sandbox = await daytona.create({
      image,
      repo: {
        url: params.repoUrl,
        branch: params.branch,
      },
      envVars,
    });

    console.log("[Daytona SDK] Workspace created successfully:", {
      workspaceId: sandbox.id,
      status: sandbox.status,
    });

    return {
      workspaceId: sandbox.id,
      status: sandbox.status === "running" ? "running" : "creating",
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

