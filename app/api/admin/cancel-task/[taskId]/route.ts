import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * POST /api/admin/cancel-task/[taskId]
 * Cancel a task without authentication (dev only)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not allowed in production" },
      { status: 403 }
    );
  }

  try {
    const { taskId } = await params;

    // Update task status to cancelled
    await convexClient.mutation(api.tasks.updateTaskStatus, {
      taskId: taskId as Id<"tasks">,
      status: "cancelled",
    });

    return NextResponse.json({
      success: true,
      taskId,
      status: "cancelled",
    });
  } catch (error: any) {
    console.error("Admin cancel error:", error);
    return NextResponse.json(
      { error: "Failed to cancel task", details: error.message },
      { status: 500 }
    );
  }
}

