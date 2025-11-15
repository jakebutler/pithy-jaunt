/**
 * CodeRabbit Report Parser
 * 
 * Parses CodeRabbit's PR comments and reviews to extract:
 * - Analysis summary
 * - Suggested tasks
 * - Code quality issues
 * - Actionable recommendations
 */

export interface CodeRabbitTask {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  category?: string;
  file?: string;
  line?: number;
}

export interface CodeRabbitReport {
  summary: string;
  tasks: CodeRabbitTask[];
  issues: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    message: string;
    file?: string;
    line?: number;
  }>;
}

/**
 * Parse CodeRabbit PR comment/review into structured report
 * 
 * CodeRabbit typically provides:
 * - Summary section
 * - File-by-file breakdown
 * - Specific suggestions with code examples
 * - Priority levels
 */
export function parseCodeRabbitComment(comment: string): CodeRabbitReport {
  // TODO: Implement actual parsing logic based on CodeRabbit's comment format
  // This is a placeholder that will be refined based on actual CodeRabbit output
  
  const tasks: CodeRabbitTask[] = [];
  const issues: CodeRabbitReport["issues"] = [];
  
  // Extract summary (usually at the beginning)
  const summaryMatch = comment.match(/## Summary\s*\n\n(.*?)(?=\n##|\n###|$)/s);
  const summary = summaryMatch ? summaryMatch[1].trim() : "Analysis completed";
  
  // Extract tasks/suggestions
  // CodeRabbit typically uses markdown lists with priority indicators
  const taskMatches = comment.matchAll(/[-*]\s*\*\*(.*?)\*\*:?\s*(.*?)(?=\n[-*]|\n##|$)/gs);
  
  for (const match of taskMatches) {
    const title = match[1].trim();
    const description = match[2].trim();
    
    // Determine priority from title or description
    let priority: "low" | "medium" | "high" = "medium";
    if (title.toLowerCase().includes("critical") || title.toLowerCase().includes("high")) {
      priority = "high";
    } else if (title.toLowerCase().includes("low") || title.toLowerCase().includes("minor")) {
      priority = "low";
    }
    
    // Extract file and line if mentioned
    const fileMatch = description.match(/`([^`]+)`(?:.*?line\s+(\d+))?/i);
    
    tasks.push({
      id: `task_${Date.now()}_${tasks.length}`,
      title,
      description,
      priority,
      file: fileMatch ? fileMatch[1] : undefined,
      line: fileMatch && fileMatch[2] ? parseInt(fileMatch[2]) : undefined,
    });
  }
  
  return {
    summary,
    tasks,
    issues,
  };
}

/**
 * Convert CodeRabbit report into Pithy Jaunt tasks
 * 
 * May create one or more tasks depending on the scope of work
 */
export function createTasksFromReport(
  report: CodeRabbitReport,
  repoId: string,
  userId: string
): Array<{
  title: string;
  description: string;
  priority: "low" | "normal" | "high";
  initiator: "coderabbit";
}> {
  // Group tasks by priority and category
  const highPriorityTasks = report.tasks.filter((t) => t.priority === "high");
  const mediumPriorityTasks = report.tasks.filter((t) => t.priority === "medium");
  const lowPriorityTasks = report.tasks.filter((t) => t.priority === "low");
  
  const pithyTasks: Array<{
    title: string;
    description: string;
    priority: "low" | "normal" | "high";
    initiator: "coderabbit";
  }> = [];
  
  // Create tasks based on priority groups
  // High priority items get individual tasks
  for (const task of highPriorityTasks) {
    pithyTasks.push({
      title: task.title,
      description: task.description,
      priority: "high",
      initiator: "coderabbit",
    });
  }
  
  // Medium priority: group related items or create individual tasks
  if (mediumPriorityTasks.length > 0) {
    if (mediumPriorityTasks.length === 1) {
      pithyTasks.push({
        title: mediumPriorityTasks[0].title,
        description: mediumPriorityTasks[0].description,
        priority: "normal",
        initiator: "coderabbit",
      });
    } else {
      // Group multiple medium priority items
      pithyTasks.push({
        title: `CodeRabbit: ${mediumPriorityTasks.length} medium priority improvements`,
        description: `Address ${mediumPriorityTasks.length} code quality improvements:\n\n${mediumPriorityTasks.map((t, i) => `${i + 1}. ${t.title}: ${t.description}`).join("\n\n")}`,
        priority: "normal",
        initiator: "coderabbit",
      });
    }
  }
  
  // Low priority: group into a single task
  if (lowPriorityTasks.length > 0) {
    pithyTasks.push({
      title: `CodeRabbit: ${lowPriorityTasks.length} minor improvements`,
      description: `Address ${lowPriorityTasks.length} minor code quality suggestions:\n\n${lowPriorityTasks.map((t, i) => `${i + 1}. ${t.title}: ${t.description}`).join("\n\n")}`,
      priority: "low",
      initiator: "coderabbit",
    });
  }
  
  // If no tasks extracted, create a general task from the summary
  if (pithyTasks.length === 0 && report.summary) {
    pithyTasks.push({
      title: "CodeRabbit: Review analysis and implement suggestions",
      description: report.summary,
      priority: "normal",
      initiator: "coderabbit",
    });
  }
  
  return pithyTasks;
}

