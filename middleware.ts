import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import jwt from "jsonwebtoken";

/**
 * Middleware to handle authentication and session refresh
 * Protects routes that require authentication
 */
export async function middleware(request: NextRequest) {
  // Check for JWT token in Authorization header for API routes
  const authHeader = request.headers.get("Authorization");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  
  if (isApiRoute && authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error("Missing JWT_SECRET environment variable");
        return new NextResponse(
          JSON.stringify({
            error: "Server configuration error",
            message: "Missing JWT_SECRET environment variable",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      // Verify the JWT token
      const decoded = jwt.verify(token, jwtSecret) as { userId: string };
      
      // Add user ID to request headers for downstream handlers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", decoded.userId);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error("JWT verification failed:", error);
      return new NextResponse(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or expired token",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
  
  // Check for required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    
    console.error(`Missing Supabase environment variables in middleware: ${missing.join(", ")}`);
    // Return a 500 error response for missing env vars
    return new NextResponse(
      JSON.stringify({
        error: "Server configuration error",
        message: "Missing required environment variables",
        missing: missing,
        instructions: "Add these variables in Vercel: Settings → Environment Variables → Add New",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // Verify user authentication - getUser() authenticates with Supabase Auth server
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protected routes that require authentication
    const protectedRoutes = ["/dashboard", "/repos", "/tasks", "/settings"];
    const isProtectedRoute = protectedRoutes.some((route) =>
      request.nextUrl.pathname.startsWith(route)
    );

    // Redirect to login if accessing protected route without authenticated user
    if (isProtectedRoute && !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("returnTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect to dashboard if accessing auth pages while logged in
    const authRoutes = ["/login", "/signup", "/magic-link"];
    const isAuthRoute = authRoutes.some((route) =>
      request.nextUrl.pathname.startsWith(route)
    );

    if (isAuthRoute && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Middleware error:", error);
    // Return error response instead of crashing
    return new NextResponse(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
