import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { createGitHubClient } from '@/lib/github/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    
    // Get authenticated user
    const supabase = createClient()
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

    // Check if task is completed
    if (task.status !== 'completed') {
      return NextResponse.json(
        {
          error: `Task cannot be approved. Current status: ${task.status}`,
        },
        { status: 400 }
      )
    }

    if (!task.prUrl) {
      return NextResponse.json(
        { error: 'No PR URL found for this task' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { mergeMethod = 'merge' } = body

    // Extract PR number from URL
    const prMatch = task.prUrl.match(/\/pull\/(\d+)/)
    if (!prMatch) {
      return NextResponse.json(
        { error: 'Invalid PR URL format' },
        { status: 400 }
      )
    }

    const prNumber = parseInt(prMatch[1])

    // Get repository info
    const repo = await convexClient.query(api.repos.getRepoById, {
      repoId: task.repoId,
    })

    if (!repo) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      )
    }

    // Merge PR using GitHub API
    try {
      const octokit = createGitHubClient()
      await octokit.pulls.merge({
        owner: repo.owner,
        repo: repo.name,
        pull_number: prNumber,
        merge_method: mergeMethod as 'merge' | 'squash' | 'rebase',
      })

      return NextResponse.json(
        {
          taskId: task._id,
          merged: true,
          prUrl: task.prUrl,
        },
        { status: 200 }
      )
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      console.error('PR merge error:', err.message || String(error))
      
      if (err.status === 405) {
        return NextResponse.json(
          { error: 'PR cannot be merged (may have conflicts or checks failing)' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to merge PR' },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Task approval error:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to approve task' },
      { status: 500 }
    )
  }
}

