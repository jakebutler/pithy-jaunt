"use client";

import { ReactNode } from "react";
import { ConvexClientProvider } from "@/lib/convex/client";
import { AuthProvider } from "@/lib/auth/context";
import { ToastProvider } from "@/lib/toast/context";
import { useSentryUserContext } from "@/lib/sentry/error-boundary";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/lib/toast/context";

interface ProvidersProps {
  children: ReactNode;
}

function SentryUserContextProvider({ children }: ProvidersProps) {
  useSentryUserContext();
  return <>{children}</>;
}

function ToastRenderer() {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onDismiss={removeToast} />;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ConvexClientProvider>
      <ToastProvider>
        <AuthProvider>
          <SentryUserContextProvider>{children}</SentryUserContextProvider>
          <ToastRenderer />
        </AuthProvider>
      </ToastProvider>
    </ConvexClientProvider>
  );
}

