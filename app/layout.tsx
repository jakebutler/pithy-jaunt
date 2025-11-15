import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/context";
import { ConvexClientProvider } from "@/lib/convex/client";

export const metadata: Metadata = {
  title: "Pithy Jaunt - AI-Powered DevOps Autopilot",
  description: "Transform natural language into working pull requests",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ConvexClientProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

