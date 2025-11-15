import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/session
 * Get the current user session
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: "No active session" },
        { status: 401 }
      );
    }

    // Return user data
    return NextResponse.json(
      {
        userId: session.user.id,
        email: session.user.email,
        expiresAt: session.expires_at,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

