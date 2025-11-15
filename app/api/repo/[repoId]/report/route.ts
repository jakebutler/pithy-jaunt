import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * GET /api/repo/[repoId]/report
 * Get the latest CodeRabbit analysis report for a repository
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ repoId: string }> }
) {
  try {
    const { repoId } = await params;
    
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
        { error: "Forbidden: You don't have access to this repository" },
        { status: 403 }
      );
    }

    // TODO: Fetch actual CodeRabbit analysis report from Convex
    // For now, return repository status and metadata
    // Analysis report will be stored when webhook receives results

    return NextResponse.json(
      {
        repoId: repo._id,
        status: repo.analyzerStatus,
        coderabbitDetected: repo.coderabbitDetected,
        lastAnalyzedAt: repo.lastAnalyzedAt,
        // TODO: Add analysis report data when webhook is implemented
        report: null,
        tasks: [],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching repository report:", error);
    return NextResponse.json(
      { error: "Failed to fetch repository report" },
      { status: 500 }
    );
  }
}

