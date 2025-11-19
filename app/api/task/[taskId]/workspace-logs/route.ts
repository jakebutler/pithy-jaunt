import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { createClientWithToken } from '@/lib/auth/supabase-server-with-token'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { getWorkspaceLogs, getWorkspaceExecutionStatus } from '@/lib/daytona/get-logs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    // Support both cookie-based and Bearer token authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : undefined

    // Get authenticated user (using token if provided, otherwise cookies)
    let supabase
    let user
    
    try {
      if (token) {
        const result = await createClientWithToken(token)
        supabase = result.client
        user = result.user
      } else {
        supabase = await createClient()
        const result = await supabase.auth.getUser()
        user = result.data.user
      }
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : String(authError)
      console.error('Authentication error:', errorMessage)
      return NextResponse.json({ error: 'Unauthorized', details: errorMessage }, { status: 401 })
    }

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

    // Get workspace ID
    const workspaceId = task.assignedWorkspaceId
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Task has no assigned workspace' },
        { status: 404 }
      )
    }

    // Get max lines from query params
    const searchParams = request.nextUrl.searchParams
    const maxLines = parseInt(searchParams.get('maxLines') || '1000', 10)

    // Get logs from workspace
    const logsResult = await getWorkspaceLogs({
      workspaceId,
      taskId: task._id,
      maxLines,
    })

    // Get execution status
    const statusResult = await getWorkspaceExecutionStatus(workspaceId, task._id)

    return NextResponse.json({
      logs: logsResult.logs,
      status: statusResult,
      sessionId: logsResult.sessionId,
      error: logsResult.error,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error getting workspace logs:', errorMessage)
    return NextResponse.json(
      { error: `Failed to get workspace logs: ${errorMessage}` },
      { status: 500 }
    )
  }
}

