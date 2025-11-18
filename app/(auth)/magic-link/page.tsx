"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function MagicLinkPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send magic link. Please try again.");
        return;
      }

      setMessage("Check your email! If an account exists, we&apos;ve sent you a magic link.");
      setEmail("");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold text-neutral-dark">Sign in with a magic link</h1>
        <p className="text-sm text-neutral-600">
          No password needed. We&apos;ll send a one-time link to your inbox.
        </p>
        <p className="text-sm text-neutral-600">
          Or{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary-dark transition-colors">
            use a password instead
          </Link>
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}

        {message && (
          <Alert variant="success">
            <p className="font-medium">{message}</p>
            <p className="text-small mt-1">Links expire in 15 minutes. Check spam if you don&apos;t see it.</p>
          </Alert>
        )}

        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          disabled={isLoading}
        />

        <Button type="submit" variant="primary" disabled={isLoading} isLoading={isLoading} className="w-full">
          Send magic link
        </Button>

        <p className="text-center text-caption text-neutral-500">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>
    </div>
  );
}

