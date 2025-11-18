import { ReactNode } from "react";
import { Navigation } from "./navigation";

export interface LayoutProps {
  children: ReactNode;
  userEmail?: string;
  showNavigation?: boolean;
}

export function Layout({ children, userEmail, showNavigation = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-platinum-50">
      {showNavigation && <Navigation userEmail={userEmail} />}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">{children}</div>
      </main>
    </div>
  );
}

