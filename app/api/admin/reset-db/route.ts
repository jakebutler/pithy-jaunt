import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/**
 * DELETE /api/admin/reset-db
 * Reset database - delete ALL tasks and workspaces
 * WARNING: This is for development only and deletes ALL data
 */
export async function DELETE(request: Request) {
  // Simple safety check - only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not allowed in production" },
      { status: 403 }
    );
  }

  try {
    console.log("[ADMIN] Resetting database...");

    // Delete all tasks
    const taskResult = await convexClient.mutation(
      api.tasks.deleteAllTasks,
      {}
    );
    console.log(`[ADMIN] Deleted ${taskResult.deleted} tasks`);

    // Delete all workspaces
    const workspaceResult = await convexClient.mutation(
      api.workspaces.deleteAllWorkspaces,
      {}
    );
    console.log(`[ADMIN] Deleted ${workspaceResult.deleted} workspaces`);
    
    return NextResponse.json({
      success: true,
      tasksDeleted: taskResult.deleted,
      workspacesDeleted: workspaceResult.deleted,
    });
  } catch (error: any) {
    console.error("[ADMIN] Reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset database", details: error.message },
      { status: 500 }
    );
  }
}

