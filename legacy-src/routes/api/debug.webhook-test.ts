import { createFileRoute } from '@tanstack/react-router'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

export const Route = createFileRoute('/api/debug/webhook-test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { taskId, workspaceId, prUrl, status } = body

          console.log('[DEBUG WEBHOOK] Received:', {
            taskId,
            workspaceId,
            prUrl,
            status,
          })

          // Find workspace
          const workspace = await convexClient.query(
            api.workspaces.getWorkspaceByDaytonaId,
            { daytonaId: workspaceId }
          )

          console.log('[DEBUG WEBHOOK] Workspace found:', !!workspace)

          if (!workspace) {
            return Response.json(
              {
                success: false,
                error: 'Workspace not found',
                workspaceId,
              },
              { status: 404 }
            )
          }

          console.log('[DEBUG WEBHOOK] Workspace details:', {
            id: workspace._id,
            daytonaId: workspace.daytonaId,
            assignedTasks: workspace.assignedTasks,
          })

          // Check if task is assigned to workspace
          const taskIncluded = workspace.assignedTasks.includes(
            taskId as Id<'tasks'>
          )
          console.log('[DEBUG WEBHOOK] Task included in workspace:', taskIncluded)

          if (!taskIncluded) {
            return Response.json(
              {
                success: false,
                error: 'Task not assigned to this workspace',
                taskId,
                workspaceId,
                assignedTasks: workspace.assignedTasks,
              },
              { status: 400 }
            )
          }

          const branchName = `pj/${taskId}`

          // Update task with results
          await convexClient.mutation(api.tasks.updateTaskWorkspace, {
            taskId: taskId as Id<'tasks'>,
            branchName,
            prUrl,
          })

          console.log('[DEBUG WEBHOOK] Task workspace updated')

          // Update task status
          await convexClient.mutation(api.tasks.updateTaskStatus, {
            taskId: taskId as Id<'tasks'>,
            status: status === 'success' ? 'completed' : 'failed',
          })

          console.log(
            '[DEBUG WEBHOOK] Task status updated to:',
            status === 'success' ? 'completed' : 'failed'
          )

          return Response.json(
            {
              success: true,
              taskId,
              workspaceId,
              prUrl,
              status: status === 'success' ? 'completed' : 'failed',
            },
            { status: 200 }
          )
        } catch (error: any) {
          console.error('[DEBUG WEBHOOK] Error:', error)
          return Response.json(
            {
              success: false,
              error: error.message,
              stack: error.stack,
            },
            { status: 500 }
          )
        }
      },
    },
  },
})
