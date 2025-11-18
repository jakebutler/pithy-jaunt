"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold text-neutral-dark">Sign in to Pithy Jaunt</h1>
        <p className="text-sm text-neutral-600">
          Or{" "}
          <Link href="/signup" className="font-medium text-primary hover:text-primary-dark transition-colors">
            create a new account
          </Link>
        </p>
      </div>

      <form
        className="space-y-6"
        onSubmit={handleSubmit}
        method="POST"
        action="/api/auth/login"
        noValidate
        encType="application/json"
      >
        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}

        <div className="space-y-4">
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
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link href="/magic-link" className="font-medium text-primary hover:text-primary-dark transition-colors">
            Use magic link instead
          </Link>
          <span className="text-neutral-500">Forgot password?</span>
        </div>

        <Button type="submit" variant="primary" disabled={isLoading} isLoading={isLoading} className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}

