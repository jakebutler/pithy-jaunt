import { createGitHubClient, parseGitHubUrl } from "./client";

/**
 * Validate that a GitHub repository exists and is public
 * @param repoUrl GitHub repository URL
 * @returns Repository metadata if valid, throws error if invalid
 */
export async function validateRepository(repoUrl: string): Promise<{
  owner: string;
  repo: string;
  defaultBranch: string;
  isPublic: boolean;
  exists: boolean;
}> {
  const parsed = parseGitHubUrl(repoUrl);

  if (!parsed.valid) {
    throw new Error("Invalid GitHub repository URL format");
  }

  const octokit = createGitHubClient();

  try {
    const { data: repo } = await octokit.repos.get({
      owner: parsed.owner,
      repo: parsed.repo,
    });

    // Check if repository is public
    if (repo.private) {
      throw new Error("Private repositories are not supported in MVP");
    }

    return {
      owner: repo.owner.login,
      repo: repo.name,
      defaultBranch: repo.default_branch,
      isPublic: !repo.private,
      exists: true,
    };
  } catch (error: unknown) {
    const octokitError = error as { status?: number; message?: string }
    if (octokitError.status === 404) {
      throw new Error("Repository not found or does not exist");
    }
    if (octokitError.status === 403) {
      throw new Error("Access denied. Repository may be private or access is restricted");
    }
    if (octokitError.message?.includes("Private repositories")) {
      throw error;
    }
    throw new Error(`Failed to validate repository: ${octokitError.message || String(error)}`);
  }
}

/**
 * Handle GitHub API rate limit errors
 */
interface RateLimitError {
  status?: number
  headers?: {
    "x-ratelimit-remaining"?: string
    "x-ratelimit-reset"?: string
  }
}

export function handleRateLimit(error: unknown): {
  retryAfter?: number;
  shouldRetry: boolean;
} {
  const rateLimitError = error as RateLimitError
  if (rateLimitError.status === 403 && rateLimitError.headers?.["x-ratelimit-remaining"] === "0") {
    const resetTime = parseInt(rateLimitError.headers["x-ratelimit-reset"] || "0");
    const retryAfter = Math.max(0, resetTime - Math.floor(Date.now() / 1000));
    
    return {
      retryAfter,
      shouldRetry: true,
    };
  }
  
  return {
    shouldRetry: false,
  };
}

/**
 * Check if a repository has a CodeRabbit configuration file
 * @param owner Repository owner
 * @param repo Repository name
 * @param branch Branch to check (defaults to default branch)
 * @returns true if .coderabbit.yaml exists
 */
export async function hasCodeRabbitConfig(
  owner: string,
  repo: string,
  branch?: string
): Promise<boolean> {
  const octokit = createGitHubClient();

  try {
    // First, get the default branch if not provided
    let targetBranch = branch;
    if (!targetBranch) {
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      targetBranch = repoData.default_branch;
    }

    // Check for .coderabbit.yaml file
    try {
      await octokit.repos.getContent({
        owner,
        repo,
        path: ".coderabbit.yaml",
        ref: targetBranch,
      });
      return true;
    } catch (error: unknown) {
      const octokitError = error as { status?: number; message?: string }
      if (octokitError.status === 404) {
        return false;
      }
      // If it's a different error, log it but don't fail
      console.warn(`Error checking for .coderabbit.yaml: ${octokitError.message || String(error)}`);
      return false;
    }
  } catch (error: unknown) {
    const octokitError = error as { message?: string }
    console.warn(`Error checking CodeRabbit config: ${octokitError.message || String(error)}`);
    return false;
  }
}

