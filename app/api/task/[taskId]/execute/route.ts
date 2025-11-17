import { NextRequest, NextResponse } from "next/server";
import { createWorkspace } from "@/lib/daytona/client";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/server";
import { tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Execute a task by creating a Daytona workspace
 * POST /api/task/[taskId]/execute
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  try {
    // Authenticate user
    const user = await auth.getUser(request);
    if (!user) {
      console.error(`[TaskExecute:${requestId}] Authentication failed - no user found`);
      return NextResponse.json(
        { 
          error: "Unauthorized",
          errorCode: "AUTH_FAILED",
          requestId 
        },
        { status: 401 }
      );
    }

    console.log(`[TaskExecute:${requestId}] Starting task execution`, {
      taskId: params.taskId,
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    // Get task details
    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, params.taskId))
      .limit(1);

    if (!task || task.length === 0) {
      console.error(`[TaskExecute:${requestId}] Task not found`, {
        taskId: params.taskId,
        userId: user.id
      });
      return NextResponse.json(
        { 
          error: "Task not found",
          errorCode: "TASK_NOT_FOUND",
          requestId 
        },
        { status: 404 }
      );
    }

    const taskData = task[0];
    
    // Validate task ownership
    if (taskData.userId !== user.id) {
      console.error(`[TaskExecute:${requestId}] Unauthorized task access`, {
        taskId: params.taskId,
        userId: user.id,
        taskOwnerId: taskData.userId
      });
      return NextResponse.json(
        { 
          error: "Unauthorized access to task",
          errorCode: "UNAUTHORIZED_ACCESS",
          requestId 
        },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!taskData.repoUrl || !taskData.branch || !taskData.description) {
      console.error(`[TaskExecute:${requestId}] Invalid task configuration`, {
        taskId: params.taskId,
        userId: user.id,
        repoUrl: taskData.repoUrl,
        branch: taskData.branch,
        hasDescription: !!taskData.description
      });
      return NextResponse.json(
        { 
          error: "Invalid task configuration - missing required fields",
          errorCode: "INVALID_TASK_CONFIG",
          requestId 
        },
        { status: 400 }
      );
    }

    // Extract repo owner and name from URL
    const repoMatch = taskData.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      console.error(`[TaskExecute:${requestId}] Invalid repository URL format`, {
        taskId: params.taskId,
        userId: user.id,
        repoUrl: taskData.repoUrl
      });
      return NextResponse.json(
        { 
          error: "Invalid repository URL format",
          errorCode: "INVALID_REPO_URL",
          requestId 
        },
        { status: 400 }
      );
    }

    const [, owner, repo] = repoMatch;
    const repoId = `${owner}/${repo}`;

    console.log(`[TaskExecute:${requestId}] Creating Daytona workspace`, {
      taskId: params.taskId,
      userId: user.id,
      repoId,
      repoUrl: taskData.repoUrl,
      branch: taskData.branch,
      modelProvider: taskData.modelProvider || "openai",
      model: taskData.model || "gpt-4o-mini"
    });

    // Create Daytona workspace
    const workspace = await createWorkspace({
      repoUrl: taskData.repoUrl,
      branch: taskData.branch,
      taskId: params.taskId,
      taskDescription: taskData.description,
      modelProvider: taskData.modelProvider || "openai",
      model: taskData.model || "gpt-4o-mini",
      keepWorkspaceAlive: taskData.keepAlive || false,
    });

    const executionTime = Date.now() - startTime;
    console.log(`[TaskExecute:${requestId}] Workspace created successfully`, {
      taskId: params.taskId,
      userId: user.id,
      repoId,
      workspaceId: workspace.workspaceId,
      status: workspace.status,
      executionTimeMs: executionTime
    });

    return NextResponse.json({
      success: true,
      workspaceId: workspace.workspaceId,
      status: workspace.status,
      requestId,
      executionTimeMs: executionTime
    });

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    // Log comprehensive error details
    console.error(`[TaskExecute:${requestId}] Task execution failed`, {
      taskId: params.taskId,
      userId: (await auth.getUser(request))?.id || "unknown",
      error: error.message,
      errorCode: error.code || "EXECUTION_FAILED",
      errorStack: error.stack,
      errorName: error.name,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });

    // Handle specific error types
    let errorMessage = "Failed to execute task";
    let errorCode = "EXECUTION_FAILED";
    let statusCode = 500;

    if (error.message?.includes("DAYTONA_API_KEY")) {
      errorMessage = "Daytona API configuration error";
      errorCode = "DAYTONA_CONFIG_ERROR";
      statusCode = 503;
    } else if (error.message?.includes("SDK failed")) {
      errorMessage = "Workspace creation service unavailable";
      errorCode = "WORKSPACE_SERVICE_ERROR";
      statusCode = 503;
    } else if (error.message?.includes("Connection refused")) {
      errorMessage = "Workspace service connection failed";
      errorCode = "CONNECTION_ERROR";
      statusCode = 503;
    } else if (error.message?.includes("snapshot")) {
      errorMessage = "Invalid workspace configuration";
      errorCode = "WORKSPACE_CONFIG_ERROR";
      statusCode = 400;
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        errorCode,
        requestId,
        executionTimeMs: executionTime,
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: statusCode }
    );
  }
}
