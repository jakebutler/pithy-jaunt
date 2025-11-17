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
const DAYTONA_SNAPSHOT_NAME = process.env.DAYTONA_SNAPSHOT_NAME || "butlerjake/pithy-jaunt-daytona:v1.0.2";
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
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  console.log(`[Daytona:${requestId}] Starting workspace creation`, {
    taskId: params.taskId,
    repoUrl: params.repoUrl,
    branch: params.branch,
    modelProvider: params.modelProvider,
    model: params.model,
    timestamp: new Date().toISOString()
  });

  // Use TypeScript SDK by default (simplest and most reliable)
  if (USE_SDK) {
    console.log(`[Daytona:${requestId}] Using TypeScript SDK to create workspace`);
    const { createWorkspaceViaSDK, isSDKAvailable } = await import("./sdk-client");
    
    if (!isSDKAvailable()) {
      const error = new Error("DAYTONA_API_KEY environment variable is required for SDK");
      console.error(`[Daytona:${requestId}] SDK configuration error`, {
        error: error.message,
        errorCode: "SDK_CONFIG_ERROR",
        taskId: params.taskId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
    
    try {
      const result = await createWorkspaceViaSDK(params);
      const executionTime = Date.now() - startTime;
      console.log(`[Daytona:${requestId}] SDK successfully created workspace`, {
        workspaceId: result.workspaceId,
        executionTimeMs: executionTime,
        taskId: params.taskId
      });
      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`[Daytona:${requestId}] SDK workspace creation failed`, {
        error: error.message,
        errorCode: "SDK_CREATION_FAILED",
        errorName: error.name,
        errorStack: error.stack,
        taskId: params.taskId,
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      });
      
      // Don't fall through to REST API if SDK fails - throw the error instead
      // This prevents creating duplicate workspaces
      const enhancedError = new Error(`SDK failed to create workspace: ${error.message}`);
      enhancedError.code = "SDK_CREATION_FAILED";
      throw enhancedError;
    }
  }

  // If GitHub Actions is enabled, use it (bypasses REST API issues)
  if (USE_GITHUB_ACTIONS) {
    console.log(`[Daytona:${requestId}] Using GitHub Actions to create workspace`);
    const { createWorkspaceViaGitHubActions, isGitHubActionsAvailable } = await import("./github-actions-client");
    
    if (!isGitHubActionsAvailable()) {
      const error = new Error(
        "GitHub Actions is enabled but required environment variables are missing. " +
        "Need: GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME"
      );
      console.error(`[Daytona:${requestId}] GitHub Actions configuration error`, {
        error: error.message,
        errorCode: "GITHUB_ACTIONS_CONFIG_ERROR",
        taskId: params.taskId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
    
    try {
      const result = await createWorkspaceViaGitHubActions(params);
      const executionTime = Date.now() - startTime;
      console.log(`[Daytona:${requestId}] GitHub Actions successfully created workspace`, {
        workspaceId: result.workspaceId,
        executionTimeMs: executionTime,
        taskId: params.taskId
      });
      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`[Daytona:${requestId}] GitHub Actions workspace creation failed`, {
        error: error.message,
        errorCode: "GITHUB_ACTIONS_CREATION_FAILED",
        taskId: params.taskId,
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  if (!DAYTONA_API_KEY) {
    const error = new Error("DAYTONA_API_KEY environment variable is required");
    console.error(`[Daytona:${requestId}] API configuration error`, {
      error: error.message,
      errorCode: "API_CONFIG_ERROR",
      taskId: params.taskId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
  // TypeScript doesn't narrow after throw, so we assert the type
  const apiKeyString: string = DAYTONA_API_KEY;

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

  console.log(`[Daytona:${requestId}] Creating workspace via REST API`, {
    url: `${DAYTONA_API_URL}/workspace`,
    hasApiKey: !!DAYTONA_API_KEY,
    apiKeyLength: DAYTONA_API_KEY?.length || 0,
    apiKeyPrefix: DAYTONA_API_KEY?.substring(0, 10) || "none",
    snapshotName: DAYTONA_SNAPSHOT_NAME,
    requestBody: JSON.stringify(requestBody, null, 2),
    taskId: params.taskId
  });

  let response: Response;
  try {
    response = await fetch(`${DAYTONA_API_URL}/workspace`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKeyString}`,
        "User-Agent": "PithyJaunt/1.0",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (fetchError: any) {
    const executionTime = Date.now() - startTime;
    // Handle network errors, DNS errors, connection refused, etc.
    console.error(`[Daytona:${requestId}] Fetch error during workspace creation`, {
      error: fetchError.message,
      errorName: fetchError.name,
      errorCode: fetchError.code,
      errorCause: fetchError.cause,
      url: `${DAYTONA_API_URL}/workspace`,
      apiUrl: DAYTONA_API_URL,
      taskId: params.taskId,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });

    // Provide helpful error messages based on error type
    let errorMessage = "Failed to connect to Daytona API";
    let errorCode = "CONNECTION_ERROR";
    
    if (fetchError.message?.includes("ECONNREFUSED")) {
      errorMessage = `Connection refused. Check if DAYTONA_API_URL is correct: ${DAYTONA_API_URL}`;
      errorCode = "CONNECTION_REFUSED";
    } else if (fetchError.message?.includes("ENOTFOUND") || fetchError.message?.includes("getaddrinfo")) {
      errorMessage = `DNS lookup failed. Check if DAYTONA_API_URL is correct: ${DAYTONA_API_URL}`;
      errorCode = "DNS_ERROR";
    } else if (fetchError.message?.includes("timeout")) {
      errorMessage = `Request timeout. The Daytona API may be slow or unreachable: ${DAYTONA_API_URL}`;
      errorCode = "TIMEOUT_ERROR";
    } else if (fetchError.message?.includes("certificate") || fetchError.message?.includes("SSL")) {
      errorMessage = `SSL/TLS error. Check if the Daytona API URL uses HTTPS correctly: ${DAYTONA_API_URL}`;
      errorCode = "SSL_ERROR";
    } else {
      errorMessage = `Network error: ${fetchError.message || "Unknown error"}. Check DAYTONA_API_URL: ${DAYTONA_API_URL}`;
      errorCode = "NETWORK_ERROR";
    }

    const enhancedError = new Error(errorMessage);
    enhancedError.code = errorCode;
    throw enhancedError;
  }

  if (!response.ok) {
    const executionTime = Date.now() - startTime;
    const errorText = await response.text();
    const contentType = response.headers.get("content-type");
    
    // Parse HTML error responses (like CloudFront errors)
    let errorMessage = errorText;
    let errorCode = "API_ERROR";
    
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
        errorCode = "CLOUDFRONT_ERROR";
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
        console.error(`[Daytona:${requestId}] Snapshot
