import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/**
 * GET /api/debug/verify-gitingest-function
 * Verify that updateGitIngestReport function is available
 * This tests both TypeScript availability AND actual Convex deployment
 */
export async function GET() {
  try {
    // Try to access the function reference (TypeScript check)
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

    // Now actually try to call it with invalid args to verify it's deployed
    // This will fail with validation error if function exists, or "not found" if it doesn't
    try {
      await convexClient.mutation(api.repos.updateGitIngestReport, {
        repoId: "invalid" as any,
        status: "pending",
      });
    } catch (error: any) {
      // If we get a "not found" error, the function isn't deployed
      if (error?.message?.includes("Could not find") || error?.message?.includes("not found")) {
        return NextResponse.json({
          success: false,
          error: "Function is not deployed to Convex",
          details: error.message,
          functionPath: "api.repos.updateGitIngestReport",
        }, { status: 500 });
      }
      // Any other error (like validation error) means the function EXISTS
      // This is what we want - it means the function is deployed
    }

    return NextResponse.json({
      success: true,
      message: "updateGitIngestReport function is available and deployed",
      functionPath: "api.repos.updateGitIngestReport",
      note: "Function exists in both TypeScript types and Convex deployment",
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

