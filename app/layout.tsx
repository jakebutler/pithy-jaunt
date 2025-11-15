import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}

