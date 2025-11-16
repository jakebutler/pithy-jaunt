import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/**
 * GET /api/repo
 * List all repositories connected by the authenticated user
 */
export async function GET() {
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

    // Fetch user's repositories
    const repos = await convexClient.query(api.repos.getReposByUser, {
      userId: convexUser._id,
    });

    // Format response
    const formattedRepos = repos.map((repo) => ({
      id: repo._id,
      url: repo.url,
      owner: repo.owner,
      name: repo.name,
      branch: repo.branch,
      status: repo.analyzerStatus,
      coderabbitDetected: repo.coderabbitDetected,
      lastAnalyzedAt: repo.lastAnalyzedAt,
      createdAt: repo.createdAt,
    }));

    return NextResponse.json({ repos: formattedRepos }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching repositories:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}

