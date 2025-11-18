import { createServerClient } from "@supabase/ssr";

// Store cookies that need to be set in the response
// This is a workaround since TanStack Start doesn't have a direct way to set cookies in the callback
let pendingCookies: Array<{ name: string; value: string; options?: any }> = [];

/**
 * Creates a Supabase client for server-side operations in TanStack Start
 * Uses request headers for cookie management
 */
export function createClient(request?: Request) {
  // Reset pending cookies for each request
  pendingCookies = [];
  
  // Get cookies from request headers
  const cookieHeader = request?.headers.get("cookie") || "";
  const cookies = parseCookies(cookieHeader);

  // On server-side, process.env is the real Node.js process.env
  // (not Vite's define, which only works client-side)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Don't throw - log warning and return a client with placeholder values
    // This prevents server crashes when env vars aren't set
    console.warn(
      "Missing Supabase environment variables. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables."
    );
    // Return a client with placeholder values to prevent crashes
    // The actual error will be shown in the API response
    return createServerClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key',
      {
        cookies: {
          getAll() {
            return Object.entries(cookies).map(([name, value]) => ({
              name,
              value,
            }));
          },
          setAll(cookiesToSet) {
            // Store cookies to be set in the response
            pendingCookies = cookiesToSet.map(({ name, value, options }) => ({
              name,
              value,
              options,
            }));
          },
        },
      }
    );
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(cookiesToSet) {
          // Store cookies to be set in the response
          pendingCookies = cookiesToSet.map(({ name, value, options }) => ({
            name,
            value,
            options,
          }));
        },
      },
    }
  );
}

/**
 * Gets cookies that need to be set in the response
 * Call this after using the Supabase client to get cookies to set
 */
export function getPendingCookies(): Array<{ name: string; value: string; options?: any }> {
  return pendingCookies;
}

/**
 * Creates a Response with cookies set from Supabase
 */
export function createResponseWithCookies(
  body: any,
  init?: ResponseInit
): Response {
  const response = Response.json(body, init);
  
  // Set cookies from pendingCookies
  pendingCookies.forEach(({ name, value, options }) => {
    const cookieOptions = options || {};
    const cookieString = [
      `${name}=${value}`,
      cookieOptions.path ? `Path=${cookieOptions.path}` : 'Path=/',
      cookieOptions.domain ? `Domain=${cookieOptions.domain}` : '',
      cookieOptions.maxAge ? `Max-Age=${cookieOptions.maxAge}` : '',
      cookieOptions.expires ? `Expires=${cookieOptions.expires.toUTCString()}` : '',
      cookieOptions.httpOnly ? 'HttpOnly' : '',
      cookieOptions.secure ? 'Secure' : '',
      cookieOptions.sameSite ? `SameSite=${cookieOptions.sameSite}` : 'SameSite=Lax',
    ]
      .filter(Boolean)
      .join('; ');
    
    response.headers.append('Set-Cookie', cookieString);
  });
  
  return response;
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

