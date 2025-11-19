import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { createClientWithToken } from '@/lib/auth/supabase-server-with-token'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
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

    const { taskId } = await params

    // Fetch task
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

    // Format response
    const formattedTask = {
      taskId: task._id,
      repoId: task.repoId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      initiator: task.initiator,
      assignedWorkspaceId: task.assignedWorkspaceId,
      branchName: task.branchName,
      prUrl: task.prUrl,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }

    return NextResponse.json(formattedTask, { status: 200 })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error fetching task:', errorMessage, errorStack)
    return NextResponse.json(
      { 
        error: 'Failed to fetch task',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

