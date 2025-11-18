"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface RepoConnectFormProps {
  onSuccess?: (repoId: string) => void;
}

/**
 * Repository connection form component
 * Allows users to connect a GitHub repository by URL
 */
export function RepoConnectForm({ onSuccess }: RepoConnectFormProps) {
  const router = useRouter();
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
        router.push(nextPath)
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
        <Alert variant="error" dismissible onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      <Input
        id="repoUrl"
        label="Repository URL"
        type="text"
        required
        value={repoUrl}
        onChange={(e) => handleUrlChange(e.target.value)}
        placeholder="https://github.com/owner/repo or owner/repo"
        disabled={isLoading}
        error={error && !error.includes("already connected") ? error : undefined}
        helpText="Enter a public GitHub repository URL"
      />

      <Input
        id="branch"
        label="Branch (optional)"
        type="text"
        value={branch}
        onChange={(e) => setBranch(e.target.value)}
        placeholder="main"
        disabled={isLoading}
        helpText="Leave empty to use the repository's default branch"
      />

      <Button
        type="submit"
        variant="primary"
        disabled={isLoading || !repoUrl.trim()}
        isLoading={isLoading}
        className="w-full"
      >
        Connect Repository
      </Button>
    </form>
  );
}

