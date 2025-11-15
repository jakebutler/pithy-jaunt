import { createGitHubClient, parseGitHubUrl } from "./client";

/**
 * Fetch repository metadata from GitHub
 */
export async function fetchRepositoryMetadata(repoUrl: string): Promise<{
  url: string;
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  createdAt: string;
  updatedAt: string;
}> {
  const parsed = parseGitHubUrl(repoUrl);

  if (!parsed.valid) {
    throw new Error("Invalid GitHub repository URL");
  }

  const octokit = createGitHubClient();

  const { data: repo } = await octokit.repos.get({
    owner: parsed.owner,
    repo: parsed.repo,
  });

  return {
    url: repo.html_url,
    owner: repo.owner.login,
    name: repo.name,
    defaultBranch: repo.default_branch,
    description: repo.description,
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
  };
}

