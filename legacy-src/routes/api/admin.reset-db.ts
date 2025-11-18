import { createFileRoute } from '@tanstack/react-router'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'

export const Route = createFileRoute('/api/admin/reset-db')({
  server: {
    handlers: {
      DELETE: async () => {
        // Simple safety check - only allow in development
        if (process.env.NODE_ENV === 'production') {
          return Response.json(
            { error: 'Not allowed in production' },
            { status: 403 }
          )
        }

        try {
          console.log('[ADMIN] Resetting database...')

          // Delete all tasks
          const taskResult = await convexClient.mutation(
            api.tasks.deleteAllTasks,
            {}
          )
          console.log(`[ADMIN] Deleted ${taskResult.deleted} tasks`)

          // Delete all workspaces
          const workspaceResult = await convexClient.mutation(
            api.workspaces.deleteAllWorkspaces,
            {}
          )
          console.log(
            `[ADMIN] Deleted ${workspaceResult.deleted} workspaces`
          )

          return Response.json({
            success: true,
            tasksDeleted: taskResult.deleted,
            workspacesDeleted: workspaceResult.deleted,
          })
        } catch (error: any) {
          console.error('[ADMIN] Reset error:', error)
          return Response.json(
            { error: 'Failed to reset database', details: error.message },
            { status: 500 }
          )
        }
      },
    },
  },
})
