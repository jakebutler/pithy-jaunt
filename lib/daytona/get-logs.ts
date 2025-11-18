/**
 * Get execution logs from a Daytona workspace
 * 
 * This function connects to a Daytona workspace and retrieves the logs
 * from the execution session.
 */

import { Daytona } from "@daytonaio/sdk";

export interface GetWorkspaceLogsParams {
  workspaceId: string;
  taskId: string;
  maxLines?: number;
}

export interface WorkspaceLogEntry {
  timestamp: string;
  level: "info" | "error" | "warning";
  message: string;
}

/**
 * Get logs from a Daytona workspace
 */
export async function getWorkspaceLogs(
  params: GetWorkspaceLogsParams
): Promise<{
  logs: WorkspaceLogEntry[];
  sessionId: string;
  error?: string;
}> {
  const { workspaceId, taskId, maxLines = 1000 } = params;

  try {
    // Initialize SDK
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
      target: process.env.DAYTONA_TARGET || "us",
    });

    // Get the workspace (sandbox)
    const sandbox = await daytona.get(workspaceId);
    
    if (!sandbox) {
      return {
        logs: [],
        sessionId: "",
        error: `Workspace ${workspaceId} not found`,
      };
    }

    const sessionId = `task-${taskId}`;

    // Try to get command output from the session
    // The execution script runs in a session and outputs to stdout/stderr
    // We'll try multiple approaches to get the logs
    
    try {
      // Approach 1: Check if there's a log file created by the execution script
      // The execution script might write logs to a file
      const logFileCheck = `if [ -f /tmp/pj-execution.log ]; then tail -n ${maxLines} /tmp/pj-execution.log; elif [ -f /app/execution.log ]; then tail -n ${maxLines} /app/execution.log; else echo "No log file found"; fi`;
      
      try {
        const logFileResult = await sandbox.process.executeSessionCommand(sessionId, {
          command: logFileCheck,
        });

        if (logFileResult.stdout && !logFileResult.stdout.includes("No log file found")) {
          const logLines = logFileResult.stdout.split('\n').filter(line => line.trim());
          const logs: WorkspaceLogEntry[] = logLines.map(line => {
            const errorMatch = line.match(/\[pj\]\s*(Error|ERROR|error)/i);
            const warningMatch = line.match(/\[pj\]\s*(Warning|WARNING|warning)/i);
            const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);

            return {
              timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
              level: errorMatch ? "error" : warningMatch ? "warning" : "info",
              message: line,
            };
          });

          return {
            logs,
            sessionId,
          };
        }
      } catch {
        // Log file doesn't exist or couldn't read it, continue to next approach
      }

      // Approach 2: Check running processes and their output
      // Try to see what's currently running
      const processCheck = `ps aux | grep -E "execution.sh|agent-runner|python3.*agent" | grep -v grep | head -5 || echo "No execution processes found"`;
      
      try {
        const processResult = await sandbox.process.executeSessionCommand(sessionId, {
          command: processCheck,
        });

        const processes = processResult.stdout?.split('\n').filter(p => p.trim()) || [];
        
        // If we found processes, try to get more info about what they're doing
        if (processes.length > 0 && !processes[0].includes("No execution processes found")) {
          // Try to check the working directory and see if there are any output files
          const workDirCheck = `cd /tmp/pj/${taskId}/repo 2>/dev/null && pwd && ls -la 2>/dev/null | head -20 || echo "Working directory not found"`;
          
          try {
            const workDirResult = await sandbox.process.executeSessionCommand(sessionId, {
              command: workDirCheck,
            });

            return {
              logs: [
                {
                  timestamp: new Date().toISOString(),
                  level: "info",
                  message: `Execution processes running:\n${processes.join('\n')}\n\nWorking directory:\n${workDirResult.stdout || 'N/A'}`,
                },
              ],
              sessionId,
            };
          } catch {
            // Couldn't check working directory
          }

          return {
            logs: [
              {
                timestamp: new Date().toISOString(),
                level: "info",
                message: `Execution processes running:\n${processes.join('\n')}`,
              },
            ],
            sessionId,
            error: "Process is running but logs are not directly accessible. Check webhook updates for progress.",
          };
        }
      } catch {
        // Couldn't check processes
      }

      // Approach 3: Session exists but we can't get detailed logs
      // Return a status message
      return {
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: "info",
            message: "Session exists but logs are not directly accessible. The execution script is running in the background and sending progress updates via webhooks.",
          },
        ],
        sessionId,
        error: "Logs are not directly accessible. Progress updates are sent via webhooks to /api/webhook/daytona",
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Session might not exist - the script may have completed
      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        return {
          logs: [],
          sessionId,
          error: "Session not found. The execution may have completed or failed to start.",
        };
      }
      
      return {
        logs: [],
        sessionId,
        error: `Failed to get logs: ${errorMessage}`,
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      logs: [],
      sessionId: "",
      error: `Failed to connect to workspace: ${errorMessage}`,
    };
  }
}

/**
 * Get the current status of a workspace execution
 */
export async function getWorkspaceExecutionStatus(
  workspaceId: string,
  taskId: string
): Promise<{
  isRunning: boolean;
  sessionExists: boolean;
  processes: string[];
  error?: string;
}> {
  try {
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
      target: process.env.DAYTONA_TARGET || "us",
    });

    const sandbox = await daytona.get(workspaceId);
    
    if (!sandbox) {
      return {
        isRunning: false,
        sessionExists: false,
        processes: [],
        error: `Workspace ${workspaceId} not found`,
      };
    }

    const sessionId = `task-${taskId}`;

    // Check if session exists and get process status
    try {
      const psCommand = `ps aux | grep -E "execution.sh|agent-runner|python3.*agent-runner" | grep -v grep || echo ""`;
      const result = await sandbox.process.executeSessionCommand(sessionId, {
        command: psCommand,
      });

      const processes = result.stdout?.split('\n').filter(p => p.trim()) || [];
      const isRunning = processes.length > 0;

      return {
        isRunning,
        sessionExists: true,
        processes,
      };
    } catch (error: unknown) {
      // Session might not exist
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        return {
          isRunning: false,
          sessionExists: false,
          processes: [],
        };
      }
      
      return {
        isRunning: false,
        sessionExists: false,
        processes: [],
        error: errorMessage,
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      isRunning: false,
      sessionExists: false,
      processes: [],
      error: `Failed to check workspace: ${errorMessage}`,
    };
  }
}

