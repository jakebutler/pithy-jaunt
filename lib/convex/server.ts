import 'server-only'
import { ConvexHttpClient } from "convex/browser";

// Access environment variable in Next.js
// NEXT_PUBLIC_ prefix makes it available on both client and server
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Don't throw during module load - this causes server crashes
// Instead, create a client with a placeholder URL and handle errors gracefully
let client: ConvexHttpClient;
if (convexUrl) {
  client = new ConvexHttpClient(convexUrl);
} else {
  // Create a client with a placeholder URL to prevent errors during SSR
  // The actual error will be shown in the UI if needed
  console.warn('NEXT_PUBLIC_CONVEX_URL not set - Convex features will not work');
  client = new ConvexHttpClient('https://placeholder.convex.cloud');
}

/**
 * Server-side Convex client
 * Use this in Server Components and API routes
 * 
 * Example usage:
 * ```ts
 * import { convexClient } from "@/lib/convex/server";
 * import { api } from "@/convex/_generated/api";
 * 
 * const user = await convexClient.query(api.users.getUserByEmail, { email: "..." });
 * ```
 */
export const convexClient = client;

