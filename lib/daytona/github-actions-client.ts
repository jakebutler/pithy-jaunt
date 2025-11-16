/**
 * Daytona GitHub Actions Client
 * 
 * Creates Daytona workspaces by dispatching a GitHub Actions workflow.
 * This approach uses the Daytona CLI which properly supports custom snapshots.
 * 
 * Latency breakdown:
 * - Workflow dispatch: 1-5 seconds
 * - Runner startup: 10-30 seconds (cold), 1-5 seconds (warm)
 * - Daytona CLI install: 5-10 seconds (if not cached)
 * - Workspace creation: 30-60 seconds
 * - Total: ~45-105 seconds (cold), ~35-80 seconds (warm)
 */

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER || "jakebutler";
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || "pithy-jaunt";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DAYTONA_SNAPSHOT_NAME = process.env.DAYTONA_SNAPSHOT_NAME || "butlerjake/pithy-jaunt-daytona:v1.0.2";

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
 * Create a Daytona workspace by dispatching a GitHub Actions workflow
 */
export async function createWorkspaceViaGitHubActions(
  params: CreateWorkspaceParams
): Promise<{
  workspaceId: string;
  status: "creating" | "running";
}> {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN environment variable is required for GitHub Actions dispatch");
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/api/webhook/daytona`;

  const workflowInputs = {
    task_id: params.taskId,
    repo_url: params.repoUrl,
    branch: params.branch,
    task_description: params.taskDescription,
    model_provider: params.modelProvider,
    model: params.model,
    snapshot_name: DAYTONA_SNAPSHOT_NAME,
    webhook_url: webhookUrl,
    keep_alive: params.keepWorkspaceAlive ? "true" : "false",
  };

  console.log("[Daytona GitHub Actions] Dispatching workflow:", {
    owner: GITHUB_REPO_OWNER,
    repo: GITHUB_REPO_NAME,
    workflow: "create-daytona-workspace.yml",
    inputs: workflowInputs,
  });

  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/create-daytona-workspace.yml/dispatches`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "PithyJaunt/1.0",
        },
        body: JSON.stringify({
          ref: "main", // Branch where the workflow file exists
          inputs: workflowInputs,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // Not JSON, use text as-is
      }

      console.error("[Daytona GitHub Actions] Failed to dispatch workflow:", {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
      });

      throw new Error(errorMessage);
    }

    console.log("[Daytona GitHub Actions] Workflow dispatched successfully");

    // GitHub Actions doesn't return the workspace ID immediately
    // The workflow will send a webhook when the workspace is created
    // For now, we return a placeholder ID that will be updated via webhook
    // The webhook handler should update the workspace ID when it receives the notification
    
    return {
      workspaceId: `github-actions-${params.taskId}`, // Placeholder, will be updated via webhook
      status: "creating" as const,
    };
  } catch (error: any) {
    console.error("[Daytona GitHub Actions] Error dispatching workflow:", {
      error: error.message,
      name: error.name,
    });

    throw new Error(`Failed to dispatch GitHub Actions workflow: ${error.message}`);
  }
}

/**
 * Check if GitHub Actions is available (has required env vars)
 */
export function isGitHubActionsAvailable(): boolean {
  return !!GITHUB_TOKEN && !!GITHUB_REPO_OWNER && !!GITHUB_REPO_NAME;
}

