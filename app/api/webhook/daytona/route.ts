import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cleanupWorkspace } from "@/lib/daytona/maintenance";

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
  const startTime = Date.now();
  
  try {
    // TODO: Verify webhook signature if Daytona provides it
    // const signature = request.headers.get("x-daytona-signature");
    // if (!verifySignature(signature, body)) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    // Read raw body first to see what we're actually receiving
    const rawBody = await request.text();
    console.log("[Daytona Webhook] ========== RAW WEBHOOK BODY ==========");
    console.log(rawBody);
    console.log("[Daytona Webhook] Body length:", rawBody.length);
    console.log("[Daytona Webhook] ======================================");
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("[Daytona Webhook] Failed to parse JSON:", parseError);
      console.error("[Daytona Webhook] Raw body:", rawBody);
      return NextResponse.json(
        { error: "Invalid JSON in webhook body" },
        { status: 400 }
      );
    }

    console.log("[Daytona Webhook] Received webhook:", {
      type: body.type,
      taskId: body.taskId,
      workspaceId: body.workspaceId,
      error: body.error,
      message: body.message,
      status: body.status,
      timestamp: new Date().toISOString(),
      hasMessage: !!body.message,
      messageLength: body.message ? body.message.length : 0,
      fullBody: JSON.stringify(body, null, 2),
    });
    
    // Log full body separately for better visibility in logs
    console.log("[Daytona Webhook] ========== FULL WEBHOOK PAYLOAD ==========");
    console.log(JSON.stringify(body, null, 2));
    console.log("[Daytona Webhook] ==========================================");

    // Handle workspace creation (from GitHub Actions)
    if (body.type === "workspace.created") {
      const { workspaceId, taskId, status, source } = body;

      console.log("[Daytona Webhook] Workspace created:", {
        taskId,
        workspaceId,
        source,
      });

      // Get task to update workspace ID
      const task = await convexClient.query(api.tasks.getTaskById, {
        taskId: taskId as Id<"tasks">,
      });

      if (task) {
        // Update task with actual workspace ID (replacing placeholder)
        await convexClient.mutation(api.tasks.updateTaskWorkspace, {
          taskId: task._id,
          assignedWorkspaceId: workspaceId,
        });

        // Create or update workspace record
        try {
          const existingWorkspace = await convexClient.query(
            api.workspaces.getWorkspaceByDaytonaId,
            { daytonaId: workspaceId }
          );

          if (!existingWorkspace) {
            // Create new workspace record
            await convexClient.mutation(api.workspaces.createWorkspace, {
              daytonaId: workspaceId,
              template: process.env.DAYTONA_SNAPSHOT_NAME || "butlerjake/pithy-jaunt-daytona:v1.0.2",
              assignedTasks: [task._id],
            });
          } else {
            // Update existing workspace
            await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
              workspaceId: existingWorkspace._id,
              status: (status || "creating") as "creating" | "running" | "stopped" | "terminated",
            });
          }
        } catch (workspaceError) {
          console.warn("[Daytona Webhook] Failed to create/update workspace:", workspaceError);
        }
      }
    }

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

    // Handle task progress updates
    if (body.type === "task.progress") {
      const { workspaceId, taskId, error } = body;
      const message = error || body.message || "Task in progress";

      console.log("[Daytona Webhook] Task progress:", {
        taskId,
        workspaceId,
        message,
      });

      // Get task
      const task = await convexClient.query(api.tasks.getTaskById, {
        taskId: taskId as Id<"tasks">,
      });

      if (task) {
        // Store progress log
        try {
          await convexClient.mutation(api.executionLogs.createLog, {
            taskId: task._id,
            workspaceId: workspaceId || task.assignedWorkspaceId || "",
            logs: message,
            status: "running",
          });
        } catch (logError) {
          console.warn("[Daytona Webhook] Failed to store progress log:", logError);
        }
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

      // Store execution log for completion
      try {
        const logMessage = status === "success" 
          ? `Task completed successfully. PR: ${prUrl || "N/A"}`
          : `Task completed with status: ${status}`;
        
        await convexClient.mutation(api.executionLogs.createLog, {
          taskId: task._id,
          workspaceId: workspaceId || task.assignedWorkspaceId || "",
          logs: logMessage,
          status: status === "success" ? "completed" : "failed",
        });
      } catch (logError) {
        console.warn("[Daytona Webhook] Failed to store completion log:", logError);
      }

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

          // Schedule cleanup after grace period
          // Note: Since we can't easily schedule delayed execution, we check if grace period
          // has elapsed. If not, the scheduled cleanup job will handle it.
          // For immediate cleanup, we check if enough time has passed since task completion.
          const taskAge = Date.now() - task.updatedAt;
          const gracePeriodMs = status === "success" 
            ? parseInt(process.env.WORKSPACE_COMPLETION_GRACE_PERIOD_MINUTES || "5") * 60 * 1000
            : parseInt(process.env.WORKSPACE_FAILED_GRACE_PERIOD_MINUTES || "10") * 60 * 1000;

          if (taskAge >= gracePeriodMs) {
            // Grace period has elapsed, clean up immediately
            console.log("[Daytona Webhook] Grace period elapsed, cleaning up workspace immediately");
            cleanupWorkspace(
              workspace._id,
              workspace.daytonaId,
              status === "success" ? "task_completed" : "task_failed"
            ).catch((error) => {
              console.error("[Daytona Webhook] Failed to cleanup workspace:", error);
              // Non-critical - scheduled job will retry
            });
          } else {
            console.log("[Daytona Webhook] Grace period not elapsed, scheduled cleanup will handle it");
          }
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
      const { workspaceId, taskId, error, status, message } = body;
      // Use message field as details if provided
      const details = message || "";

      console.log("[Daytona Webhook] Task failed:", {
        taskId,
        workspaceId,
        error,
        message,
        details,
        hasMessage: !!message,
        messageLength: message ? message.length : 0,
        messagePreview: message ? message.substring(0, 500) : "NO MESSAGE FIELD",
      });
      
      // Log full error details for debugging
      if (message) {
        console.log("[Daytona Webhook] ========== FULL ERROR MESSAGE ==========");
        console.log(message);
        console.log("[Daytona Webhook] ========================================");
      } else {
        console.warn("[Daytona Webhook] ⚠️ WARNING: No 'message' field in webhook payload!");
        console.warn("[Daytona Webhook] This suggests the old Docker image is being used.");
        console.warn("[Daytona Webhook] Please verify DAYTONA_SNAPSHOT_NAME is set to the latest image.");
      }

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

      // Combine error information
      const errorMessage = error || message || "Unknown error";
      const fullErrorDetails = details 
        ? `${errorMessage}\n\nDetails:\n${details}`
        : errorMessage;

      // Determine if it's a patch failure (needs_review) or other failure
      const isPatchFailure =
        errorMessage.toLowerCase().includes("patch") ||
        errorMessage.toLowerCase().includes("apply") ||
        errorMessage.toLowerCase().includes("conflict") ||
        errorMessage.toLowerCase().includes("context") ||
        errorMessage.toLowerCase().includes("does not exist") ||
        errorMessage.toLowerCase().includes("malformed") ||
        (details && (
          details.toLowerCase().includes("patch") ||
          details.toLowerCase().includes("apply") ||
          details.toLowerCase().includes("git apply")
        ));

      // Determine error category for better debugging
      let errorCategory = "unknown";
      if (isPatchFailure) {
        if (errorMessage.toLowerCase().includes("context") || errorMessage.toLowerCase().includes("does not match")) {
          errorCategory = "patch_context_mismatch";
        } else if (errorMessage.toLowerCase().includes("does not exist")) {
          errorCategory = "patch_file_not_found";
        } else if (errorMessage.toLowerCase().includes("malformed")) {
          errorCategory = "patch_format_error";
        } else {
          errorCategory = "patch_apply_failed";
        }
      } else if (errorMessage.toLowerCase().includes("timeout")) {
        errorCategory = "timeout";
      } else if (errorMessage.toLowerCase().includes("agent") || errorMessage.toLowerCase().includes("llm")) {
        errorCategory = "agent_error";
      }

      console.log("[Daytona Webhook] Error analysis:", {
        isPatchFailure,
        errorCategory,
        errorMessage: errorMessage.substring(0, 200), // Log first 200 chars
      });

      // Update task status
      await convexClient.mutation(api.tasks.updateTaskStatus, {
        taskId: task._id,
        status: isPatchFailure ? "needs_review" : "failed",
      });

      // Store error in execution logs with detailed information
      try {
        const logMessage = `[${errorCategory}] ${fullErrorDetails}`;
        await convexClient.mutation(api.executionLogs.createLog, {
          taskId: task._id,
          workspaceId: workspaceId || task.assignedWorkspaceId || "",
          logs: logMessage,
          status: "failed",
          error: fullErrorDetails.length > 10000 
            ? fullErrorDetails.substring(0, 10000) + "\n... (truncated)"
            : fullErrorDetails,
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

          // Schedule cleanup after grace period (same logic as task.completed)
          const taskAge = Date.now() - task.updatedAt;
          const gracePeriodMs = parseInt(process.env.WORKSPACE_FAILED_GRACE_PERIOD_MINUTES || "10") * 60 * 1000;

          if (taskAge >= gracePeriodMs) {
            console.log("[Daytona Webhook] Grace period elapsed, cleaning up failed workspace immediately");
            cleanupWorkspace(
              workspace._id,
              workspace.daytonaId,
              "task_failed"
            ).catch((error) => {
              console.error("[Daytona Webhook] Failed to cleanup workspace:", error);
            });
          }
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

