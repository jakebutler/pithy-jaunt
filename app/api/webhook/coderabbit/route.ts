import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { parseCodeRabbitComment, createTasksFromReport } from "@/lib/coderabbit/parser";

/**
 * POST /api/webhook/coderabbit
 * Receive CodeRabbit analysis results via webhook
 * 
 * MVP: Webhook-only approach (no polling)
 * 
 * This endpoint receives:
 * 1. GitHub webhooks for PR comments (when CodeRabbit reviews)
 * 2. CodeRabbit-specific webhooks (if available)
 * 
 * CodeRabbit integration approach:
 * - CodeRabbit is added to repo in Daytona workspace (if missing)
 * - CodeRabbit automatically analyzes and creates PR comments
 * - We parse those comments to extract tasks
 * - Create one or more Pithy Jaunt tasks based on the analysis
 */
export async function POST(request: Request) {
  try {
    // TODO: Verify webhook signature if CodeRabbit/GitHub provides it
    // const signature = request.headers.get("x-hub-signature-256");
    // if (!verifySignature(signature, body)) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const body = await request.json();
    
    // Handle GitHub webhook for PR comments (CodeRabbit reviews)
    if (body.action === "created" && body.comment) {
      // Check if comment is from CodeRabbit
      const isCodeRabbitComment = 
        body.comment.user?.login?.toLowerCase().includes("coderabbit") ||
        body.comment.body?.includes("CodeRabbit") ||
        body.comment.body?.includes("## Summary");
      
      if (isCodeRabbitComment && body.pull_request) {
        // Extract repository info from PR
        const repoFullName = body.repository.full_name; // owner/repo
        const [owner, name] = repoFullName.split("/");
        const commentBody = body.comment.body;
        
        // Find repository in our database by owner/name
        const repo = await convexClient.query(api.repos.getRepoByOwnerAndName, {
          owner,
          name,
        });
        
        if (!repo) {
          // Repository not found in our database, skip processing
          return NextResponse.json({ status: "ok", message: "Repository not found" }, { status: 200 });
        }
        
        // Parse CodeRabbit comment into structured report
        const report = parseCodeRabbitComment(commentBody);
        
        // Create tasks from report
        const tasks = createTasksFromReport(
          report,
          repo._id,
          repo.userId
        );
        
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
    
    // Handle direct CodeRabbit webhook (if they provide one)
    if (body.repoId && body.status) {
      const { repoId, status, report, comment } = body;
      
      // Update repository analysis status
      await convexClient.mutation(api.repos.updateRepoAnalysis, {
        repoId: repoId as Id<"repos">,
        analyzerStatus: status === "completed" ? "completed" : "failed",
        lastAnalyzedAt: Date.now(),
      });
      
      // If we have a comment/report, parse it and create tasks
      if (comment || report) {
        const reportData = comment 
          ? parseCodeRabbitComment(comment)
          : report;
        
        // Get repository to find userId
        const repo = await convexClient.query(api.repos.getRepoById, {
          repoId: repoId as Id<"repos">,
        });
        
        if (repo) {
          // Create tasks from report
          const tasks = createTasksFromReport(
            reportData,
            repoId,
            repo.userId
          );
          
          // Create tasks in Convex
          for (const task of tasks) {
            await convexClient.mutation(api.tasks.createTask, {
              userId: repo.userId,
              repoId: repoId as Id<"repos">,
              title: task.title,
              description: task.description,
              priority: task.priority,
              initiator: "coderabbit",
            });
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error);
    // Return 200 to prevent webhook from retrying
    // Log error for investigation
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 200 }
    );
  }
}

