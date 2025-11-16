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
  { params }: { params: Promise<{ taskId: string }> }
) {
  const startTime = Date.now();
  console.log("[TASK EXECUTE] Starting task execution request");
  
  try {
    const { taskId } = await params;
    console.log("[TASK EXECUTE] Task ID:", taskId);
    
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[TASK EXECUTE] No user found:", authError?.message);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[TASK EXECUTE] User authenticated:", user.id);

    // Get user from Convex
    const convexUser = await convexClient.query(
      api.users.getUserBySupabaseId,
      { supabaseUserId: user.id }
    );

    if (!convexUser) {
      console.log("[TASK EXECUTE] User not found in Convex");
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    console.log("[TASK EXECUTE] Convex user found:", convexUser._id);

    // Get task
    const task = await convexClient.query(api.tasks.getTaskById, {
      taskId: taskId as Id<"tasks">,
    });

    if (!task) {
      console.log("[TASK EXECUTE] Task not found:", taskId);
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    console.log("[TASK EXECUTE] Task found:", {
      taskId: task._id,
      status: task.status,
      userId: task.userId,
      repoId: task.repoId,
      hasModelPreference: !!task.modelPreference,
    });

    // Verify user owns the task
    if (task.userId !== convexUser._id) {
      console.log("[TASK EXECUTE] User doesn't own task:", {
        taskUserId: task.userId,
        currentUserId: convexUser._id,
      });
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this task" },
        { status: 403 }
      );
    }

    // Check if task is in a valid state for execution
    if (task.status !== "queued" && task.status !== "needs_review") {
      console.log("[TASK EXECUTE] Invalid task status:", task.status);
      return NextResponse.json(
        {
          error: `Task cannot be executed. Current status: ${task.status}`,
        },
        { status: 400 }
      );
    }

    // Parse request body (optional)
    let keepWorkspaceAlive = false;
    try {
      const contentType = request.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const body = await request.json();
        keepWorkspaceAlive = body.keepWorkspaceAlive || false;
      }
    } catch (error) {
      // Empty body or invalid JSON is fine, use defaults
      console.log("[TASK EXECUTE] Could not parse request body:", error);
    }

    // Get repository info
    const repo = await convexClient.query(api.repos.getRepoById, {
      repoId: task.repoId,
    });

    console.log("[TASK EXECUTE] Repository query result:", {
      repoFound: !!repo,
      repoId: task.repoId,
    });

    if (!repo) {
      console.log("[TASK EXECUTE] Repository not found:", task.repoId);
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    console.log("[TASK EXECUTE] Repository found:", {
      repoId: repo._id,
      url: repo.url,
      branch: repo.branch,
      owner: repo.owner,
      name: repo.name,
    });

    // Validate repository has required fields
    if (!repo.url) {
      console.log("[TASK EXECUTE] Repository URL is missing");
      return NextResponse.json(
        { error: "Repository URL is missing" },
        { status: 400 }
      );
    }

    if (!repo.branch) {
      console.log("[TASK EXECUTE] Repository branch is missing");
      return NextResponse.json(
        { error: "Repository branch is missing" },
        { status: 400 }
      );
    }

    // Validate task has model preference
    console.log("[TASK EXECUTE] Model preference check:", {
      hasModelPreference: !!task.modelPreference,
      modelPreference: task.modelPreference,
    });

    if (!task.modelPreference || !task.modelPreference.provider || !task.modelPreference.model) {
      console.log("[TASK EXECUTE] Task model preference is missing or invalid");
      return NextResponse.json(
        { error: "Task model preference is missing or invalid" },
        { status: 400 }
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
        keepWorkspaceAlive: keepWorkspaceAlive,
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
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        taskId: task._id,
        repoUrl: repo.url,
        branch: repo.branch,
      });

      // Update task status to failed
      await convexClient.mutation(api.tasks.updateTaskStatus, {
        taskId: task._id,
        status: "failed",
      });

      return NextResponse.json(
        {
          error: "Failed to create workspace",
          details: error.message || "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Task execution error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        error: "Failed to execute task",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

