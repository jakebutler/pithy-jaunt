import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { convexClient } from "@/lib/convex/server";

/**
 * POST /api/auth/signup
 * Create a new user account with email and password
 * Also syncs user to Convex database
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

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Create user in Supabase
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 400 }
      );
    }

    // Sync user to Convex (if user was created)
    if (data.user) {
      try {
        // Import API dynamically to avoid build-time errors if _generated doesn't exist yet
        const { api } = await import("@/convex/_generated/api");
        await convexClient.mutation(api.users.upsertUser, {
          supabaseUserId: data.user.id,
          email: data.user.email || email,
        });
      } catch (convexError) {
        // Log but don't fail signup if Convex sync fails
        // User can still use the app, sync can be retried later
        console.error("Failed to sync user to Convex:", convexError);
      }
    }

    // Return user data
    return NextResponse.json(
      {
        userId: data.user?.id,
        email: data.user?.email,
        message: "User created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

