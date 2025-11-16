import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/**
 * DELETE /api/debug/delete-all-tasks
 * Delete all tasks and workspaces for the current user
 * WARNING: This is destructive and cannot be undone
 */
export async function DELETE(request: Request) {
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

    // Delete all tasks for user
    const taskResult = await convexClient.mutation(
      api.tasks.deleteAllTasksForUser,
      { userId: convexUser._id }
    );

    // Delete all workspaces
    const workspaceResult = await convexClient.mutation(
      api.workspaces.deleteAllWorkspaces,
      {}
    );

    return NextResponse.json({
      success: true,
      tasksDeleted: taskResult.deleted,
      workspacesDeleted: workspaceResult.deleted,
    });
  } catch (error: any) {
    console.error("Delete all tasks error:", error);
    return NextResponse.json(
      { error: "Failed to delete tasks", details: error.message },
      { status: 500 }
    );
  }
}

