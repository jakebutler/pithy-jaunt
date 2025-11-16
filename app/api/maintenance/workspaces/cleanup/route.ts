import { NextResponse } from "next/server";
import { performCleanup, reconcileWorkspaceStates } from "@/lib/daytona/maintenance";

/**
 * POST /api/maintenance/workspaces/cleanup
 * 
 * Manually trigger workspace cleanup and reconciliation
 * 
 * Query parameters:
 * - reconcile: boolean - Also perform state reconciliation (default: true)
 * 
 * Note: In production, this should be protected with authentication/authorization
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldReconcile = searchParams.get("reconcile") !== "false";

    console.log("[Maintenance API] Starting cleanup...");

    // Perform cleanup
    const cleanupSummary = await performCleanup();

    // Optionally reconcile states
    let reconciliationResult = null;
    if (shouldReconcile) {
      console.log("[Maintenance API] Starting reconciliation...");
      reconciliationResult = await reconcileWorkspaceStates();
    }

    const summary = {
      cleanup: {
        processed: cleanupSummary.processed,
        terminated: cleanupSummary.terminated,
        errors: cleanupSummary.errors,
        results: cleanupSummary.results,
      },
      reconciliation: reconciliationResult,
      timestamp: new Date().toISOString(),
    };

    console.log("[Maintenance API] Cleanup complete:", {
      processed: cleanupSummary.processed,
      terminated: cleanupSummary.terminated,
      errors: cleanupSummary.errors,
      reconciled: reconciliationResult?.reconciled || 0,
    });

    return NextResponse.json(summary, { status: 200 });
  } catch (error: any) {
    console.error("[Maintenance API] Error:", error);
    return NextResponse.json(
      {
        error: "Cleanup failed",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

