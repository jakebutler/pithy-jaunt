import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { createGitHubClient } from "@/lib/github/client";

/**
 * POST /api/task/[taskId]/approve
 * Approve a completed task and optionally merge the PR
 * 
 * Request body:
 * {
 *   "mergeMethod": "merge" // optional, "merge", "squash", or "rebase"
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    
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
      taskId: taskId as Id<"tasks">,
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

    // Check if task is completed
    if (task.status !== "completed") {
      return NextResponse.json(
        {
          error: `Task cannot be approved. Current status: ${task.status}`,
        },
        { status: 400 }
      );
    }

    if (!task.prUrl) {
      return NextResponse.json(
        { error: "No PR URL found for this task" },
        { status: 400 }
      );
    }

    // Parse request body
    const { mergeMethod = "merge" } = await request.json();

    // Extract PR number from URL
    // PR URL format: https://github.com/owner/repo/pull/123
    const prMatch = task.prUrl.match(/\/pull\/(\d+)/);
    if (!prMatch) {
      return NextResponse.json(
        { error: "Invalid PR URL format" },
        { status: 400 }
      );
    }

    const prNumber = parseInt(prMatch[1]);

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

    // Merge PR using GitHub API
    try {
      const octokit = createGitHubClient();
      await octokit.pulls.merge({
        owner: repo.owner,
        repo: repo.name,
        pull_number: prNumber,
        merge_method: mergeMethod as "merge" | "squash" | "rebase",
      });

      return NextResponse.json(
        {
          taskId: task._id,
          merged: true,
          prUrl: task.prUrl,
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error("PR merge error:", error);
      
      // Handle specific GitHub API errors
      if (error.status === 405) {
        return NextResponse.json(
          { error: "PR cannot be merged (may have conflicts or checks failing)" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to merge PR" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Task approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve task" },
      { status: 500 }
    );
  }
}

