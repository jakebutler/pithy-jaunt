"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export interface NavigationProps {
  userEmail?: string;
}

export function Navigation({ userEmail }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname() || "/";

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/repos", label: "Repositories" },
    { to: "/tasks", label: "Tasks" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main nav */}
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-neutral-dark hover:text-primary transition-colors">
              Pithy Jaunt
            </Link>
            {/* Desktop navigation */}
            <div className="hidden md:flex md:ml-8 md:space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  href={link.to}
                  className={`px-3 py-2 text-small font-medium rounded transition-colors ${
                    isActive(link.to)
                      ? "text-primary bg-primary-light/10"
                      : "text-neutral-700 hover:text-neutral-dark hover:bg-neutral-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side - user menu and mobile button */}
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="hidden sm:block text-small text-neutral-600">{userEmail}</span>
            )}
            <form action="/api/auth/logout" method="POST" className="hidden sm:block">
              <button
                type="submit"
                className="text-small text-neutral-700 hover:text-neutral-dark transition-colors"
              >
                Sign out
              </button>
            </form>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 rounded text-neutral-700 hover:text-neutral-dark hover:bg-neutral-50"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 py-4">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  href={link.to}
                  className={`block px-3 py-2 text-small font-medium rounded ${
                    isActive(link.to)
                      ? "text-primary bg-primary-light/10"
                      : "text-neutral-700 hover:text-neutral-dark hover:bg-neutral-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {userEmail && (
                <div className="px-3 py-2 text-small text-neutral-600 border-t border-neutral-200 mt-2 pt-2">
                  {userEmail}
                </div>
              )}
              <form action="/api/auth/logout" method="POST" className="px-3">
                <button
                  type="submit"
                  className="w-full text-left text-small text-neutral-700 hover:text-neutral-dark"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

