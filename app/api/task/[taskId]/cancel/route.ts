import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { terminateWorkspace, isDaytonaConfigured } from '@/lib/daytona/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    
    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from Convex
    const convexUser = await convexClient.query(
      api.users.getUserBySupabaseId,
      { supabaseUserId: user.id }
    )

    if (!convexUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }

    // Get task
    const task = await convexClient.query(api.tasks.getTaskById, {
      taskId: taskId as Id<'tasks'>,
    })

    if (!task) {
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

    // Check if task can be cancelled
    if (task.status === 'completed' || task.status === 'cancelled') {
      return NextResponse.json(
        {
          error: `Task cannot be cancelled. Current status: ${task.status}`,
        },
        { status: 400 }
      )
    }

    // Parse request body (optional)
    let shouldTerminate = false
    try {
      const contentType = request.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const body = await request.json()
        shouldTerminate = body.terminateWorkspace || false
      }
    } catch {
      // Empty body or invalid JSON is fine, use defaults
    }

    // Terminate Daytona workspace if requested and configured
    if (shouldTerminate && task.assignedWorkspaceId && isDaytonaConfigured()) {
      try {
        await terminateWorkspace(task.assignedWorkspaceId)

        // Update workspace status in Convex
        const workspace = await convexClient.query(
          api.workspaces.getWorkspaceByDaytonaId,
          { daytonaId: task.assignedWorkspaceId }
        )

        if (workspace) {
          await convexClient.mutation(api.workspaces.updateWorkspaceStatus, {
            workspaceId: workspace._id,
            status: 'terminated',
          })
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to terminate workspace:', errorMessage)
        // Continue with task cancellation even if workspace termination fails
      }
    }

    // Update task status to cancelled
    await convexClient.mutation(api.tasks.updateTaskStatus, {
      taskId: task._id,
      status: 'cancelled',
    })

    return NextResponse.json(
      {
        taskId: task._id,
        status: 'cancelled',
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Task cancellation error:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to cancel task' },
      { status: 500 }
    )
  }
}

