import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * GET /api/debug/task/[taskId]
 * Debug endpoint to get full task and workspace details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    // Get task
    const task = await convexClient.query(api.tasks.getTaskById, {
      taskId: taskId as Id<"tasks">,
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Get workspace if assigned
    let workspace = null;
    if (task.assignedWorkspaceId) {
      workspace = await convexClient.query(
        api.workspaces.getWorkspaceByDaytonaId,
        { daytonaId: task.assignedWorkspaceId }
      );
    }

    // Get repository
    const repo = await convexClient.query(api.repos.getRepoById, {
      repoId: task.repoId,
    });

    // Calculate time running
    const runningTime = Date.now() - task.updatedAt;
    const runningMinutes = Math.floor(runningTime / 60000);

    return NextResponse.json({
      task: {
        id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        initiator: task.initiator,
        assignedWorkspaceId: task.assignedWorkspaceId,
        branchName: task.branchName,
        prUrl: task.prUrl,
        modelPreference: task.modelPreference,
        createdAt: new Date(task.createdAt).toISOString(),
        updatedAt: new Date(task.updatedAt).toISOString(),
        runningTimeMinutes: runningMinutes,
      },
      workspace: workspace ? {
        id: workspace._id,
        daytonaId: workspace.daytonaId,
        status: workspace.status,
        template: workspace.template,
        assignedTasks: workspace.assignedTasks,
        createdAt: new Date(workspace.createdAt).toISOString(),
        lastUsedAt: new Date(workspace.lastUsedAt).toISOString(),
      } : null,
      repository: repo ? {
        id: repo._id,
        owner: repo.owner,
        name: repo.name,
        url: repo.url,
        branch: repo.branch,
      } : null,
      diagnosis: {
        hasWorkspaceId: !!task.assignedWorkspaceId,
        hasBranchName: !!task.branchName,
        hasPrUrl: !!task.prUrl,
        workspaceFound: !!workspace,
        isStuck: task.status === "running" && runningMinutes > 10,
        recommendations: getRecommendations(task, workspace, runningMinutes),
      }
    });
  } catch (error: any) {
    console.error("Debug task error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task details", details: error.message },
      { status: 500 }
    );
  }
}

function getRecommendations(task: any, workspace: any, runningMinutes: number): string[] {
  const recommendations: string[] = [];

  if (task.status === "running" && runningMinutes > 10) {
    recommendations.push("Task has been running for over 10 minutes, which is unusual for simple tasks");
    
    if (!workspace) {
      recommendations.push("Workspace was not found in database despite having workspace ID assigned");
      recommendations.push("This suggests workspace creation failed silently");
    } else if (workspace.status === "creating") {
      recommendations.push("Workspace is still in 'creating' state - may be stuck provisioning");
    }
    
    if (!task.prUrl) {
      recommendations.push("No PR URL received - webhook may not have been delivered");
      recommendations.push("Check Daytona logs and webhook configuration");
    }
    
    recommendations.push("Consider canceling and checking: DAYTONA_API_URL, DAYTONA_API_KEY, WEBHOOK_URL");
  }

  return recommendations;
}

