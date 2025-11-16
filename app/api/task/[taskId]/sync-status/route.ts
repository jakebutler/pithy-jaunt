import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getWorkspaceStatus } from "@/lib/daytona/client";

/**
 * POST /api/task/[taskId]/sync-status
 * Manually sync task status by checking Daytona workspace status
 * Useful for troubleshooting stuck tasks
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from Convex
    const convexUser = await convexClient.query(
      api.users.getUserBySupabaseId,
      { supabaseUserId: user.id }
    );

    if (!convexUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

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

    // Verify user owns the task
    if (task.userId !== convexUser._id) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this task" },
        { status: 403 }
      );
    }

    const updates: string[] = [];
    const errors: string[] = [];

    // Check workspace status if assigned
    if (task.assignedWorkspaceId) {
      try {
        const daytonaStatus = await getWorkspaceStatus(task.assignedWorkspaceId);
        
        // Update workspace status in Convex
        const workspace = await convexClient.query(
          api.workspaces.getWorkspaceByDaytonaId,
          { daytonaId: task.assignedWorkspaceId }
        );

        if (workspace) {
          await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
            workspaceId: workspace._id,
            status: daytonaStatus.status,
          });
          updates.push(`Workspace status updated to: ${daytonaStatus.status}`);
        }

        // If workspace is terminated/stopped and task is still running, mark as failed
        if (
          (daytonaStatus.status === "terminated" || daytonaStatus.status === "stopped") &&
          task.status === "running"
        ) {
          await convexClient.mutation(api.tasks.updateTaskStatus, {
            taskId: task._id,
            status: "failed",
          });
          updates.push("Task marked as failed (workspace terminated)");
        }
      } catch (error: any) {
        errors.push(`Failed to check workspace status: ${error.message}`);
      }
    } else {
      errors.push("No workspace assigned to task");
    }

    // Get updated task
    const updatedTask = await convexClient.query(api.tasks.getTaskById, {
      taskId: task._id,
    });

    return NextResponse.json(
      {
        taskId: task._id,
        status: updatedTask?.status || task.status,
        workspaceId: task.assignedWorkspaceId,
        updates,
        errors,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error syncing task status:", error);
    return NextResponse.json(
      { 
        error: "Failed to sync task status",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

