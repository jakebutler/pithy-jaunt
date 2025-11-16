import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { processGitIngestWithRetry } from "@/lib/gitingest/client";
import { Id } from "@/convex/_generated/dataModel";

/**
 * POST /api/repo/[repoId]/ingest
 * Manually trigger git ingest processing for a repository
 * 
 * This endpoint allows users to manually trigger or retry git ingest processing
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ repoId: string }> }
) {
  try {
    const { repoId } = await params;

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

    // Get repository
    const repo = await convexClient.query(api.repos.getRepoById, {
      repoId: repoId as Id<"repos">,
    });

    if (!repo) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    // Verify user owns the repository
    if (repo.userId !== convexUser._id) {
      return NextResponse.json(
        { error: "Unauthorized: You don't own this repository" },
        { status: 403 }
      );
    }

    // Trigger git ingest processing asynchronously
    processGitIngestAsync(repoId as Id<"repos">, repo.url).catch((error) => {
      console.error("Failed to process git ingest:", error);
    });

    return NextResponse.json(
      {
        message: "Git ingest processing started",
        repoId,
        status: "processing",
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("Git ingest trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger git ingest processing" },
      { status: 500 }
    );
  }
}

/**
 * Process git ingest asynchronously for a repository
 * Updates the repository record with git ingest content when complete
 */
async function processGitIngestAsync(
  repoId: Id<"repos">,
  repoUrl: string
): Promise<void> {
  try {
    // Update status to processing
    await convexClient.mutation(api.repos.updateGitIngest, {
      repoId,
      status: "processing",
    });

    // Process git ingest with retry
    // Note: useCloud parameter is kept for compatibility but not used
    const content = await processGitIngestWithRetry(repoUrl, true, 1);

    // Update repository with git ingest content
    await convexClient.mutation(api.repos.updateGitIngest, {
      repoId,
      status: "completed",
      content,
      generatedAt: Date.now(),
    });

    console.log(`Git ingest completed for repository ${repoId}`);
  } catch (error: any) {
    console.error(`Git ingest failed for repository ${repoId}:`, error);

    // Update status to failed
    await convexClient.mutation(api.repos.updateGitIngest, {
      repoId,
      status: "failed",
    });
  }
}

