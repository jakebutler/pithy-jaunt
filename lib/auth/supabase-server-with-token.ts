import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client for server-side operations with Bearer token authentication
 * This is used for API requests that include an Authorization header with a Bearer token
 * 
 * SECURITY NOTE: Only use this with user session tokens, never with service role keys.
 * Session tokens are validated by Supabase and have user-scoped permissions.
 */
export async function createClientWithToken(authToken: string) {
  // Create a client that uses the token directly in headers
  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
      auth: {
        persistSession: false, // Don't persist session for server-side
        autoRefreshToken: false, // Don't auto-refresh for server-side
      },
    }
  );

  // Validate the token by calling getUser() - this will use the Authorization header
  // Note: We validate here but the caller should also call getUser() to get the user
  const { data: { user }, error } = await client.auth.getUser();
  
  if (error || !user) {
    throw new Error(`Invalid token: ${error?.message || 'User not found'}`);
  }

  return { client, user };
}

