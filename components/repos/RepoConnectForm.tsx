"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

interface RepoConnectFormProps {
  onSuccess?: (repoId: string) => void;
}

/**
 * Repository connection form component
 * Allows users to connect a GitHub repository by URL
 */
export function RepoConnectForm({ onSuccess }: RepoConnectFormProps) {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/repo/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          branch: branch.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          setError(
            "This repository is already connected. " +
              (data.repoId
                ? `View it here: /repos/${data.repoId}`
                : "Check your repository list.")
          );
        } else if (response.status === 403) {
          setError(
            "Private repositories are not supported in MVP. Please use a public repository."
          );
        } else if (response.status === 404) {
          setError("Repository not found. Please check the URL and try again.");
        } else {
          setError(data.error || "Failed to connect repository");
        }
        return;
      }

      // Success - redirect to repository detail page
      if (onSuccess) {
        onSuccess(data.repoId);
      } else {
        const nextPath = data.next || `/repos/${data.repoId}`
        navigate({ to: nextPath })
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function validateUrl(url: string): boolean {
    // Basic GitHub URL validation
    const githubUrlPattern =
      /^https?:\/\/github\.com\/[^\/]+\/[^\/]+(\/.*)?$/i;
    const shortPattern = /^[^\/]+\/[^\/]+$/;
    return githubUrlPattern.test(url) || shortPattern.test(url);
  }

  function handleUrlChange(value: string) {
    setRepoUrl(value);
    if (value && !validateUrl(value)) {
      setError("Please enter a valid GitHub repository URL");
    } else {
      setError("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-700 mb-1">
          Repository URL
        </label>
        <input
          id="repoUrl"
          name="repoUrl"
          type="text"
          required
          value={repoUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://github.com/owner/repo or owner/repo"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
          aria-describedby="repoUrl-help"
        />
        <p id="repoUrl-help" className="mt-1 text-sm text-gray-500">
          Enter a public GitHub repository URL
        </p>
      </div>

      <div>
        <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">
          Branch (optional)
        </label>
        <input
          id="branch"
          name="branch"
          type="text"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder="main"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
          aria-describedby="branch-help"
        />
        <p id="branch-help" className="mt-1 text-sm text-gray-500">
          Leave empty to use the repository&apos;s default branch
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading || !repoUrl.trim()}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Connecting..." : "Connect Repository"}
      </button>
    </form>
  );
}

