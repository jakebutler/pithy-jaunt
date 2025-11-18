import { createFileRoute } from '@tanstack/react-router'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

export const Route = createFileRoute('/api/admin/cancel-task/$taskId')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        // Only allow in development
        if (process.env.NODE_ENV === 'production') {
          return Response.json(
            { error: 'Not allowed in production' },
            { status: 403 }
          )
        }

        try {
          const { taskId } = params

          // Update task status to cancelled
          await convexClient.mutation(api.tasks.updateTaskStatus, {
            taskId: taskId as Id<'tasks'>,
            status: 'cancelled',
          })

          return Response.json({
            success: true,
            taskId,
            status: 'cancelled',
          })
        } catch (error: any) {
          console.error('Admin cancel error:', error)
          return Response.json(
            { error: 'Failed to cancel task', details: error.message },
            { status: 500 }
          )
        }
      },
    },
  },
})
