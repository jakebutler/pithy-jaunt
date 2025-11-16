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
const PROCESSING_TIMEOUT = 10 * 60 * 1000; // 10 minutes (GitIngest can take a while for large repos)

// Try to use Browser Use SDK if available
let BrowserUseClient: any = null;
try {
  const sdk = require("browser-use-sdk");
  BrowserUseClient = sdk.BrowserUseClient || sdk.default?.BrowserUseClient || sdk;
} catch {
  // SDK not available, will use REST API
}

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

  // Task description following Browser Use Cloud best practices:
  // - Be specific: exact actions and elements
  // - Set boundaries: single page, specific elements
  // - Include context: data format and expected content
  const task = `Extract the complete codebase digest text from GitIngest.com for repository: ${repoUrl}

BOUNDARIES:
- Visit ONLY: https://gitingest.com/ (single page)
- Extract content ONLY from textarea or pre elements on this page
- Wait maximum 180 seconds for processing

SPECIFIC INSTRUCTIONS:
1. Navigate to https://gitingest.com/
2. WAIT for the page to fully load (5-10 seconds) - the page uses JavaScript and may take time to render
3. Verify the page has loaded by checking for:
   - A heading containing "Prompt-friendly codebase" or "Gitingest"
   - A text input field visible on the page
   - If the page appears empty, wait longer (up to 30 seconds) and refresh if needed
4. Locate the text input field (textbox with placeholder "https://github.com/..." or similar)
5. Clear any existing text and enter exactly: ${repoUrl}
6. Click the "Ingest" button (button element immediately next to the input field, labeled "Ingest")
7. Wait for processing to complete:
   - Monitor the page for 60-180 seconds
   - Look for URL changes, loading indicators, or progress messages
   - Wait until a textarea or pre element appears with substantial content (10,000+ characters)
   - The page may show "Processing..." or similar indicators
8. Extract the digest content:
   - Find the textarea or pre element containing the digest
   - Use JavaScript if needed: document.querySelector('textarea')?.value || document.querySelector('pre')?.textContent
   - Check all textarea and pre elements on the page
   - Verify content starts with "Repository:" and contains "Directory structure:" and "FILE:"
9. Return the complete, unmodified text content

EXPECTED DATA FORMAT:
- Content starts with: "Repository: [owner]/[repo]"
- Contains: "Directory structure:" section
- Contains: "FILE:" markers for each file
- Total length: 10,000+ characters (thousands of lines)
- Format: Plain text, no HTML markup

CRITICAL REQUIREMENTS:
- Wait for initial page load before interacting (GitIngest.com uses JavaScript)
- Do NOT summarize, truncate, or modify the content
- Return the FULL text exactly as displayed
- If content doesn't appear after 180 seconds, report the error
- Use JavaScript evaluation if direct element access fails`;

  try {
    let result: any = null;

    // Try using SDK first if available
    if (BrowserUseClient && typeof BrowserUseClient === "function") {
      try {
        const client = new BrowserUseClient({ apiKey });
        const browserTask = await client.tasks.createTask({ 
          task,
          llm: "gpt-4.1", // Use more capable model for better reliability
        });
        result = await browserTask.complete();
      } catch (sdkError: any) {
        console.log("SDK failed, falling back to REST API:", sdkError.message);
        // Fall through to REST API
      }
    }

    // Use REST API if SDK not available or failed
    if (!result) {
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

        if (result.status === "stopped" || result.status === "failed") {
          throw new Error(
            result.error || result.message || "Git ingest processing was stopped"
          );
        }

        // Check if we have output even if status is still "started"
        // Sometimes tasks complete but status hasn't updated yet
        if (result.status === "started" && result.output) {
          const outputContent = typeof result.output === "string" 
            ? result.output 
            : JSON.stringify(result.output);
          // If we have substantial output, the task might be done
          if (outputContent.length > 1000) {
            console.log("Task appears complete (has output), breaking early");
            break;
          }
        }

        // Continue polling if still running (created or started)
      }

      if (!result || (result.status !== "finished" && !(result.status === "started" && result.output))) {
        throw new Error("Git ingest processing timed out after 10 minutes");
      }
    }

    // Extract content from the result
    // The output field contains the final result
    let content = "";

    // Try multiple ways to extract the content
    if (result.output) {
      content = typeof result.output === "string" 
        ? result.output 
        : JSON.stringify(result.output);
    } else if (result.result) {
      content = typeof result.result === "string"
        ? result.result
        : JSON.stringify(result.result);
    } else if (result.data) {
      content = typeof result.data === "string"
        ? result.data
        : JSON.stringify(result.data);
    } else if (result.steps && Array.isArray(result.steps)) {
      // Look through steps for substantial content
      // The agent should have extracted the digest content
      for (const step of result.steps.reverse()) {
        // Check step output/memory/content fields
        const stepContent = step.output || step.memory || step.content || step.text;
        if (stepContent && typeof stepContent === "string" && stepContent.length > 2000) {
          // Check if it looks like git ingest content
          if (
            /Repository:|Files analyzed:|Directory structure:|FILE:|================================================/.test(
              stepContent
            )
          ) {
            content = stepContent;
            break;
          }
        }
      }
    } else if (result.history && Array.isArray(result.history)) {
      // Look through history for content
      for (const message of result.history.reverse()) {
        const messageContent = typeof message === "string"
          ? message
          : message.content || message.text || message.output || JSON.stringify(message);
        if (messageContent && typeof messageContent === "string" && messageContent.length > 2000) {
          if (
            /Repository:|Files analyzed:|Directory structure:|FILE:|================================================/.test(
              messageContent
            )
          ) {
            content = messageContent;
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

