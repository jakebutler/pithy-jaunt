import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

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

    // TODO: Create Daytona workspace
    // This will be implemented when Daytona integration is ready
    // For now, we'll update the task status to "running"
    
    // Update task status to running
    await convexClient.mutation(api.tasks.updateTaskStatus, {
      taskId: task._id,
      status: "running",
    });

    // TODO: Create workspace in Convex
    // TODO: Trigger Daytona workspace creation
    // TODO: Start agent execution

    // Return success response
    return NextResponse.json(
      {
        taskId: task._id,
        status: "running",
        workspaceId: null, // TODO: Return actual workspace ID
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("Task execution error:", error);
    return NextResponse.json(
      { error: "Failed to execute task" },
      { status: 500 }
    );
  }
}

