import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getWorkspaceStatus } from "@/lib/daytona/client";

/**
 * GET /api/workspace/[workspaceId]
 * Get workspace details including status and metrics
 */
export async function GET(
  request: Request,
  { params }: { params: { workspaceId: string } }
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

    // Get workspace
    const workspace = await convexClient.query(api.workspaces.getWorkspaceById, {
      workspaceId: params.workspaceId as Id<"workspaces">,
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Verify user has access (through tasks)
    const userTasks = await convexClient.query(api.tasks.getTasksByUser, {
      userId: convexUser._id,
    });

    const hasAccess = workspace.assignedTasks.some((taskId) =>
      userTasks.some((task) => task._id === taskId)
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this workspace" },
        { status: 403 }
      );
    }

    // Get latest status from Daytona if configured
    let daytonaStatus = null;
    try {
      if (process.env.DAYTONA_API_KEY) {
        daytonaStatus = await getWorkspaceStatus(workspace.daytonaId);
      }
    } catch (error) {
      // If Daytona API fails, use cached status
      console.warn("Failed to fetch Daytona status:", error);
    }

    // Calculate uptime
    const uptime = Date.now() - workspace.createdAt;

    // Format response
    return NextResponse.json(
      {
        workspaceId: workspace._id,
        daytonaId: workspace.daytonaId,
        template: workspace.template,
        status: daytonaStatus?.status || workspace.status,
        assignedTasks: workspace.assignedTasks,
        createdAt: workspace.createdAt,
        lastUsedAt: workspace.lastUsedAt,
        uptimeMs: uptime,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching workspace:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspace" },
      { status: 500 }
    );
  }
}

