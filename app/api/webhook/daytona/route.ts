import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

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

    console.log("[Daytona Webhook] Received webhook:", {
      type: body.type,
      taskId: body.taskId,
      workspaceId: body.workspaceId,
    });

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

      console.log("[Daytona Webhook] Task completed:", {
        taskId,
        workspaceId,
        prUrl,
        status,
      });

      // Get task directly (workspace might not exist yet)
      const task = await convexClient.query(api.tasks.getTaskById, {
        taskId: taskId as Id<"tasks">,
      });

      if (!task) {
        console.warn("[Daytona Webhook] Task not found:", taskId);
        return NextResponse.json(
          { error: "Task not found" },
          { status: 404 }
        );
      }

      // Update task with results
      await convexClient.mutation(api.tasks.updateTaskWorkspace, {
        taskId: task._id,
        branchName: branchName || undefined,
        prUrl: prUrl || undefined,
      });

      // Update task status
      await convexClient.mutation(api.tasks.updateTaskStatus, {
        taskId: task._id,
        status: status === "success" ? "completed" : "failed",
      });

      // Update workspace if it exists
      try {
        const workspace = await convexClient.query(
          api.workspaces.getWorkspaceByDaytonaId,
          { daytonaId: workspaceId || task.assignedWorkspaceId || "" }
        );

        if (workspace) {
          await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
            workspaceId: workspace._id,
            status: "stopped",
          });
        }
      } catch (error) {
        // Workspace might not exist, that's okay
        console.log("[Daytona Webhook] Workspace not found (non-critical):", error);
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
      const { workspaceId, taskId, error, status } = body;

      console.log("[Daytona Webhook] Task failed:", {
        taskId,
        workspaceId,
        error,
      });

      // Get task directly
      const task = await convexClient.query(api.tasks.getTaskById, {
        taskId: taskId as Id<"tasks">,
      });

      if (!task) {
        console.warn("[Daytona Webhook] Task not found:", taskId);
        return NextResponse.json(
          { error: "Task not found" },
          { status: 404 }
        );
      }

      // Determine if it's a patch failure (needs_review) or other failure
      const errorMessage = error || "";
      const isPatchFailure =
        errorMessage.includes("patch") ||
        errorMessage.includes("apply") ||
        errorMessage.includes("conflict");

      // Update task status
      await convexClient.mutation(api.tasks.updateTaskStatus, {
        taskId: task._id,
        status: isPatchFailure ? "needs_review" : "failed",
      });

      // Store error in execution logs if available
      try {
        await convexClient.mutation(api.executionLogs.createLog, {
          taskId: task._id,
          workspaceId: workspaceId || task.assignedWorkspaceId || "",
          logs: `Error: ${errorMessage}`,
          status: "failed",
          error: errorMessage,
        });
      } catch (logError) {
        console.warn("[Daytona Webhook] Failed to store error logs:", logError);
      }

      // Update workspace status if it exists
      try {
        const workspace = await convexClient.query(
          api.workspaces.getWorkspaceByDaytonaId,
          { daytonaId: workspaceId || task.assignedWorkspaceId || "" }
        );

        if (workspace) {
          await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
            workspaceId: workspace._id,
            status: "stopped",
          });
        }
      } catch (error) {
        console.log("[Daytona Webhook] Workspace not found (non-critical):", error);
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

