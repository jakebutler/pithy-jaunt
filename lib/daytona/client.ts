/**
 * Daytona API Client
 * 
 * Handles communication with Daytona API for workspace management
 * 
 * NOTE: The REST API may not support custom snapshots. If the API doesn't work,
 * this client will fall back to using the Daytona CLI (if available).
 * 
 * For production/serverless environments (like Vercel), consider:
 * - Using a separate service/worker with Daytona CLI installed
 * - Using a GitHub Action or CI/CD pipeline
 * - Contacting Daytona support about REST API snapshot support
 * 
 * Expected endpoints:
 * - POST /workspace (create workspace)
 * - GET /workspace/{id} (get workspace status)
 * - DELETE /workspace/{id} (terminate workspace)
 */

const DAYTONA_API_URL = process.env.DAYTONA_API_URL || "http://localhost:3001";
const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY;
const DAYTONA_SNAPSHOT_NAME = process.env.DAYTONA_SNAPSHOT_NAME || "pithy-jaunt-dev";
const USE_SDK = process.env.DAYTONA_USE_SDK !== "false"; // Default to true, can be disabled
const USE_CLI_FALLBACK = process.env.DAYTONA_USE_CLI_FALLBACK === "true";
const USE_GITHUB_ACTIONS = process.env.DAYTONA_USE_GITHUB_ACTIONS === "true";

/**
 * Create a Daytona workspace
 */
export async function createWorkspace(params: {
  repoUrl: string;
  branch: string;
  taskId: string;
  taskDescription: string;
  modelProvider: "openai" | "anthropic";
  model: string;
  keepWorkspaceAlive?: boolean;
}): Promise<{
  workspaceId: string;
  status: "creating" | "running";
}> {
  // Use TypeScript SDK by default (simplest and most reliable)
  if (USE_SDK) {
    console.log("[Daytona] Using TypeScript SDK to create workspace");
    const { createWorkspaceViaSDK, isSDKAvailable } = await import("./sdk-client");
    
    if (!isSDKAvailable()) {
      throw new Error("DAYTONA_API_KEY environment variable is required for SDK");
    }
    
    try {
      const result = await createWorkspaceViaSDK(params);
      console.log("[Daytona] SDK successfully created workspace:", result.workspaceId);
      return result;
    } catch (error: any) {
      console.error("[Daytona] SDK failed:", error.message);
      console.error("[Daytona] Error details:", {
        name: error.name,
        stack: error.stack,
      });
      // Don't fall through to REST API if SDK fails - throw the error instead
      // This prevents creating duplicate workspaces
      throw new Error(`SDK failed to create workspace: ${error.message}`);
    }
  }

  // If GitHub Actions is enabled, use it (bypasses REST API issues)
  if (USE_GITHUB_ACTIONS) {
    console.log("[Daytona] Using GitHub Actions to create workspace");
    const { createWorkspaceViaGitHubActions, isGitHubActionsAvailable } = await import("./github-actions-client");
    
    if (!isGitHubActionsAvailable()) {
      throw new Error(
        "GitHub Actions is enabled but required environment variables are missing. " +
        "Need: GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME"
      );
    }
    
    return await createWorkspaceViaGitHubActions(params);
  }

  if (!DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY environment variable is required");
  }

  // Use snapshot name from environment variable (defaults to "pithy-jaunt-dev")
  // This must match the snapshot name created in Daytona dashboard/CLI
  const requestBody = {
    snapshot: DAYTONA_SNAPSHOT_NAME,
    repoUrl: params.repoUrl,
    branch: params.branch,
    env: {
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
    },
  };

  console.log("[Daytona] Creating workspace:", {
    url: `${DAYTONA_API_URL}/workspace`,
    hasApiKey: !!DAYTONA_API_KEY,
    apiKeyLength: DAYTONA_API_KEY?.length || 0,
    apiKeyPrefix: DAYTONA_API_KEY?.substring(0, 10) || "none",
    snapshotName: DAYTONA_SNAPSHOT_NAME,
    requestBody: JSON.stringify(requestBody, null, 2),
  });

  let response: Response;
  try {
    response = await fetch(`${DAYTONA_API_URL}/workspace`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAYTONA_API_KEY}`,
        "User-Agent": "PithyJaunt/1.0",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (fetchError: any) {
    // Handle network errors, DNS errors, connection refused, etc.
    console.error("[Daytona] Fetch error:", {
      message: fetchError.message,
      name: fetchError.name,
      code: fetchError.code,
      cause: fetchError.cause,
      url: `${DAYTONA_API_URL}/workspace`,
      apiUrl: DAYTONA_API_URL,
    });

    // Provide helpful error messages based on error type
    let errorMessage = "Failed to connect to Daytona API";
    if (fetchError.message?.includes("ECONNREFUSED")) {
      errorMessage = `Connection refused. Check if DAYTONA_API_URL is correct: ${DAYTONA_API_URL}`;
    } else if (fetchError.message?.includes("ENOTFOUND") || fetchError.message?.includes("getaddrinfo")) {
      errorMessage = `DNS lookup failed. Check if DAYTONA_API_URL is correct: ${DAYTONA_API_URL}`;
    } else if (fetchError.message?.includes("timeout")) {
      errorMessage = `Request timeout. The Daytona API may be slow or unreachable: ${DAYTONA_API_URL}`;
    } else if (fetchError.message?.includes("certificate") || fetchError.message?.includes("SSL")) {
      errorMessage = `SSL/TLS error. Check if the Daytona API URL uses HTTPS correctly: ${DAYTONA_API_URL}`;
    } else {
      errorMessage = `Network error: ${fetchError.message || "Unknown error"}. Check DAYTONA_API_URL: ${DAYTONA_API_URL}`;
    }

    throw new Error(errorMessage);
  }

  if (!response.ok) {
    const errorText = await response.text();
    const contentType = response.headers.get("content-type");
    
    // Parse HTML error responses (like CloudFront errors)
    let errorMessage = errorText;
    if (contentType?.includes("text/html")) {
      // Extract meaningful error from HTML
      const titleMatch = errorText.match(/<TITLE>(.*?)<\/TITLE>/i);
      const h2Match = errorText.match(/<H2>(.*?)<\/H2>/i);
      
      if (titleMatch) {
        errorMessage = titleMatch[1];
      }
      if (h2Match) {
        errorMessage += `: ${h2Match[1]}`;
      }
      
      // Check for CloudFront specific errors
      if (errorText.includes("CloudFront")) {
        errorMessage = "Daytona API is blocked by CloudFront. This usually means:\n" +
          "1. The API URL is incorrect or points to a CloudFront distribution\n" +
          "2. The API key is missing or invalid\n" +
          "3. CloudFront is blocking the request (IP, headers, etc.)\n" +
          `\nStatus: ${response.status} ${response.statusText}`;
      }
    }
    
    // Try to parse as JSON for more detailed error
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message || errorJson.error) {
        errorMessage = errorJson.message || errorJson.error;
      }
      // Check for snapshot-related errors
      if (errorJson.message?.toLowerCase().includes("snapshot") || 
          errorJson.error?.toLowerCase().includes("snapshot")) {
        console.error("[Daytona] Snapshot error detected:", errorJson);
      }
    } catch {
      // Not JSON, use text as-is
    }
    
    console.error("[Daytona] API error:", {
      status: response.status,
      statusText: response.statusText,
      contentType,
      errorMessage,
      url: `${DAYTONA_API_URL}/workspace`,
      requestBody: JSON.stringify(requestBody, null, 2),
    });
    
    throw new Error(
      `Daytona API error: ${response.status} ${response.statusText} - ${errorMessage}`
    );
  }

  const data = await response.json();
  
  // Log the actual snapshot/image used by Daytona
  const actualSnapshot = data.snapshot || data.image || "unknown";
  const expectedSnapshot = DAYTONA_SNAPSHOT_NAME;
  
  console.log("[Daytona] Workspace created successfully:", {
    workspaceId: data.workspaceId || data.id,
    status: data.status || "creating",
    expectedSnapshot,
    actualSnapshot,
    snapshotMatch: actualSnapshot === expectedSnapshot,
    fullResponse: JSON.stringify(data, null, 2),
  });
  
  // Warn if wrong snapshot is being used
  if (actualSnapshot !== expectedSnapshot) {
    console.warn("[Daytona] ⚠️ WARNING: Workspace is using wrong snapshot!");
    console.warn(`[Daytona] Expected: ${expectedSnapshot}`);
    console.warn(`[Daytona] Actual: ${actualSnapshot}`);
    console.warn("[Daytona] This means the execution script won't run!");
    
    // If CLI fallback is enabled and snapshot doesn't match, try CLI
    if (USE_CLI_FALLBACK) {
      console.log("[Daytona] Attempting CLI fallback due to wrong snapshot...");
      try {
        const { createWorkspaceViaCLI, isCLIAvailable } = await import("./cli-client");
        if (await isCLIAvailable()) {
          console.log("[Daytona] CLI available, retrying with CLI...");
          // Clean up the incorrectly created workspace
          try {
            await terminateWorkspace(data.workspaceId || data.id);
          } catch {
            // Ignore cleanup errors
          }
          return await createWorkspaceViaCLI(params);
        } else {
          console.warn("[Daytona] CLI not available, cannot use fallback");
        }
      } catch (cliError: any) {
        console.error("[Daytona] CLI fallback failed:", cliError.message);
        // Continue with the REST API result (even though it's wrong)
      }
    }
  }
  
  return {
    workspaceId: data.workspaceId || data.id,
    status: data.status || "creating",
  };
}

/**
 * Get workspace status
 */
export async function getWorkspaceStatus(workspaceId: string): Promise<{
  workspaceId: string;
  status: "creating" | "running" | "stopped" | "terminated";
}> {
  if (!DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY environment variable is required");
  }

  const response = await fetch(`${DAYTONA_API_URL}/workspace/${workspaceId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${DAYTONA_API_KEY}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return {
        workspaceId,
        status: "terminated",
      };
    }
    const errorText = await response.text();
    throw new Error(
      `Daytona API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  
  // Map Daytona status to our status format
  // Daytona uses: "started", "stopped", "terminated"
  // We use: "running", "stopped", "terminated", "creating"
  let mappedStatus: "creating" | "running" | "stopped" | "terminated" = "running";
  const daytonaStatus = data.status || data.state || "unknown";
  
  if (daytonaStatus === "started" || daytonaStatus === "Started") {
    mappedStatus = "running";
  } else if (daytonaStatus === "stopped" || daytonaStatus === "Stopped") {
    mappedStatus = "stopped";
  } else if (daytonaStatus === "terminated" || daytonaStatus === "Terminated") {
    mappedStatus = "terminated";
  } else if (daytonaStatus === "creating" || daytonaStatus === "Creating") {
    mappedStatus = "creating";
  }
  
  console.log("[Daytona] Workspace status retrieved:", {
    workspaceId: data.workspaceId || data.id || workspaceId,
    daytonaStatus,
    mappedStatus,
    snapshot: data.snapshot || data.image,
  });
  
  return {
    workspaceId: data.workspaceId || data.id || workspaceId,
    status: mappedStatus,
  };
}

/**
 * Terminate a workspace
 */
export async function terminateWorkspace(workspaceId: string): Promise<void> {
  if (!DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY environment variable is required");
  }

  const response = await fetch(`${DAYTONA_API_URL}/workspace/${workspaceId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${DAYTONA_API_KEY}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    // 404 is acceptable (workspace already terminated)
    const errorText = await response.text();
    throw new Error(
      `Daytona API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }
}

/**
 * Check if Daytona is configured
 */
export function isDaytonaConfigured(): boolean {
  return !!DAYTONA_API_KEY && !!DAYTONA_API_URL;
}

