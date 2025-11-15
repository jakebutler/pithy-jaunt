import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/magic-link
 * Send a magic link (passwordless) authentication email
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Send magic link via Supabase
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
      },
    });

    if (error) {
      console.error("Magic link error:", error);
      // Still return success for security (don't reveal if email exists)
    }

    // Always return success message for security
    return NextResponse.json(
      {
        message: "If an account exists, a magic link has been sent to your email",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

