"use client";

import { useAuth } from "@/lib/auth/context";
import Link from "next/link";

/**
 * AuthButton component
 * Shows login button when unauthenticated, logout button when authenticated
 */
export function AuthButton() {
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="h-10 w-20 bg-gray-200 animate-pulse rounded" />
    );
  }

  if (user) {
    return (
      <button
        onClick={() => signOut()}
        className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
      >
        Sign out
      </button>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
    >
      Sign in
    </Link>
  );
}

