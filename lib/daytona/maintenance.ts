/**
 * Daytona Workspace Maintenance Utilities
 * 
 * Handles cleanup and reconciliation of Daytona workspaces
 */

import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  terminateWorkspace,
  listWorkspaces,
  isDaytonaConfigured,
} from "./client";

// Configuration from environment variables
const CLEANUP_ENABLED = process.env.WORKSPACE_CLEANUP_ENABLED !== "false";
const IDLE_TIMEOUT_MS = (parseInt(process.env.WORKSPACE_IDLE_TIMEOUT_MINUTES || "30") * 60 * 1000);
const COMPLETION_GRACE_PERIOD_MS = (parseInt(process.env.WORKSPACE_COMPLETION_GRACE_PERIOD_MINUTES || "5") * 60 * 1000);
const FAILED_GRACE_PERIOD_MS = (parseInt(process.env.WORKSPACE_FAILED_GRACE_PERIOD_MINUTES || "10") * 60 * 1000);
const ORPHANED_AGE_MS = 60 * 60 * 1000; // 1 hour

export interface CleanupResult {
  workspaceId: string;
  reason: string;
  success: boolean;
  error?: string;
}

export interface CleanupSummary {
  processed: number;
  terminated: number;
  errors: number;
  results: CleanupResult[];
}

/**
 * Find workspaces that are candidates for cleanup
 */
export async function findCleanupCandidates(): Promise<{
  completed: Array<{ workspaceId: Id<"workspaces">; daytonaId: string; taskId: Id<"tasks"> }>;
  failed: Array<{ workspaceId: Id<"workspaces">; daytonaId: string; taskId: Id<"tasks"> }>;
  idle: Array<Id<"workspaces">>;
  orphaned: Array<Id<"workspaces">>;
}> {
  if (!CLEANUP_ENABLED || !isDaytonaConfigured()) {
    return { completed: [], failed: [], idle: [], orphaned: [] };
  }

  const now = Date.now();
  const allWorkspaces = await convexClient.query(api.workspaces.getAllWorkspaces);
  
  const candidates = {
    completed: [] as Array<{ workspaceId: Id<"workspaces">; daytonaId: string; taskId: Id<"tasks"> }>,
    failed: [] as Array<{ workspaceId: Id<"workspaces">; daytonaId: string; taskId: Id<"tasks"> }>,
    idle: [] as Array<Id<"workspaces">>,
    orphaned: [] as Array<Id<"workspaces">>,
  };

  for (const workspace of allWorkspaces) {
    // Skip already terminated workspaces
    if (workspace.status === "terminated") {
      continue;
    }

    // Check for orphaned workspaces (no assigned tasks and old enough)
    const age = now - workspace.createdAt;
    if (workspace.assignedTasks.length === 0 && age >= ORPHANED_AGE_MS) {
      candidates.orphaned.push(workspace._id);
      continue;
    }

    // Check for idle workspaces
    const idleTime = now - workspace.lastUsedAt;
    if (idleTime >= IDLE_TIMEOUT_MS && (workspace.status === "running" || workspace.status === "stopped")) {
      candidates.idle.push(workspace._id);
    }

    // Check for workspaces with completed/failed tasks
    for (const taskId of workspace.assignedTasks) {
      const task = await convexClient.query(api.tasks.getTaskById, { taskId });
      if (!task) continue;

      const taskAge = now - task.updatedAt;
      
      if (task.status === "completed" && taskAge >= COMPLETION_GRACE_PERIOD_MS) {
        candidates.completed.push({
          workspaceId: workspace._id,
          daytonaId: workspace.daytonaId,
          taskId: task._id,
        });
      } else if (task.status === "failed" && taskAge >= FAILED_GRACE_PERIOD_MS) {
        candidates.failed.push({
          workspaceId: workspace._id,
          daytonaId: workspace.daytonaId,
          taskId: task._id,
        });
      }
    }
  }

  return candidates;
}

/**
 * Clean up a single workspace
 */
export async function cleanupWorkspace(
  workspaceId: Id<"workspaces">,
  daytonaId: string,
  reason: string
): Promise<CleanupResult> {
  try {
    // Check if workspace should be kept alive
    // Note: We'll need to check task keepWorkspaceAlive flag if available
    // For now, we'll proceed with cleanup

    // Terminate workspace in Daytona
    await terminateWorkspace(daytonaId);

    // Update workspace status in Convex
    await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
      workspaceId,
      status: "terminated",
    });

    console.log(`[Maintenance] Cleaned up workspace ${daytonaId}: ${reason}`);

    return {
      workspaceId: daytonaId,
      reason,
      success: true,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Maintenance] Failed to cleanup workspace ${daytonaId}:`, errorMessage);

    // If workspace is already terminated, update status in Convex
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      try {
        await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
          workspaceId,
          status: "terminated",
        });
        return {
          workspaceId: daytonaId,
          reason: `${reason} (already terminated)`,
          success: true,
        };
      } catch {
        // Ignore update errors
      }
    }

    return {
      workspaceId: daytonaId,
      reason,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Reconcile workspace states between Convex and Daytona
 */
export async function reconcileWorkspaceStates(): Promise<{
  reconciled: number;
  errors: number;
  details: Array<{ workspaceId: string; action: string; error?: string }>;
}> {
  if (!isDaytonaConfigured()) {
    return { reconciled: 0, errors: 0, details: [] };
  }

  const results = {
    reconciled: 0,
    errors: 0,
    details: [] as Array<{ workspaceId: string; action: string; error?: string }>,
  };

  try {
    // Get all workspaces from Convex
    const convexWorkspaces = await convexClient.query(api.workspaces.getAllWorkspaces);
    
    // Get all workspaces from Daytona
    const daytonaWorkspaces = await listWorkspaces();
    const daytonaMap = new Map(daytonaWorkspaces.map(ws => [ws.workspaceId, ws]));

    // Reconcile each workspace
    for (const workspace of convexWorkspaces) {
      const daytonaWorkspace = daytonaMap.get(workspace.daytonaId);
      
      if (!daytonaWorkspace) {
        // Workspace exists in Convex but not in Daytona - mark as terminated
        if (workspace.status !== "terminated") {
          try {
            await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
              workspaceId: workspace._id,
              status: "terminated",
            });
            results.reconciled++;
            results.details.push({
              workspaceId: workspace.daytonaId,
              action: "marked_terminated",
            });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            results.errors++;
            results.details.push({
              workspaceId: workspace.daytonaId,
              action: "mark_terminated_failed",
              error: errorMessage,
            });
          }
        }
      } else {
        // Workspace exists in both - sync status if different
        if (workspace.status !== daytonaWorkspace.status) {
          try {
            await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
              workspaceId: workspace._id,
              status: daytonaWorkspace.status,
            });
            results.reconciled++;
            results.details.push({
              workspaceId: workspace.daytonaId,
              action: `status_updated_${workspace.status}_to_${daytonaWorkspace.status}`,
            });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            results.errors++;
            results.details.push({
              workspaceId: workspace.daytonaId,
              action: "status_update_failed",
              error: errorMessage,
            });
          }
        }
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Maintenance] Reconciliation error:", error);
    results.errors++;
    results.details.push({
      workspaceId: "unknown",
      action: "reconciliation_failed",
      error: errorMessage,
    });
  }

  return results;
}

/**
 * Perform cleanup of all eligible workspaces
 */
export async function performCleanup(): Promise<CleanupSummary> {
  if (!CLEANUP_ENABLED || !isDaytonaConfigured()) {
    return {
      processed: 0,
      terminated: 0,
      errors: 0,
      results: [],
    };
  }

  const summary: CleanupSummary = {
    processed: 0,
    terminated: 0,
    errors: 0,
    results: [],
  };

  try {
    const candidates = await findCleanupCandidates();

    // Clean up completed task workspaces
    for (const candidate of candidates.completed) {
      summary.processed++;
      const result = await cleanupWorkspace(
        candidate.workspaceId,
        candidate.daytonaId,
        "task_completed"
      );
      summary.results.push(result);
      if (result.success) {
        summary.terminated++;
      } else {
        summary.errors++;
      }
    }

    // Clean up failed task workspaces
    for (const candidate of candidates.failed) {
      summary.processed++;
      const result = await cleanupWorkspace(
        candidate.workspaceId,
        candidate.daytonaId,
        "task_failed"
      );
      summary.results.push(result);
      if (result.success) {
        summary.terminated++;
      } else {
        summary.errors++;
      }
    }

    // Clean up idle workspaces
    for (const workspaceId of candidates.idle) {
      const workspace = await convexClient.query(api.workspaces.getWorkspaceById, {
        workspaceId,
      });
      if (workspace) {
        summary.processed++;
        const result = await cleanupWorkspace(
          workspaceId,
          workspace.daytonaId,
          "idle_timeout"
        );
        summary.results.push(result);
        if (result.success) {
          summary.terminated++;
        } else {
          summary.errors++;
        }
      }
    }

    // Clean up orphaned workspaces
    for (const workspaceId of candidates.orphaned) {
      const workspace = await convexClient.query(api.workspaces.getWorkspaceById, {
        workspaceId,
      });
      if (workspace) {
        summary.processed++;
        const result = await cleanupWorkspace(
          workspaceId,
          workspace.daytonaId,
          "orphaned"
        );
        summary.results.push(result);
        if (result.success) {
          summary.terminated++;
        } else {
          summary.errors++;
        }
      }
    }
  } catch (error: unknown) {
    console.error("[Maintenance] Cleanup error:", error);
    summary.errors++;
  }

  return summary;
}

