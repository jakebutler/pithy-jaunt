/**
 * Daytona CLI Client
 * 
 * Alternative implementation using Daytona CLI when REST API doesn't support snapshots.
 * 
 * NOTE: This requires the Daytona CLI to be installed and authenticated.
 * For Vercel/serverless environments, consider using a separate service or worker.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const DAYTONA_SNAPSHOT_NAME = process.env.DAYTONA_SNAPSHOT_NAME || "butlerjake/pithy-jaunt-daytona:v1.0.2";

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
 * Create a Daytona workspace using CLI
 * 
 * This uses the `daytona sandbox create` command with the --snapshot flag.
 * The CLI properly supports custom snapshots, unlike the REST API.
 */
export async function createWorkspaceViaCLI(
  params: CreateWorkspaceParams
): Promise<{
  workspaceId: string;
  status: "creating" | "running";
}> {
  // Build environment variables for the workspace
  const envVars = [
    `TARGET_REPO=${params.repoUrl}`,
    `BRANCH_NAME=pj/${params.taskId}`,
    `TASK_ID=${params.taskId}`,
    `AGENT_PROMPT=${escapeShellArg(params.taskDescription)}`,
    `OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ""}`,
    `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ""}`,
    `GITHUB_TOKEN=${process.env.GITHUB_TOKEN || ""}`,
    `MODEL_PROVIDER=${params.modelProvider}`,
    `MODEL=${params.model}`,
    `WEBHOOK_URL=${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/api/webhook/daytona`,
    `KEEP_ALIVE=${params.keepWorkspaceAlive ? "true" : "false"}`,
  ];

  // Build the CLI command
  // Format: daytona sandbox create --snapshot <name> --repo <url> --branch <branch> --env KEY=VAL ...
  const envFlags = envVars.map((env) => `--env "${env}"`).join(" ");
  
  const command = `daytona sandbox create \
    --snapshot "${DAYTONA_SNAPSHOT_NAME}" \
    --repo "${params.repoUrl}" \
    --branch "${params.branch}" \
    ${envFlags} \
    --output json`;

  console.log("[Daytona CLI] Creating workspace:", {
    snapshot: DAYTONA_SNAPSHOT_NAME,
    repoUrl: params.repoUrl,
    branch: params.branch,
    command: command.replace(/\s+/g, " "), // Clean up whitespace for logging
  });

  try {
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 60000, // 60 second timeout
    });

    if (stderr && !stderr.includes("Warning")) {
      console.warn("[Daytona CLI] stderr:", stderr);
    }

    // Parse JSON output
    let data: { id?: string; workspaceId?: string; sandboxId?: string };
    try {
      data = JSON.parse(stdout) as { id?: string; workspaceId?: string; sandboxId?: string };
    } catch {
      // If JSON parsing fails, try to extract workspace ID from text output
      const idMatch = stdout.match(/workspace[_-]?id[:\s]+([a-f0-9-]+)/i) ||
                     stdout.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      
      if (idMatch) {
        data = { id: idMatch[1], workspaceId: idMatch[1] };
      } else {
        throw new Error(`Failed to parse CLI output: ${stdout}`);
      }
    }

    const workspaceId = data.id || data.workspaceId || data.sandboxId;
    
    if (!workspaceId) {
      throw new Error(`No workspace ID found in CLI output: ${stdout}`);
    }

    console.log("[Daytona CLI] Workspace created successfully:", {
      workspaceId,
      snapshot: DAYTONA_SNAPSHOT_NAME,
      output: stdout.substring(0, 500), // Log first 500 chars
    });

    return {
      workspaceId,
      status: "creating" as const,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; signal?: string; stdout?: string; stderr?: string }
    console.error("[Daytona CLI] Error creating workspace:", {
      error: err.message,
      code: err.code,
      signal: err.signal,
      stdout: err.stdout?.substring(0, 500),
      stderr: err.stderr?.substring(0, 500),
    });

    // Provide helpful error messages
    if (err.code === "ENOENT") {
      throw new Error(
        "Daytona CLI not found. Please install it: https://www.daytona.io/docs/getting-started/installation"
      );
    }

    if (err.message?.includes("not authenticated") || err.message?.includes("authentication")) {
      throw new Error(
        "Daytona CLI not authenticated. Please run: daytona auth login"
      );
    }

    throw new Error(`Failed to create workspace via CLI: ${err.message || "Unknown error"}`);
  }
}

/**
 * Get workspace status using CLI
 */
export async function getWorkspaceStatusViaCLI(
  workspaceId: string
): Promise<{
  workspaceId: string;
  status: "creating" | "running" | "stopped" | "terminated";
}> {
  const command = `daytona sandbox describe ${workspaceId} --output json`;

  try {
    const { stdout } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });

    const data = JSON.parse(stdout);
    const daytonaStatus = data.status || data.state || "unknown";

    // Map Daytona status to our status format
    let mappedStatus: "creating" | "running" | "stopped" | "terminated" = "running";
    if (daytonaStatus === "started" || daytonaStatus === "Started") {
      mappedStatus = "running";
    } else if (daytonaStatus === "stopped" || daytonaStatus === "Stopped") {
      mappedStatus = "stopped";
    } else if (daytonaStatus === "terminated" || daytonaStatus === "Terminated") {
      mappedStatus = "terminated";
    } else if (daytonaStatus === "creating" || daytonaStatus === "Creating") {
      mappedStatus = "creating";
    }

    return {
      workspaceId: data.id || data.workspaceId || workspaceId,
      status: mappedStatus,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: number }
    if (err.message?.includes("not found") || err.code === 1) {
      return {
        workspaceId,
        status: "terminated",
      };
    }
    throw error;
  }
}

/**
 * Terminate workspace using CLI
 */
export async function terminateWorkspaceViaCLI(workspaceId: string): Promise<void> {
  const command = `daytona sandbox stop ${workspaceId}`;

  try {
    await execAsync(command, {
      timeout: 30000,
    });
    console.log("[Daytona CLI] Workspace terminated:", workspaceId);
  } catch (error: unknown) {
    // Ignore errors if workspace already terminated
    const err = error as { message?: string }
    if (err.message && !err.message.includes("not found")) {
      throw error;
    }
  }
}

/**
 * Escape shell argument to prevent injection
 */
function escapeShellArg(arg: string): string {
  // Replace single quotes with '\'' and wrap in single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Check if Daytona CLI is available
 */
export async function isCLIAvailable(): Promise<boolean> {
  try {
    await execAsync("daytona --version", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

