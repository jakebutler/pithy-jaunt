import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { createClientWithToken } from '@/lib/auth/supabase-server-with-token'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { createWorkspace, isDaytonaConfigured } from '@/lib/daytona/client'
import { enhanceTaskPrompt } from '@/lib/task/prompt-enhancer'
import { GitIngestReport } from '@/lib/gitingest/client'
import { captureError } from '@/lib/sentry/error-handler'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  console.log('[TASK EXECUTE] Starting task execution request')
  
  try {
    const { taskId } = await params
    console.log('[TASK EXECUTE] Task ID:', taskId)
    
    // Support both cookie-based and Bearer token authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : undefined

    // Get authenticated user (using token if provided, otherwise cookies)
    let supabase
    let user
    let authError
    
    if (token) {
      try {
        const result = await createClientWithToken(token)
        supabase = result.client
        user = result.user
        authError = null
      } catch (error) {
        authError = error instanceof Error ? error : new Error(String(error))
        user = null
      }
    } else {
      supabase = await createClient()
      const result = await supabase.auth.getUser()
      user = result.data.user
      authError = result.error
    }

    if (authError || !user) {
      console.log('[TASK EXECUTE] No user found:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[TASK EXECUTE] User authenticated:', user.id)

    // Get user from Convex
    const convexUser = await convexClient.query(
      api.users.getUserBySupabaseId,
      { supabaseUserId: user.id }
    )

    if (!convexUser) {
      console.log('[TASK EXECUTE] User not found in Convex')
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }

    console.log('[TASK EXECUTE] Convex user found:', convexUser._id)

    // Get task
    const task = await convexClient.query(api.tasks.getTaskById, {
      taskId: taskId as Id<'tasks'>,
    })

    if (!task) {
      console.log('[TASK EXECUTE] Task not found:', taskId)
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Verify user owns the task
    if (task.userId !== convexUser._id) {
      return NextResponse.json(
        { error: 'Forbidden: You don\'t have access to this task' },
        { status: 403 }
      )
    }

    // Check if task is in a valid state for execution
    if (task.status !== 'queued' && task.status !== 'needs_review') {
      return NextResponse.json(
        {
          error: `Task cannot be executed. Current status: ${task.status}`,
        },
        { status: 400 }
      )
    }

    // Parse request body (optional)
    let keepWorkspaceAlive = false
    try {
      const contentType = request.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const body = await request.json()
        keepWorkspaceAlive = body.keepWorkspaceAlive || false
      }
    } catch {
      // Empty body or invalid JSON is fine, use defaults
    }

    // Get repository info
    const repo = await convexClient.query(api.repos.getRepoById, {
      repoId: task.repoId,
    })

    if (!repo || !repo.url || !repo.branch) {
      return NextResponse.json(
        { error: 'Repository not found or missing required fields' },
        { status: 404 }
      )
    }

    // Validate task has model preference
    if (!task.modelPreference || !task.modelPreference.provider || !task.modelPreference.model) {
      return NextResponse.json(
        { error: 'Task model preference is missing or invalid' },
        { status: 400 }
      )
    }

    // Check if Daytona is configured
    if (!isDaytonaConfigured()) {
      return NextResponse.json(
        {
          error:
            'Daytona is not configured. Please set DAYTONA_API_URL and DAYTONA_API_KEY environment variables.',
        },
        { status: 503 }
      )
    }

    // Get GitIngest report if available
    const gitingestReport: GitIngestReport | null = 
      repo.gitingestReportStatus === 'completed' && repo.gitingestReport
        ? (repo.gitingestReport as unknown as GitIngestReport)
        : null

    // Enhance task description with GitIngest report data
    const enhancedPrompt = enhanceTaskPrompt(
      task.description,
      gitingestReport
    )

    try {
      // Create Daytona workspace with enhanced prompt
      // Don't set status to "running" yet - wait until workspace is created and script is started
      const workspace = await createWorkspace({
        repoUrl: repo.url,
        branch: repo.branch,
        taskId: task._id,
        taskDescription: enhancedPrompt.enhancedDescription,
        modelProvider: task.modelPreference.provider,
        model: task.modelPreference.model,
        keepWorkspaceAlive: keepWorkspaceAlive,
      })

      // Create workspace record in Convex
      const workspaceId = await convexClient.mutation(
        api.workspaces.createWorkspace,
        {
          daytonaId: workspace.workspaceId,
          template: process.env.DAYTONA_SNAPSHOT_NAME || 'butlerjake/pithy-jaunt-daytona:v1.0.2',
          assignedTasks: [task._id],
        }
      )

      // Assign workspace to task
      await convexClient.mutation(api.workspaces.assignTaskToWorkspace, {
        workspaceId,
        taskId: task._id,
      })

      // Update task with workspace ID and branch name
      await convexClient.mutation(api.tasks.updateTaskWorkspace, {
        taskId: task._id,
        assignedWorkspaceId: workspace.workspaceId,
        branchName: `pj/${task._id}`,
      })

      // Only now mark task as running - workspace is created and script is executing
      await convexClient.mutation(api.tasks.updateTaskStatus, {
        taskId: task._id,
        status: 'running',
      })

      return NextResponse.json(
        {
          taskId: task._id,
          status: 'running',
          workspaceId: workspace.workspaceId,
        },
        { status: 202 }
      )
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Workspace creation error:', errorMessage)
      
      // Capture error in Sentry with context
      const errorToCapture = error instanceof Error ? error : new Error(String(error));
      captureError(errorToCapture, {
        taskId: task._id,
        repoId: task.repoId,
        userId: convexUser._id,
        operation: 'workspace_creation',
      })

      // Update task status to failed
      await convexClient.mutation(api.tasks.updateTaskStatus, {
        taskId: task._id,
        status: 'failed',
      })

      const err = error instanceof Error ? error : { message: String(error) };
      return NextResponse.json(
        {
          error: 'Failed to create workspace',
          details: err.message || 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Task execution error:', errorMessage)
    
    // Capture error in Sentry
    const { taskId } = await params
    const errorToCapture = error instanceof Error ? error : new Error(String(error));
    captureError(errorToCapture, {
      taskId,
      operation: 'task_execution',
    })
    
    const err = error instanceof Error ? error : { message: String(error) };
    return NextResponse.json(
      { 
        error: 'Failed to execute task',
        details: err.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

