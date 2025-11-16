import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/**
 * GET /api/workspace
 * List workspaces for the authenticated user
 * 
 * Query params:
 * - status: optional, filter by status
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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

    // Get all tasks for user to find associated workspaces
    const tasks = await convexClient.query(api.tasks.getTasksByUser, {
      userId: convexUser._id,
    });

    // Get unique workspace IDs from tasks
    const workspaceIds = new Set<string>();
    tasks.forEach((task) => {
      if (task.assignedWorkspaceId) {
        workspaceIds.add(task.assignedWorkspaceId);
      }
    });

    // Fetch workspaces by Daytona ID
    const workspaces = [];
    for (const daytonaId of workspaceIds) {
      const workspace = await convexClient.query(
        api.workspaces.getWorkspaceByDaytonaId,
        { daytonaId }
      );
      if (workspace) {
        workspaces.push(workspace);
      }
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Filter by status if provided
    let filteredWorkspaces = workspaces;
    if (status) {
      filteredWorkspaces = workspaces.filter((ws) => ws.status === status);
    }

    // Format response
    const formattedWorkspaces = filteredWorkspaces.map((ws) => ({
      workspaceId: ws._id,
      daytonaId: ws.daytonaId,
      template: ws.template,
      status: ws.status,
      assignedTasks: ws.assignedTasks,
      createdAt: ws.createdAt,
      lastUsedAt: ws.lastUsedAt,
    }));

    return NextResponse.json(
      { workspaces: formattedWorkspaces },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}

