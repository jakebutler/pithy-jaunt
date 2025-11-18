import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'

export const Route = createFileRoute('/api/debug/delete-all-tasks')({
  server: {
    handlers: {
      DELETE: async ({ request }) => {
        try {
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

          // Delete all tasks for user
          const taskResult = await convexClient.mutation(
            api.tasks.deleteAllTasksForUser,
            { userId: convexUser._id }
          )

          // Delete all workspaces
          const workspaceResult = await convexClient.mutation(
            api.workspaces.deleteAllWorkspaces,
            {}
          )

          return Response.json({
            success: true,
            tasksDeleted: taskResult.deleted,
            workspacesDeleted: workspaceResult.deleted,
          })
        } catch (error: any) {
          console.error('Delete all tasks error:', error)
          return Response.json(
            { error: 'Failed to delete tasks', details: error.message },
            { status: 500 }
          )
        }
      },
    },
  },
})
