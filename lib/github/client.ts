import { Octokit } from "@octokit/rest";

/**
 * GitHub API client
 * Uses authenticated requests for higher rate limits
 */
export function createGitHubClient() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      "GITHUB_TOKEN environment variable is required for GitHub API access"
    );
  }

  return new Octokit({
    auth: token,
  });
}

/**
 * Parse GitHub repository URL to extract owner and repo name
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 * - owner/repo
 */
export function parseGitHubUrl(url: string): {
  owner: string;
  repo: string;
  valid: boolean;
} {
  // Remove .git suffix if present
  const cleanUrl = url.replace(/\.git$/, "");

  // Match https://github.com/owner/repo or git@github.com:owner/repo
  const httpsMatch = cleanUrl.match(
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/
  );
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2],
      valid: true,
    };
  }

  // Match git@github.com:owner/repo
  const sshMatch = cleanUrl.match(/^git@github\.com:([^\/]+)\/([^\/]+)/);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
      valid: true,
    };
  }

  // Match owner/repo format
  const shortMatch = cleanUrl.match(/^([^\/]+)\/([^\/]+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      valid: true,
    };
  }

  return {
    owner: "",
    repo: "",
    valid: false,
  };
}

/**
 * Validate GitHub repository URL format
 */
export function isValidGitHubUrl(url: string): boolean {
  return parseGitHubUrl(url).valid;
}

