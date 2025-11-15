import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { createWorkspace, isDaytonaConfigured } from "@/lib/daytona/client";

/**
 * POST /api/task/[taskId]/execute
 * Execute a task: provision Daytona workspace, run agent, create PR
 * 
 * Request body:
 * {
 *   "keepWorkspaceAlive": false // optional
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from Convex
    const convexUser = await convexClient.query(
      api.users.getUserBySupabaseId,
      { supabaseUserId: session.user.id }
    );

    if (!convexUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Get task
    const task = await convexClient.query(api.tasks.getTaskById, {
      taskId: params.taskId as Id<"tasks">,
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

    // Check if task is in a valid state for execution
    if (task.status !== "queued" && task.status !== "needs_review") {
      return NextResponse.json(
        {
          error: `Task cannot be executed. Current status: ${task.status}`,
        },
        { status: 400 }
      );
    }

    // Parse request body
    const { keepWorkspaceAlive } = await request.json();

    // Get repository info
    const repo = await convexClient.query(api.repos.getRepoById, {
      repoId: task.repoId,
    });

    if (!repo) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    // Check if Daytona is configured
    if (!isDaytonaConfigured()) {
      return NextResponse.json(
        {
          error:
            "Daytona is not configured. Please set DAYTONA_API_URL and DAYTONA_API_KEY environment variables.",
        },
        { status: 503 }
      );
    }

    // Update task status to running
    await convexClient.mutation(api.tasks.updateTaskStatus, {
      taskId: task._id,
      status: "running",
    });

    try {
      // Create Daytona workspace
      const workspace = await createWorkspace({
        repoUrl: repo.url,
        branch: repo.branch,
        taskId: task._id,
        taskDescription: task.description,
        modelProvider: task.modelPreference.provider,
        model: task.modelPreference.model,
      });

      // Create workspace record in Convex
      const workspaceId = await convexClient.mutation(
        api.workspaces.createWorkspace,
        {
          daytonaId: workspace.workspaceId,
          template: "pithy-jaunt-dev",
          assignedTasks: [task._id],
        }
      );

      // Assign workspace to task
      await convexClient.mutation(api.workspaces.assignTaskToWorkspace, {
        workspaceId,
        taskId: task._id,
      });

      // Update task with workspace ID and branch name
      await convexClient.mutation(api.tasks.updateTaskWorkspace, {
        taskId: task._id,
        assignedWorkspaceId: workspace.workspaceId,
        branchName: `pj/${task._id}`,
      });

      return NextResponse.json(
        {
          taskId: task._id,
          status: "running",
          workspaceId: workspace.workspaceId,
        },
        { status: 202 }
      );
    } catch (error: any) {
      console.error("Workspace creation error:", error);

      // Update task status to failed
      await convexClient.mutation(api.tasks.updateTaskStatus, {
        taskId: task._id,
        status: "failed",
      });

      return NextResponse.json(
        {
          error: "Failed to create workspace",
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Task execution error:", error);
    return NextResponse.json(
      { error: "Failed to execute task" },
      { status: 500 }
    );
  }
}

