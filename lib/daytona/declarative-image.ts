/**
 * Declarative Image Builder for Pithy Jaunt
 * 
 * This module defines the Daytona workspace image declaratively using the SDK.
 * This is more scalable and flexible than managing Docker images manually.
 * 
 * Benefits:
 * - No need to build/push Docker images manually
 * - Image definition is version-controlled in code
 * - Can be tested locally
 * - Daytona handles building and caching (24-hour cache)
 * - Easy to modify and iterate
 * 
 * Documentation: https://www.daytona.io/docs/en/declarative-images/
 */

import { Image } from "@daytonaio/sdk";
import type { Daytona } from "@daytonaio/sdk";
import * as fs from "fs";
import * as path from "path";

/**
 * Build the declarative image for Pithy Jaunt task execution
 * 
 * This image includes:
 * - Ubuntu 22.04 base with Python 3.11
 * - Git, curl, jq, and other system tools
 * - GitHub CLI
 * - Python dependencies (openai, anthropic)
 * - Playwright browsers (for browser-use)
 * - Execution script and agent runner
 */
export function buildPithyJauntImage(): Image {
  const projectRoot = path.resolve(__dirname, "../..");
  const daytonaDir = path.join(projectRoot, "daytona");

  // Start with Ubuntu 22.04 base image
  // Note: We use base() instead of debianSlim() to match the Dockerfile which uses Ubuntu 22.04
  let image = Image.base("ubuntu:22.04")
    // Prevent interactive prompts
    .env({ DEBIAN_FRONTEND: "noninteractive" })
    // Install system dependencies and Python 3.11 (matching Dockerfile)
    .runCommands(
      "apt-get update",
      "apt-get install -y software-properties-common",
      "add-apt-repository ppa:deadsnakes/ppa -y",
      "apt-get update",
      "apt-get install -y git curl wget python3.11 python3.11-dev python3.11-venv python3.11-distutils build-essential ca-certificates gnupg lsb-release jq",
      "apt-get clean",
      "rm -rf /var/lib/apt/lists/*"
    )
    // Install pip for Python 3.11
    .runCommands(
      "curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11",
      "update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1",
      "update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1"
    )
    // Install GitHub CLI
    .runCommands(
      "curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg",
      "chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg",
      "echo 'deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main' | tee /etc/apt/sources.list.d/github-cli.list > /dev/null",
      "apt-get update",
      "apt-get install -y gh",
      "apt-get clean",
      "rm -rf /var/lib/apt/lists/*"
    )
    // Install Node.js 20 (for potential Node.js-based tools)
    .runCommands(
      "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
      "apt-get install -y nodejs",
      "apt-get clean",
      "rm -rf /var/lib/apt/lists/*"
    )
    // Install Python packages
    .pipInstall(["openai>=1.0.0", "anthropic>=0.18.0", "playwright"])
    // Install Playwright browsers (for browser testing in post-apply validation)
    .runCommands("playwright install chromium --with-deps")
    // Install TypeScript globally (for post-apply validation)
    .runCommands("npm install -g typescript")
    // Set working directory
    .workdir("/app")
    // Set up git configuration
    .runCommands("git config --global init.defaultBranch main")
    // Create directory for temporary files
    .runCommands("mkdir -p /tmp/pj");

  // Add Python requirements file (if it exists)
  const requirementsPath = path.join(daytonaDir, "requirements.txt");
  if (fs.existsSync(requirementsPath)) {
    image = image.addLocalFile(
      requirementsPath,
      "/app/requirements.txt"
    );
    // Install from requirements.txt (redundant but ensures consistency)
    image = image.pipInstallFromRequirements("/app/requirements.txt");
  }

  // Add agent runner script
  const agentRunnerPath = path.join(daytonaDir, "agent-runner.py");
  if (fs.existsSync(agentRunnerPath)) {
    image = image.addLocalFile(
      agentRunnerPath,
      "/app/agent-runner.py"
    );
    image = image.runCommands("chmod +x /app/agent-runner.py");
  }

  // Add system prompt
  const systemPromptPath = path.join(daytonaDir, "system-prompt.md");
  if (fs.existsSync(systemPromptPath)) {
    image = image.addLocalFile(
      systemPromptPath,
      "/app/system-prompt.md"
    );
  }

  // Add execution script
  const executionScriptPath = path.join(daytonaDir, "execution.sh");
  if (fs.existsSync(executionScriptPath)) {
    image = image.addLocalFile(
      executionScriptPath,
      "/app/execution.sh"
    );
    image = image.runCommands("chmod +x /app/execution.sh");
  }

  // Set default command (will be overridden by Daytona template init script)
  image = image.cmd(["/app/execution.sh"]);

  return image;
}

/**
 * Alternative: Build image from existing Dockerfile
 * 
 * This is useful if you want to keep using your Dockerfile but still
 * benefit from declarative image building.
 */
export function buildPithyJauntImageFromDockerfile(): Image {
  const projectRoot = path.resolve(__dirname, "../..");
  const dockerfilePath = path.join(projectRoot, "daytona", "Dockerfile");

  if (!fs.existsSync(dockerfilePath)) {
    throw new Error(`Dockerfile not found at ${dockerfilePath}`);
  }

  return Image.fromDockerfile(dockerfilePath);
}

/**
 * Create a pre-built snapshot (optional)
 * 
 * Use this if you want to create a snapshot that can be reused across
 * multiple workspaces. Snapshots are permanently cached and available instantly.
 * 
 * Example:
 * ```typescript
 * const daytona = new Daytona({ ... });
 * const image = buildPithyJauntImage();
 * await daytona.snapshot.create({
 *   name: "pithy-jaunt-dev",
 *   image,
 * }, {
 *   onLogs: console.log,
 * });
 * ```
 */
export async function createPithyJauntSnapshot(
  daytona: Daytona,
  snapshotName: string = "pithy-jaunt-dev"
): Promise<void> {
  const image = buildPithyJauntImage();
  
  await daytona.snapshot.create(
    {
      name: snapshotName,
      image,
    },
    {
      onLogs: console.log,
    }
  );
  
  console.log(`[Declarative Image] Snapshot "${snapshotName}" created successfully`);
}

