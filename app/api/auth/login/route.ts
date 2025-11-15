import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Sign in with Supabase
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Return generic error for security (don't reveal if email exists)
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Return session data
    return NextResponse.json(
      {
        userId: data.user?.id,
        email: data.user?.email,
        message: "Login successful",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

