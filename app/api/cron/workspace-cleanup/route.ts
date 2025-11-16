import { NextResponse } from "next/server";
import { performCleanup, reconcileWorkspaceStates } from "@/lib/daytona/maintenance";

/**
 * GET /api/cron/workspace-cleanup
 * 
 * Scheduled cron job for workspace cleanup and reconciliation
 * 
 * This endpoint is called by Vercel Cron based on the schedule configured in vercel.json
 * Default schedule: 0 2 * * * (2:00 AM daily)
 * 
 * The schedule can be configured via WORKSPACE_CLEANUP_CRON_SCHEDULE environment variable
 * in vercel.json, but Vercel Hobby plan only supports once per day.
 */
export async function GET(request: Request) {
  // Verify this is a cron request (Vercel adds Authorization header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    console.log("[Cron] Starting scheduled workspace cleanup...");

    // Perform cleanup
    const cleanupSummary = await performCleanup();

    // Reconcile workspace states
    const reconciliationResult = await reconcileWorkspaceStates();

    const duration = Date.now() - startTime;

    const summary = {
      cleanup: {
        processed: cleanupSummary.processed,
        terminated: cleanupSummary.terminated,
        errors: cleanupSummary.errors,
      },
      reconciliation: {
        reconciled: reconciliationResult.reconciled,
        errors: reconciliationResult.errors,
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    console.log("[Cron] Cleanup complete:", summary);

    return NextResponse.json(summary, { status: 200 });
  } catch (error: any) {
    console.error("[Cron] Error:", error);
    return NextResponse.json(
      {
        error: "Cleanup failed",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

