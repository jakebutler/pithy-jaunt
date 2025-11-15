import { createClient } from "@/lib/auth/supabase-server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /auth/callback
 * Handle OAuth and magic link callbacks from Supabase
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    
    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to dashboard or returnTo URL
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // If error or no code, redirect to login with error
  return NextResponse.redirect(
    new URL("/login?error=authentication_failed", request.url)
  );
}

