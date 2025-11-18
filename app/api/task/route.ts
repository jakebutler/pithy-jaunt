import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const { repoId, title, description, priority, modelPreference } =
      await request.json()

    // Validate required fields
    if (!repoId || !title || !description) {
      return NextResponse.json(
        { error: 'repoId, title, and description are required' },
        { status: 400 }
      )
    }

    // Verify repository exists and user owns it
    const repo = await convexClient.query(api.repos.getRepoById, {
      repoId: repoId as Id<'repos'>,
    })

    if (!repo) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      )
    }

    if (repo.userId !== convexUser._id) {
      return NextResponse.json(
        { error: 'Forbidden: You don\'t have access to this repository' },
        { status: 403 }
      )
    }

    // Create task in Convex
    const taskId = await convexClient.mutation(api.tasks.createTask, {
      userId: convexUser._id,
      repoId: repoId as Id<'repos'>,
      title,
      description,
      priority: priority || 'normal',
      initiator: 'user',
      modelPreference,
    })

    // Return success response
    return NextResponse.json(
      {
        taskId,
        status: 'queued',
        assignedWorkspace: null,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Task creation error:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const repoId = searchParams.get('repoId')
    const status = searchParams.get('status')

    // Fetch tasks
    let tasks
    if (repoId) {
      tasks = await convexClient.query(api.tasks.getTasksByRepo, {
        repoId: repoId as Id<'repos'>,
      })
    } else {
      tasks = await convexClient.query(api.tasks.getTasksByUser, {
        userId: convexUser._id,
      })
    }

    // Filter by status if provided
    if (status) {
      tasks = tasks.filter((task) => task.status === status)
    }

    // Format response
    const formattedTasks = tasks.map((task) => ({
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
    }))

    return NextResponse.json({ tasks: formattedTasks }, { status: 200 })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching tasks:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

