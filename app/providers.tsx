"use client";

import { ReactNode } from "react";
import { ConvexClientProvider } from "@/lib/convex/client";
import { AuthProvider } from "@/lib/auth/context";
import { useSentryUserContext } from "@/lib/sentry/error-boundary";

interface ProvidersProps {
  children: ReactNode;
}

function SentryUserContextProvider({ children }: ProvidersProps) {
  useSentryUserContext();
  return <>{children}</>;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ConvexClientProvider>
      <AuthProvider>
        <SentryUserContextProvider>{children}</SentryUserContextProvider>
      </AuthProvider>
    </ConvexClientProvider>
  );
}

