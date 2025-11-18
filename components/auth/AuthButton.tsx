"use client";

import { useAuth } from "@/lib/auth/context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/loading";

/**
 * AuthButton component
 * Shows login button when unauthenticated, logout button when authenticated
 */
export function AuthButton() {
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) {
    return <Skeleton width="5rem" height="2.5rem" className="rounded-full" />;
  }

  if (user) {
    return (
      <Button variant="outline" onClick={() => signOut()}>
        Sign out
      </Button>
    );
  }

  return (
    <Link href="/login">
      <Button variant="primary">Sign in</Button>
    </Link>
  );
}

