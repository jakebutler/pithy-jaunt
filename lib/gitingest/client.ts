/**
 * Git Ingest Client
 * 
 * Uses Browser Use Cloud for production (Vercel) and Python for local development.
 * Browser Use Cloud automates the GitIngest.com web interface to extract digest content.
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

const BROWSER_USE_API_URL = "https://api.browser-use.com/api/v2";
const PROCESSING_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Process a repository through GitIngest using Browser Use Cloud API
 * This automates the GitIngest.com web interface to extract digest content
 */
async function processWithBrowserUseCloud(repoUrl: string): Promise<string> {
  const apiKey = process.env.BROWSER_USE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "BROWSER_USE_API_KEY environment variable is required for Browser Use Cloud"
    );
  }

  // Task description for the browser agent
  const task = `Navigate to https://gitingest.com/ and process the repository ${repoUrl}.

Steps:
1. Go to https://gitingest.com/
2. Find the input field for the repository URL (it may be a text input or textarea)
3. Enter or paste the repository URL: ${repoUrl}
4. Submit the form or click the process/analyze button
5. Wait for the processing to complete (this may take 30-60 seconds for large repos)
   - Look for indicators like "Processing...", "Analyzing...", or progress bars
   - Wait until you see the results or a download button appears
6. Once processing is complete, look for the digest content on the page
   - The content may be displayed directly on the page in a textarea or pre tag
   - Or there may be a download button/link to get the file
7. If content is on the page, copy all the text content from the textarea/pre element
8. If there's a download button, click it and wait for the download, then read the file
9. Return the FULL, COMPLETE content as text - do not summarize or truncate

Important:
- Wait patiently for processing to complete - this can take time
- The digest content should be substantial (thousands of lines for most repos)
- Return the complete, unmodified content
- Look for elements with IDs like "result-summary", "directory-structure", or similar
- Make sure to get ALL the content, not just a preview`;

  try {
    // Create task via Browser Use Cloud API
    const createResponse = await fetch(`${BROWSER_USE_API_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Browser-Use-API-Key": apiKey,
      },
      body: JSON.stringify({
        task: task,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(
        `Browser Use API error (${createResponse.status}): ${errorText}`
      );
    }

    const taskData = await createResponse.json();
    const taskId = taskData.id;

    if (!taskId) {
      throw new Error("Failed to get task ID from Browser Use API response");
    }

    // Poll for task completion
    const startTime = Date.now();
    let result: any = null;

    while (Date.now() - startTime < PROCESSING_TIMEOUT) {
      // Wait before polling
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Poll every 3 seconds

      const statusResponse = await fetch(
        `${BROWSER_USE_API_URL}/tasks/${taskId}`,
        {
          headers: {
            "X-Browser-Use-API-Key": apiKey,
          },
        }
      );

      if (!statusResponse.ok) {
        throw new Error(
          `Failed to check task status: ${statusResponse.statusText}`
        );
      }

      result = await statusResponse.json();

      // Check if task is complete
      // Status values: "created", "started", "finished", "stopped"
      if (result.status === "finished") {
        break;
      }

      if (result.status === "stopped") {
        throw new Error(
          result.error || result.message || "Git ingest processing was stopped"
        );
      }

      // Continue polling if still running (created or started)
    }

    if (!result || result.status !== "finished") {
      throw new Error("Git ingest processing timed out after 5 minutes");
    }

    // Extract content from the result
    // The output field contains the final result
    let content = "";

    if (result.output) {
      content = typeof result.output === "string" 
        ? result.output 
        : JSON.stringify(result.output);
    } else if (result.steps && Array.isArray(result.steps)) {
      // Look through steps for substantial content
      // The agent should have extracted the digest content
      for (const step of result.steps.reverse()) {
        if (step.memory && typeof step.memory === "string" && step.memory.length > 2000) {
          // Check if it looks like git ingest content
          if (
            /Repository:|Files analyzed:|Directory structure:|FILE:|================================================/.test(
              step.memory
            )
          ) {
            content = step.memory;
            break;
          }
        }
      }
    }

    if (!content || content.length < 100) {
      throw new Error(
        "Git ingest processing completed but no substantial content was returned. " +
        "The agent may not have successfully extracted the digest content."
      );
    }

    return content;
  } catch (error: any) {
    throw new Error(
      `Browser Use Cloud processing failed: ${error.message || String(error)}`
    );
  }
}

/**
 * Process a repository through GitIngest using Python package
 * This works locally but not in Vercel serverless functions
 */
async function processWithPython(repoUrl: string): Promise<string> {
  const fs = await import("fs/promises");
  try {
    await fs.access(PYTHON_SCRIPT_PATH);
  } catch (error) {
    throw new Error(
      `Git ingest automation script not found at ${PYTHON_SCRIPT_PATH}. Make sure the script is installed.`
    );
  }

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
}

/**
 * Process a repository through GitIngest
 * Uses Browser Use Cloud for production, Python for local development
 * 
 * @param repoUrl - The GitHub repository URL
 * @param useCloud - Whether to prefer Browser Use Cloud (default: true for production)
 * @returns The git ingest digest content
 */
export async function processGitIngest(
  repoUrl: string,
  useCloud: boolean = true
): Promise<string> {
  // Determine which method to use based on environment and useCloud flag
  const isProduction = process.env.NODE_ENV === "production";
  const hasBrowserUseKey = !!process.env.BROWSER_USE_API_KEY;
  const shouldUseBrowserUse = useCloud && (isProduction || hasBrowserUseKey);

  if (shouldUseBrowserUse) {
    // Use Browser Use Cloud for production or when explicitly requested
    try {
      return await processWithBrowserUseCloud(repoUrl);
    } catch (error: any) {
      console.log("Browser Use Cloud failed, falling back to Python:", error.message);
      // Fall through to Python for local development
    }
  }

  // Fall back to Python approach (works locally, not in Vercel)
  try {
    return await processWithPython(repoUrl);
  } catch (error: any) {
    // If Python fails and we're in production, try Browser Use Cloud as last resort
    if (isProduction && !shouldUseBrowserUse) {
      try {
        return await processWithBrowserUseCloud(repoUrl);
      } catch (browserError: any) {
        throw new Error(
          `All git ingest methods failed. Python: ${error.message}, Browser Use: ${browserError.message}`
        );
      }
    }
    
    throw error;
  }
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

