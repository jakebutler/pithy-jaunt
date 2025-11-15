import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { validateRepository, hasCodeRabbitConfig } from "@/lib/github/validation";
import { fetchRepositoryMetadata } from "@/lib/github/metadata";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { triggerRepositoryAnalysis } from "@/lib/coderabbit/client";

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
    const existingRepo = await convexClient.query(
      api.repos.getRepoByUrlAndUser,
      {
        userId: convexUser._id,
        url: validation.owner + "/" + validation.repo,
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

    // Check for CodeRabbit config
    const coderabbitDetected = await hasCodeRabbitConfig(
      validation.owner,
      validation.repo,
      targetBranch
    );

    // Fetch full repository metadata
    const metadata = await fetchRepositoryMetadata(repoUrl);

    // Create repository record in Convex
    const repoId = await convexClient.mutation(api.repos.createRepo, {
      userId: convexUser._id,
      url: metadata.url,
      owner: metadata.owner,
      name: metadata.name,
      branch: targetBranch,
      coderabbitDetected,
    });

    // Trigger CodeRabbit analysis asynchronously
    // MVP: Webhook-only approach (no polling)
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhook/coderabbit`;
      
      await convexClient.mutation(api.repos.updateRepoAnalysis, {
        repoId,
        analyzerStatus: "analyzing",
      });

      // TODO: Uncomment once CodeRabbit API is implemented
      // await triggerRepositoryAnalysis({
      //   repoUrl: metadata.url,
      //   owner: metadata.owner,
      //   repo: metadata.name,
      //   branch: targetBranch,
      //   webhookUrl,
      // });
    } catch (error) {
      // Log error but don't fail the connection
      console.error("Failed to trigger CodeRabbit analysis:", error);
      // Set status to pending - can be retried later
      await convexClient.mutation(api.repos.updateRepoAnalysis, {
        repoId,
        analyzerStatus: "pending",
      });
    }

    // Return success response
    return NextResponse.json(
      {
        repoId,
        repoUrl: metadata.url,
        coderabbitDetected,
        status: "analyzing",
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

