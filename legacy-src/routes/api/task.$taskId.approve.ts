import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { createGitHubClient } from '@/lib/github/client'

export const Route = createFileRoute('/api/task/$taskId/approve')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { taskId } = params
          
          // Get authenticated user
          const supabase = createClient(request)
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          // Get user from Convex
          const convexUser = await convexClient.query(
            api.users.getUserBySupabaseId,
            { supabaseUserId: user.id }
          )

          if (!convexUser) {
            return Response.json(
              { error: 'User not found in database' },
              { status: 404 }
            )
          }

          // Get task
          const task = await convexClient.query(api.tasks.getTaskById, {
            taskId: taskId as Id<'tasks'>,
          })

          if (!task) {
            return Response.json(
              { error: 'Task not found' },
              { status: 404 }
            )
          }

          // Verify user owns the task
          if (task.userId !== convexUser._id) {
            return Response.json(
              { error: 'Forbidden: You don\'t have access to this task' },
              { status: 403 }
            )
          }

          // Check if task is completed
          if (task.status !== 'completed') {
            return Response.json(
              {
                error: `Task cannot be approved. Current status: ${task.status}`,
              },
              { status: 400 }
            )
          }

          if (!task.prUrl) {
            return Response.json(
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
            return Response.json(
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
            return Response.json(
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

            return Response.json(
              {
                taskId: task._id,
                merged: true,
                prUrl: task.prUrl,
              },
              { status: 200 }
            )
          } catch (error: any) {
            console.error('PR merge error:', error)
            
            if (error.status === 405) {
              return Response.json(
                { error: 'PR cannot be merged (may have conflicts or checks failing)' },
                { status: 400 }
              )
            }

            return Response.json(
              { error: 'Failed to merge PR' },
              { status: 500 }
            )
          }
        } catch (error: any) {
          console.error('Task approval error:', error)
          return Response.json(
            { error: 'Failed to approve task' },
            { status: 500 }
          )
        }
      },
    },
  },
})

