import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/supabase-server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { triggerGitIngestReport } from "@/lib/gitingest/client";

/**
 * GET /api/repo/[repoId]/gitingest-report
 * Fetch GitIngest report for a repository
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
      repoId: repoId as any,
    });

    if (!repo) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (repo.userId !== convexUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Return report data
    return NextResponse.json({
      status: repo.gitingestReportStatus,
      report: repo.gitingestReport || null,
      generatedAt: repo.gitingestReportGeneratedAt || null,
      error: repo.gitingestReportError || null,
    });
  } catch (error: any) {
    console.error("Error fetching GitIngest report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/repo/[repoId]/gitingest-report
 * Manually trigger GitIngest report generation
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
      repoId: repoId as any,
    });

    if (!repo) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (repo.userId !== convexUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if already processing
    if (repo.gitingestReportStatus === "processing") {
      return NextResponse.json(
        { error: "Report generation already in progress" },
        { status: 409 }
      );
    }

    // Trigger report generation
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const callbackUrl = `${appUrl}/api/repo/gitingest-callback`;

      // Update status to processing
      await convexClient.mutation(api.repos.updateGitIngestReport, {
        repoId: repo._id,
        status: "processing",
      });

      // Trigger GitIngest service
      await triggerGitIngestReport({
        repoUrl: repo.url,
        branch: repo.branch,
        callbackUrl,
      });

      return NextResponse.json({
        success: true,
        message: "Report generation started",
      });
    } catch (error: any) {
      // Update status to failed
      await convexClient.mutation(api.repos.updateGitIngestReport, {
        repoId: repo._id,
        status: "failed",
        error: error.message || "Failed to trigger report generation",
      });

      throw error;
    }
  } catch (error: any) {
    console.error("Error triggering GitIngest report:", error);
    return NextResponse.json(
      { error: "Failed to trigger report generation" },
      { status: 500 }
    );
  }
}


