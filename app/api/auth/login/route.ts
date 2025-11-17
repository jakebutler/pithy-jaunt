import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import { errorResponse, successResponse, internalServerErrorResponse } from "@/lib/utils/api-response";

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return errorResponse("Email and password are required", 400);
    }

    // Sign in with Supabase
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Return generic error for security (don't reveal if email exists)
      return errorResponse("Invalid credentials", 401);
    }

    // Return session data
    return successResponse(
      {
        userId: data.user?.id,
        email: data.user?.email,
        message: "Login successful",
      },
      200
    );
  } catch (error) {
    console.error("Login error:", error);
    return internalServerErrorResponse();
  }
}
