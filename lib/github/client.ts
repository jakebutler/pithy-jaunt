import { Octokit } from "@octokit/rest";

/**
 * Create a GitHub API client using the GITHUB_TOKEN environment variable
 */
export function createGitHubClient(): Octokit {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }

  return new Octokit({
    auth: token,
  });
}

/**
 * Parse a GitHub repository URL into owner and repo
 * @param url GitHub repository URL (e.g., https://github.com/owner/repo)
 * @returns Parsed URL components
 */
export function parseGitHubUrl(url: string): {
  valid: boolean;
  owner: string;
  repo: string;
} {
  try {
    const urlObj = new URL(url);
    
    // Handle both github.com and www.github.com
    if (!urlObj.hostname.includes("github.com")) {
      return { valid: false, owner: "", repo: "" };
    }

    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    if (pathParts.length < 2) {
      return { valid: false, owner: "", repo: "" };
    }

    const owner = pathParts[0];
    let repo = pathParts[1];
    
    // Remove .git suffix if present
    if (repo.endsWith(".git")) {
      repo = repo.slice(0, -4);
    }

    return {
      valid: true,
      owner,
      repo,
    };
  } catch {
    return { valid: false, owner: "", repo: "" };
  }
}

