import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'

export const Route = createFileRoute('/api/workspace')({
  server: {
    handlers: {
      GET: async ({ request }) => {
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

          // Get all tasks for user to find associated workspaces
          const tasks = await convexClient.query(api.tasks.getTasksByUser, {
            userId: convexUser._id,
          })

          // Get unique workspace IDs from tasks
          const workspaceIds = new Set<string>()
          tasks.forEach((task) => {
            if (task.assignedWorkspaceId) {
              workspaceIds.add(task.assignedWorkspaceId)
            }
          })

          // Fetch workspaces by Daytona ID
          const workspaces = []
          for (const daytonaId of workspaceIds) {
            const workspace = await convexClient.query(
              api.workspaces.getWorkspaceByDaytonaId,
              { daytonaId }
            )
            if (workspace) {
              workspaces.push(workspace)
            }
          }

          // Parse query parameters
          const url = new URL(request.url)
          const status = url.searchParams.get('status')

          // Filter by status if provided
          let filteredWorkspaces = workspaces
          if (status) {
            filteredWorkspaces = workspaces.filter((ws) => ws.status === status)
          }

          // Format response
          const formattedWorkspaces = filteredWorkspaces.map((ws) => ({
            workspaceId: ws._id,
            daytonaId: ws.daytonaId,
            template: ws.template,
            status: ws.status,
            assignedTasks: ws.assignedTasks,
            createdAt: ws.createdAt,
            lastUsedAt: ws.lastUsedAt,
          }))

          return Response.json(
            { workspaces: formattedWorkspaces },
            { status: 200 }
          )
        } catch (error: any) {
          console.error('Error fetching workspaces:', error)
          return Response.json(
            { error: 'Failed to fetch workspaces' },
            { status: 500 }
          )
        }
      },
    },
  },
})

