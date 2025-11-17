import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

export const Route = createFileRoute('/api/task/$taskId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
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

          // Format response
          return Response.json(
            {
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
              logsUrl: `/api/task/${task._id}/logs`,
              createdAt: task.createdAt,
              updatedAt: task.updatedAt,
            },
            { status: 200 }
          )
        } catch (error: any) {
          console.error('Error fetching task:', error)
          return Response.json(
            { error: 'Failed to fetch task' },
            { status: 500 }
          )
        }
      },
    },
  },
})

