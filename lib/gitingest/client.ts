/**
 * Git Ingest Client
 * 
 * Uses GitIngest to generate codebase digests.
 * Falls back to URL hack approach when Python is not available (e.g., in Vercel serverless).
 */

import { exec } from "child_process";
import { promisify } from "util";
import { GitIngestResult } from "./types";
import path from "path";

const execAsync = promisify(exec);

const SCRIPT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PYTHON_SCRIPT_PATH = path.join(
  process.cwd(),
  "lib",
  "gitingest",
  "automation.py"
);

/**
 * Convert GitHub URL to GitIngest URL (URL hack approach)
 * Example: https://github.com/owner/repo -> https://gitingest.com/owner/repo
 */
function convertToGitIngestUrl(githubUrl: string): string {
  return githubUrl.replace(/github\.com/g, "gitingest.com");
}

/**
 * Fetch digest from GitIngest using URL hack approach
 * This works by replacing github.com with gitingest.com in the URL
 */
async function fetchFromGitIngestUrl(repoUrl: string): Promise<string> {
  const gitingestUrl = convertToGitIngestUrl(repoUrl);
  
  try {
    const response = await fetch(gitingestUrl, {
      headers: {
        "User-Agent": "PithyJaunt/1.0",
        "Accept": "text/plain, text/*, */*",
      },
    });

    if (!response.ok) {
      throw new Error(
        `GitIngest URL fetch failed: ${response.status} ${response.statusText}`
      );
    }

    const content = await response.text();
    
    if (!content || content.length < 100) {
      throw new Error("GitIngest returned empty or insufficient content");
    }

    return content;
  } catch (error: any) {
    throw new Error(
      `Failed to fetch from GitIngest URL: ${error.message || String(error)}`
    );
  }
}

/**
 * Process a repository through GitIngest
 * Tries Python package first, falls back to URL hack if Python is not available
 * 
 * @param repoUrl - The GitHub repository URL
 * @param useCloud - Not used (kept for API compatibility)
 * @returns The git ingest digest content
 */
export async function processGitIngest(
  repoUrl: string,
  useCloud: boolean = true
): Promise<string> {
  // First, try Python approach (for local development or environments with Python)
  try {
    const fs = await import("fs/promises");
    try {
      await fs.access(PYTHON_SCRIPT_PATH);
      
      // Execute Python script using the gitingest package
      const command = `python3 "${PYTHON_SCRIPT_PATH}" --repo-url "${repoUrl}"`;
      
      const { stdout, stderr } = await Promise.race([
        execAsync(command, {
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large repositories
          timeout: SCRIPT_TIMEOUT,
          env: {
            ...process.env,
            // Pass GitHub token if available (for private repos)
            ...(process.env.GITHUB_TOKEN && {
              GITHUB_TOKEN: process.env.GITHUB_TOKEN,
            }),
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Git ingest processing timed out after 5 minutes")),
            SCRIPT_TIMEOUT
          )
        ),
      ]);

      // Parse JSON output
      let result: GitIngestResult;
      try {
        result = JSON.parse(stdout.trim());
      } catch (parseError) {
        // If stdout is not JSON, check stderr
        if (stderr) {
          try {
            result = JSON.parse(stderr.trim());
          } catch {
            throw new Error(
              `Failed to parse git ingest result. stdout: ${stdout.substring(0, 200)}, stderr: ${stderr.substring(0, 200)}`
            );
          }
        } else {
          throw new Error(
            `Failed to parse git ingest result. Output: ${stdout.substring(0, 200)}`
          );
        }
      }

      if (!result.success) {
        throw new Error(result.error || "Git ingest processing failed");
      }

      if (!result.content) {
        throw new Error("Git ingest processing succeeded but no content was returned");
      }

      return result.content;
    } catch (fsError) {
      // Script not found, fall through to URL hack
      throw new Error("Python script not accessible");
    }
  } catch (error: any) {
    // If Python approach fails (e.g., python3 not found, script error, etc.)
    // Fall back to URL hack approach
    if (
      error.message.includes("command not found") ||
      error.message.includes("not accessible") ||
      error.message.includes("ENOENT") ||
      error.code === "ENOENT"
    ) {
      console.log(
        "Python not available, falling back to GitIngest URL hack approach"
      );
      return await fetchFromGitIngestUrl(repoUrl);
    }

    // For other errors (timeout, parsing, etc.), try URL hack as fallback
    if (
      error.code === "ETIMEDOUT" ||
      error.message.includes("timed out") ||
      error.message.includes("parse")
    ) {
      console.log(
        "Python approach failed, falling back to GitIngest URL hack approach"
      );
      return await fetchFromGitIngestUrl(repoUrl);
    }

    // Re-throw if it's a different type of error
    throw error;
  }
}

/**
 * Process git ingest with retry logic
 * 
 * @param repoUrl - The GitHub repository URL
 * @param useCloud - Not used (kept for API compatibility)
 * @param maxRetries - Maximum number of retries (default: 1)
 * @returns The git ingest digest content
 */
export async function processGitIngestWithRetry(
  repoUrl: string,
  useCloud: boolean = true,
  maxRetries: number = 1
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await processGitIngest(repoUrl, useCloud);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors (e.g., invalid URL, script not found)
      if (
        lastError.message.includes("not found") ||
        lastError.message.includes("invalid") ||
        attempt >= maxRetries
      ) {
        throw lastError;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error("Git ingest processing failed after retries");
}

