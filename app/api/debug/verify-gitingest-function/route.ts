import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/**
 * GET /api/debug/verify-gitingest-function
 * Verify that updateGitIngestReport function is available
 */
export async function GET() {
  try {
    // Try to access the function reference
    const functionRef = api.repos.updateGitIngestReport;
    
    // Check if the function reference exists
    if (!functionRef) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Function reference not found in generated API types" 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "updateGitIngestReport function is available",
      functionPath: "api.repos.updateGitIngestReport",
      // Note: We're not actually calling it, just verifying it exists
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

