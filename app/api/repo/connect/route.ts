import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { validateRepository } from "@/lib/github/validation";
import { fetchRepositoryMetadata } from "@/lib/github/metadata";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { triggerGitIngestReport } from "@/lib/gitingest/client";
import { Id } from "@/convex/_generated/dataModel";

/**
 * POST /api/repo/connect
 * Connect a GitHub repository to the user's account
 * 
 * Request body:
 * {
 *   "repoUrl": "https://github.com/owner/repo",
 *   "branch": "main" // optional, defaults to repo's default branch
 * }
 */
export async function POST(request: Request) {
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

    // Parse request body
    const { repoUrl, branch } = await request.json();

    if (!repoUrl) {
      return NextResponse.json(
        { error: "Repository URL is required" },
        { status: 400 }
      );
    }

    // Validate repository with retry logic for rate limits
    let validation;
    try {
      validation = await validateRepository(repoUrl);
    } catch (error: any) {
      // Handle rate limit errors
      if (error.status === 403) {
        return NextResponse.json(
          {
            error:
              "GitHub API rate limit exceeded. Please try again in a few minutes.",
          },
          { status: 429 }
        );
      }
      throw error;
    }
    
    // Use provided branch or default branch
    const targetBranch = branch || validation.defaultBranch;

    // Check for duplicate connection
    // First get the full URL from metadata
    const metadata = await fetchRepositoryMetadata(repoUrl);
    
    const existingRepo = await convexClient.query(
      api.repos.getRepoByUrlAndUser,
      {
        userId: convexUser._id,
        url: metadata.url,
      }
    );

    if (existingRepo) {
      return NextResponse.json(
        {
          error: "Repository already connected",
          repoId: existingRepo._id,
        },
        { status: 409 }
      );
    }

    // Create repository record in Convex
    const repoId = await convexClient.mutation(api.repos.createRepo, {
      userId: convexUser._id,
      url: metadata.url,
      owner: metadata.owner,
      name: metadata.name,
      branch: targetBranch,
      coderabbitDetected: false, // CodeRabbit integration disabled for now
    });

    // Initialize GitIngest report status
    await convexClient.mutation(api.repos.updateGitIngestReport, {
      repoId,
      status: "pending",
    });

    // Trigger GitIngest report generation asynchronously
    // Non-blocking: repo connection succeeds even if GitIngest fails
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const callbackUrl = `${appUrl}/api/repo/gitingest-callback`;

      // Update status to processing
      await convexClient.mutation(api.repos.updateGitIngestReport, {
        repoId,
        status: "processing",
      });

      // Trigger GitIngest service
      await triggerGitIngestReport({
        repoUrl: metadata.url,
        branch: targetBranch,
        callbackUrl,
      });
    } catch (error) {
      // Log error but don't fail the connection
      console.error("Failed to trigger GitIngest report generation:", error);
      // Set status to pending - can be retried later
      await convexClient.mutation(api.repos.updateGitIngestReport, {
        repoId,
        status: "pending",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Return success response
    return NextResponse.json(
      {
        repoId,
        repoUrl: metadata.url,
        status: "connected",
        next: `/repos/${repoId}`,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("Repository connection error:", error);

    // Handle specific error types
    if (error.message.includes("Invalid GitHub repository URL")) {
      return NextResponse.json(
        { error: "Invalid repository URL format" },
        { status: 400 }
      );
    }

    if (error.message.includes("Private repositories")) {
      return NextResponse.json(
        { error: "Private repositories are not supported in MVP" },
        { status: 403 }
      );
    }

    if (error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    if (error.message.includes("already connected")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to connect repository" },
      { status: 500 }
    );
  }
}


