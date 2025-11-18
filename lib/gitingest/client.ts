/**
 * GitIngest Service Client
 * 
 * Client library for communicating with the GitIngest Python microservice
 */

export interface GitIngestRequest {
  repoUrl: string;
  branch: string;
  callbackUrl?: string;
}

export interface GitIngestResponse {
  status: "processing";
  jobId: string;
  estimatedTime: number;
}

export interface GitIngestWebhookPayload {
  jobId: string;
  repoUrl: string;
  branch: string;
  status: "completed" | "failed";
  report?: GitIngestReport;
  error?: string;
}

export interface GitIngestReport {
  summary: string;
  structure: {
    directories: string[];
    fileCount: number;
    languages: string[];
    entryPoints: string[];
  };
  patterns: {
    framework: string;
    architecture: string;
    testing: string[];
    buildTools: string[];
  };
  dependencies: {
    runtime: string[];
    dev: string[];
    packageManager: string;
  };
  llmContext: string;
  generatedAt: number;
}

/**
 * Trigger GitIngest report generation
 */
export async function triggerGitIngestReport(
  params: GitIngestRequest
): Promise<GitIngestResponse> {
  const baseUrl = process.env.GIT_INGEST_BASE_URL;
  const apiKey = process.env.GIT_INGEST_API_KEY;

  if (!baseUrl) {
    throw new Error("GIT_INGEST_BASE_URL environment variable is not set");
  }

  if (!apiKey) {
    throw new Error("GIT_INGEST_API_KEY environment variable is not set");
  }

  const url = `${baseUrl}/ingest`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        repoUrl: params.repoUrl,
        branch: params.branch,
        callbackUrl: params.callbackUrl,
      }),
      // 30 second timeout for initial request
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitIngest service error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    return data as GitIngestResponse;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        throw new Error("GitIngest service request timed out");
      }
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          `Failed to connect to GitIngest service at ${baseUrl}. Is the service running?`
        );
      }
    }
    throw error;
  }
}

/**
 * Check if GitIngest service is available
 */
export async function checkGitIngestHealth(): Promise<boolean> {
  const baseUrl = process.env.GIT_INGEST_BASE_URL;

  if (!baseUrl) {
    return false;
  }

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    return response.ok;
  } catch {
    return false;
  }
}


