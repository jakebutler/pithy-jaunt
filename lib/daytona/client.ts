/**
 * Daytona API Client
 * 
 * Handles communication with Daytona API for workspace management
 * 
 * TODO: Implement based on Daytona API documentation
 * Expected endpoints:
 * - POST /workspace (create workspace)
 * - GET /workspace/{id} (get workspace status)
 * - DELETE /workspace/{id} (terminate workspace)
 */

const DAYTONA_API_URL = process.env.DAYTONA_API_URL || "http://localhost:3001";
const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY;

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
  if (!DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY environment variable is required");
  }

  console.log("[Daytona] Creating workspace:", {
    url: `${DAYTONA_API_URL}/workspace`,
    hasApiKey: !!DAYTONA_API_KEY,
    apiKeyLength: DAYTONA_API_KEY?.length || 0,
    apiKeyPrefix: DAYTONA_API_KEY?.substring(0, 10) || "none",
    snapshot: "butlerjake/pithy-jaunt-daytona:v1.0.0",
    template: "pithy-jaunt-dev",
    repoUrl: params.repoUrl,
    branch: params.branch,
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
      body: JSON.stringify({
        // Daytona requires snapshots to be created in the dashboard first
        // Try snapshot name first (matches image name)
        snapshot: "butlerjake/pithy-jaunt-daytona:v1.0.0",
        // Also try template name as fallback
        template: "pithy-jaunt-dev",
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
          WEBHOOK_URL: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhook/daytona`,
          KEEP_ALIVE: params.keepWorkspaceAlive ? "true" : "false",
        },
      }),
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
    
    console.error("[Daytona] API error:", {
      status: response.status,
      statusText: response.statusText,
      contentType,
      errorMessage,
      url: `${DAYTONA_API_URL}/workspace`,
    });
    
    throw new Error(
      `Daytona API error: ${response.status} ${response.statusText} - ${errorMessage}`
    );
  }

  const data = await response.json();
  
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
  
  return {
    workspaceId: data.workspaceId || data.id || workspaceId,
    status: data.status || "running",
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

