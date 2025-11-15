"use client";

import { useState } from "react";
import Link from "next/link";

export default function MagicLinkPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send magic link");
        return;
      }

      setMessage(
        "Check your email! If an account exists, we've sent you a magic link."
      );
      setEmail(""); // Clear the form
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in with magic link
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            No password needed. We&apos;ll send you a link to sign in.
          </p>
          <p className="mt-1 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              use password instead
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded"
              role="status"
              aria-live="polite"
            >
              <p className="font-medium">{message}</p>
              <p className="text-sm mt-1">
                The link will expire in 15 minutes. Check your spam folder if
                you don&apos;t see it.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Email address"
              disabled={isLoading}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Send magic link"}
            </button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            <p>
              By continuing, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

