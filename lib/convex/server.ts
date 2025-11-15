import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!convexUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_CONVEX_URL environment variable. " +
      "Set it in .env.local to your Convex deployment URL."
  );
}

const client = new ConvexHttpClient(convexUrl);

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

