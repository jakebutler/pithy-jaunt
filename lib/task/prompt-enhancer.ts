/**
 * Task Prompt Enhancer
 * 
 * Enhances user task descriptions with GitIngest repository report data
 * to provide better context and file-specific guidance to the coding agent.
 */

import { GitIngestReport } from "@/lib/gitingest/client";

export interface EnhancedTaskPrompt {
  enhancedDescription: string;
  suggestedFiles: string[];
  context: string;
}

/**
 * Enhance a task description using GitIngest report data
 */
export function enhanceTaskPrompt(
  taskDescription: string,
  gitingestReport: GitIngestReport | null
): EnhancedTaskPrompt {
  // If no report, return original description
  if (!gitingestReport) {
    return {
      enhancedDescription: taskDescription,
      suggestedFiles: [],
      context: "",
    };
  }

  // Extract file paths mentioned in task description
  const mentionedFiles = extractFilePaths(taskDescription);
  
  // Suggest files based on task description and repository structure
  const suggestedFiles = suggestFiles(
    taskDescription,
    mentionedFiles,
    gitingestReport
  );

  // Build enhanced description
  const enhancedDescription = buildEnhancedDescription(
    taskDescription,
    suggestedFiles,
    gitingestReport
  );

  // Build context summary
  const context = buildContext(gitingestReport);

  return {
    enhancedDescription,
    suggestedFiles,
    context,
  };
}

/**
 * Extract file paths mentioned in task description
 */
function extractFilePaths(description: string): string[] {
  const filePatterns = [
    // Paths like "app/api/tasks/[id]/route.ts"
    /[\w\/\-\[\]]+\.(ts|tsx|js|jsx|py|md|json|yaml|yml|css|scss|html|vue|svelte)/g,
    // Paths like "src/components/Button"
    /(?:src|app|lib|components|pages|api|routes?)\/[\w\/\-\[\]]+/g,
  ];

  const files: string[] = [];
  for (const pattern of filePatterns) {
    const matches = description.match(pattern);
    if (matches) {
      files.push(...matches);
    }
  }

  // Remove duplicates and normalize
  return Array.from(new Set(files.map(f => f.trim())));
}

/**
 * Suggest files that should be modified based on task description and repo structure
 */
function suggestFiles(
  taskDescription: string,
  mentionedFiles: string[],
  report: GitIngestReport
): string[] {
  const suggestions: string[] = [...mentionedFiles];
  const descriptionLower = taskDescription.toLowerCase();

  // Use entry points if task mentions API routes, endpoints, or handlers
  if (
    descriptionLower.includes("api") ||
    descriptionLower.includes("endpoint") ||
    descriptionLower.includes("route") ||
    descriptionLower.includes("handler")
  ) {
    // Look for API-related entry points
    const apiEntryPoints = report.structure.entryPoints.filter(
      (ep) =>
        ep.includes("api") ||
        ep.includes("route") ||
        ep.includes("handler") ||
        ep.includes("endpoint")
    );
    suggestions.push(...apiEntryPoints.slice(0, 5));
  }

  // Use entry points if task mentions components
  if (
    descriptionLower.includes("component") ||
    descriptionLower.includes("ui") ||
    descriptionLower.includes("page")
  ) {
    const componentEntryPoints = report.structure.entryPoints.filter(
      (ep) =>
        ep.includes("component") ||
        ep.includes("page") ||
        ep.includes("ui") ||
        ep.includes("view")
    );
    suggestions.push(...componentEntryPoints.slice(0, 5));
  }

  // Use directory structure to find relevant files
  if (descriptionLower.includes("test") || descriptionLower.includes("spec")) {
    const testDirs = report.structure.directories.filter(
      (dir) =>
        dir.includes("test") ||
        dir.includes("spec") ||
        dir.includes("__tests__")
    );
    // Suggest test files in those directories
    testDirs.slice(0, 3).forEach((dir) => {
      suggestions.push(`${dir}/**/*.test.ts`, `${dir}/**/*.spec.ts`);
    });
  }

  // Remove duplicates and normalize
  return Array.from(
    new Set(
      suggestions
        .map((f) => f.trim())
        .filter((f) => f.length > 0)
        .slice(0, 10) // Limit to 10 suggestions
    )
  );
}

/**
 * Build enhanced task description with file-specific guidance
 */
function buildEnhancedDescription(
  originalDescription: string,
  suggestedFiles: string[],
  report: GitIngestReport
): string {
  const parts: string[] = [];

  // Start with original description
  parts.push(originalDescription);

  // Add file-specific guidance if files are suggested
  if (suggestedFiles.length > 0) {
    parts.push("\n\n## Files to Modify:");
    parts.push(
      "The following files should be created or modified to complete this task:"
    );
    suggestedFiles.forEach((file) => {
      parts.push(`- ${file}`);
    });
  }

  // Add framework/architecture context
  if (report.patterns.framework !== "unknown") {
    parts.push(
      `\n\n## Framework Context:\nThis repository uses ${report.patterns.framework}.`
    );
    if (report.patterns.architecture !== "unknown") {
      parts.push(`Architecture: ${report.patterns.architecture}`);
    }
  }

  // Add relevant patterns
  if (report.patterns.testing.length > 0) {
    parts.push(
      `\nTesting framework: ${report.patterns.testing.join(", ")}`
    );
  }

  return parts.join("\n");
}

/**
 * Build context summary from GitIngest report
 */
function buildContext(report: GitIngestReport): string {
  const parts: string[] = [];

  parts.push(`Repository Structure:`);
  parts.push(`- Total files: ${report.structure.fileCount}`);
  parts.push(`- Languages: ${report.structure.languages.join(", ")}`);
  
  if (report.structure.entryPoints.length > 0) {
    parts.push(`- Entry points: ${report.structure.entryPoints.slice(0, 5).join(", ")}`);
  }

  if (report.patterns.framework !== "unknown") {
    parts.push(`- Framework: ${report.patterns.framework}`);
  }

  if (report.dependencies.packageManager !== "unknown") {
    parts.push(`- Package manager: ${report.dependencies.packageManager}`);
  }

  return parts.join("\n");
}

