import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { createGitHubClient } from "@/lib/github/client";

/**
 * POST /api/webhook/daytona
 * Receive webhooks from Daytona workspace execution
 * 
 * This endpoint receives events from Daytona when:
 * - Workspace status changes
 * - Task execution completes
 * - PR is created
 * - Execution fails
 * 
 * TODO: Implement webhook signature verification if Daytona provides it
 */
export async function POST(request: Request) {
  try {
    // TODO: Verify webhook signature if Daytona provides it
    // const signature = request.headers.get("x-daytona-signature");
    // if (!verifySignature(signature, body)) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const body = await request.json();

    // Handle workspace status updates
    if (body.type === "workspace.status") {
      const { workspaceId, status } = body;

      // Find workspace by Daytona ID
      const workspace = await convexClient.query(
        api.workspaces.getWorkspaceByDaytonaId,
        { daytonaId: workspaceId }
      );

      if (workspace) {
        await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
          workspaceId: workspace._id,
          status: status as "creating" | "running" | "stopped" | "terminated",
        });
      }
    }

    // Handle task execution completion
    if (body.type === "task.completed") {
      const { workspaceId, taskId, branchName, prUrl, status } = body;

      // Find workspace
      const workspace = await convexClient.query(
        api.workspaces.getWorkspaceByDaytonaId,
        { daytonaId: workspaceId }
      );

      if (workspace && workspace.assignedTasks.includes(taskId as Id<"tasks">)) {
        // Update task with results
        await convexClient.mutation(api.tasks.updateTaskWorkspace, {
          taskId: taskId as Id<"tasks">,
          branchName,
          prUrl,
        });

        // Update task status
        await convexClient.mutation(api.tasks.updateTaskStatus, {
          taskId: taskId as Id<"tasks">,
          status: status === "success" ? "completed" : "failed",
        });
      }
    }

    // Handle PR creation
    if (body.type === "pr.created") {
      const { workspaceId, taskId, prUrl, branchName } = body;

      // Find workspace
      const workspace = await convexClient.query(
        api.workspaces.getWorkspaceByDaytonaId,
        { daytonaId: workspaceId }
      );

      if (workspace && workspace.assignedTasks.includes(taskId as Id<"tasks">)) {
        // Update task with PR URL
        await convexClient.mutation(api.tasks.updateTaskWorkspace, {
          taskId: taskId as Id<"tasks">,
          branchName,
          prUrl,
        });

        // Update task status to needs_review
        await convexClient.mutation(api.tasks.updateTaskStatus, {
          taskId: taskId as Id<"tasks">,
          status: "needs_review",
        });
      }
    }

    // Handle execution failure
    if (body.type === "task.failed") {
      const { workspaceId, taskId, error } = body;

      // Find workspace
      const workspace = await convexClient.query(
        api.workspaces.getWorkspaceByDaytonaId,
        { daytonaId: workspaceId }
      );

      if (workspace && workspace.assignedTasks.includes(taskId as Id<"tasks">)) {
        // Update task status to failed
        await convexClient.mutation(api.tasks.updateTaskStatus, {
          taskId: taskId as Id<"tasks">,
          status: "failed",
        });
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error: any) {
    console.error("Daytona webhook error:", error);
    // Return 200 to prevent Daytona from retrying
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 200 }
    );
  }
}

