import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * POST /api/webhook/coderabbit
 * Receive CodeRabbit analysis results via webhook
 * 
 * MVP: Webhook-only approach (no polling)
 * This endpoint receives analysis completion callbacks from CodeRabbit
 * 
 * TODO: Implement webhook signature verification if CodeRabbit provides it
 */
export async function POST(request: Request) {
  try {
    // TODO: Verify webhook signature if CodeRabbit provides it
    // const signature = request.headers.get("x-coderabbit-signature");
    // if (!verifySignature(signature, body)) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const body = await request.json();

    // TODO: Parse CodeRabbit webhook payload structure
    // Expected structure (to be confirmed):
    // {
    //   repoId: string,
    //   analysisId: string,
    //   status: "completed" | "failed",
    //   report: { summary: string, tasks: [...] },
    //   ...
    // }

    const { repoId, status, report, tasks } = body;

    if (!repoId) {
      return NextResponse.json(
        { error: "Missing repoId in webhook payload" },
        { status: 400 }
      );
    }

    // Update repository analysis status
    await convexClient.mutation(api.repos.updateRepoAnalysis, {
      repoId: repoId as Id<"repos">,
      analyzerStatus: status === "completed" ? "completed" : "failed",
      lastAnalyzedAt: Date.now(),
    });

    // TODO: Store analysis report and suggested tasks in Convex
    // This will require additional schema/table for analysis results
    // For now, we just update the status

    // TODO: Create task suggestions from analysis
    // if (tasks && Array.isArray(tasks)) {
    //   for (const task of tasks) {
    //     await convexClient.mutation(api.tasks.createTask, {
    //       userId: repo.userId,
    //       repoId: repoId,
    //       title: task.title,
    //       description: task.description,
    //       initiator: "coderabbit",
    //       ...
    //     });
    //   }
    // }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error);
    // Return 200 to prevent CodeRabbit from retrying
    // Log error for investigation
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 200 }
    );
  }
}

