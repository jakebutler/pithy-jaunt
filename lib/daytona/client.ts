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
}): Promise<{
  workspaceId: string;
  status: "creating" | "running";
}> {
  if (!DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY environment variable is required");
  }

  const response = await fetch(`${DAYTONA_API_URL}/workspace`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAYTONA_API_KEY}`,
    },
    body: JSON.stringify({
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
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Daytona API error: ${response.status} ${response.statusText} - ${errorText}`
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

