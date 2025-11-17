import { createServerClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for server-side operations in TanStack Start
 * Uses request headers for cookie management
 */
export function createClient(request?: Request) {
  // Get cookies from request headers
  const cookieHeader = request?.headers.get("cookie") || "";
  const cookies = parseCookies(cookieHeader);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(cookiesToSet) {
          // In TanStack Start, we handle cookies via response headers
          // This will be handled by the response
        },
      },
    }
  );
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) {
      cookies[name] = rest.join("=");
    }
  });

  return cookies;
}

