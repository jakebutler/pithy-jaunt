'use client'

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

// Access environment variable in Next.js
// NEXT_PUBLIC_ prefix makes it available on both client and server
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Don't throw during module load - this causes reload loops
// Instead, create a client with a placeholder URL and handle errors gracefully
let convex: ConvexReactClient;
if (convexUrl) {
  convex = new ConvexReactClient(convexUrl);
} else {
  // Create a client with a placeholder URL to prevent errors during SSR
  // The actual error will be shown in the UI if needed
  console.warn('NEXT_PUBLIC_CONVEX_URL not set - Convex features will not work');
  convex = new ConvexReactClient('https://placeholder.convex.cloud');
}

/**
 * ConvexProvider wrapper for client components
 * Wrap your app with this to enable Convex hooks
 */
export function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  if (typeof window !== 'undefined') {
    console.log('[ConvexClientProvider] Rendering');
  }
  
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}

