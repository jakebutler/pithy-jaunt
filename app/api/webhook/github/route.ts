import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { parseCodeRabbitComment, createTasksFromReport } from "@/lib/coderabbit/parser";

/**
 * POST /api/webhook/github
 * Receive GitHub webhooks (PR comments, PR events, etc.)
 * 
 * This endpoint handles GitHub webhook events, particularly:
 * - PR comment events (when CodeRabbit posts reviews)
 * - PR creation events (to trigger CodeRabbit analysis)
 * 
 * MVP: Webhook-only approach (no polling)
 */
export async function POST(request: Request) {
  try {
    // TODO: Verify GitHub webhook signature
    // const signature = request.headers.get("x-hub-signature-256");
    // if (!verifyGitHubSignature(signature, body)) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const body = await request.json();
    const eventType = request.headers.get("x-github-event");

    // Handle PR comment events (CodeRabbit reviews)
    if (eventType === "issue_comment" && body.action === "created") {
      // Check if comment is on a PR (not an issue)
      if (body.issue.pull_request) {
        // Check if comment is from CodeRabbit
        const isCodeRabbitComment =
          body.comment.user?.login?.toLowerCase().includes("coderabbit") ||
          body.comment.body?.includes("CodeRabbit") ||
          body.comment.body?.includes("## Summary");

        if (isCodeRabbitComment) {
          // Extract repository info
          const repoFullName = body.repository.full_name; // owner/repo
          const [owner, name] = repoFullName.split("/");
          const commentBody = body.comment.body;

          // Find repository in our database
          const repo = await convexClient.query(api.repos.getRepoByOwnerAndName, {
            owner,
            name,
          });

          if (repo) {
            // Parse CodeRabbit comment into structured report
            const report = parseCodeRabbitComment(commentBody);

            // Create tasks from report
            const tasks = createTasksFromReport(report, repo._id, repo.userId);

            // Create tasks in Convex
            for (const task of tasks) {
              await convexClient.mutation(api.tasks.createTask, {
                userId: repo.userId,
                repoId: repo._id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                initiator: "coderabbit",
              });
            }

            // Update repository analysis status
            await convexClient.mutation(api.repos.updateRepoAnalysis, {
              repoId: repo._id,
              analyzerStatus: "completed",
              lastAnalyzedAt: Date.now(),
            });
          }
        }
      }
    }

    // Handle PR creation events (optional - for triggering analysis)
    if (eventType === "pull_request" && body.action === "opened") {
      // CodeRabbit will automatically review new PRs if configured
      // We can optionally update repo status here
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error: any) {
    console.error("GitHub webhook error:", error);
    // Return 200 to prevent GitHub from retrying
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 200 }
    );
  }
}

