import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/session
 * Get the current user session
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user - getUser() verifies with Supabase Auth server
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "No active session" },
        { status: 401 }
      );
    }

    // Return user data
    // Note: expiresAt is not available from getUser(), only from getSession()
    // If you need expiresAt, you can call getSession() after verifying with getUser()
    return NextResponse.json(
      {
        userId: user.id,
        email: user.email,
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

