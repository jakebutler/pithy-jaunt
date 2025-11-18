import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client for server-side operations with Bearer token authentication
 * This is used for API requests that include an Authorization header with a Bearer token
 * 
 * SECURITY NOTE: Only use this with user session tokens, never with service role keys.
 * Session tokens are validated by Supabase and have user-scoped permissions.
 */
export function createClientWithToken(authToken: string) {
  // Create a client that uses the token directly
  // The token will be validated by Supabase when getUser() is called
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    }
  );
}

