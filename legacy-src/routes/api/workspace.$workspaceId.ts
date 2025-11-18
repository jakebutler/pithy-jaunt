import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { getWorkspaceStatus } from '@/lib/daytona/client'

export const Route = createFileRoute('/api/workspace/$workspaceId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { workspaceId } = params

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

          // Get workspace
          const workspace = await convexClient.query(
            api.workspaces.getWorkspaceById,
            {
              workspaceId: workspaceId as Id<'workspaces'>,
            }
          )

          if (!workspace) {
            return Response.json(
              { error: 'Workspace not found' },
              { status: 404 }
            )
          }

          // Verify user has access (through tasks)
          const userTasks = await convexClient.query(api.tasks.getTasksByUser, {
            userId: convexUser._id,
          })

          const hasAccess = workspace.assignedTasks.some((taskId) =>
            userTasks.some((task) => task._id === taskId)
          )

          if (!hasAccess) {
            return Response.json(
              { error: 'Forbidden: You don\'t have access to this workspace' },
              { status: 403 }
            )
          }

          // Get latest status from Daytona if configured
          let daytonaStatus = null
          try {
            if (process.env.DAYTONA_API_KEY) {
              daytonaStatus = await getWorkspaceStatus(workspace.daytonaId)
            }
          } catch (error) {
            // If Daytona API fails, use cached status
            console.warn('Failed to fetch Daytona status:', error)
          }

          // Calculate uptime
          const uptime = Date.now() - workspace.createdAt

          // Format response
          return Response.json(
            {
              workspaceId: workspace._id,
              daytonaId: workspace.daytonaId,
              template: workspace.template,
              status: daytonaStatus?.status || workspace.status,
              assignedTasks: workspace.assignedTasks,
              createdAt: workspace.createdAt,
              lastUsedAt: workspace.lastUsedAt,
              uptimeMs: uptime,
            },
            { status: 200 }
          )
        } catch (error: any) {
          console.error('Error fetching workspace:', error)
          return Response.json(
            { error: 'Failed to fetch workspace' },
            { status: 500 }
          )
        }
      },
    },
  },
})
