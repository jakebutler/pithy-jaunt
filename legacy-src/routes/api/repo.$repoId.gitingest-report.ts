import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { triggerGitIngestReport } from '@/lib/gitingest/client'

export const Route = createFileRoute('/api/repo/$repoId/gitingest-report')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { repoId } = params

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

          // Get repository
          const repo = await convexClient.query(api.repos.getRepoById, {
            repoId: repoId as Id<'repos'>,
          })

          if (!repo) {
            return Response.json(
              { error: 'Repository not found' },
              { status: 404 }
            )
          }

          // Verify ownership
          if (repo.userId !== convexUser._id) {
            return Response.json({ error: 'Forbidden' }, { status: 403 })
          }

          // Return report data
          return Response.json({
            status: repo.gitingestReportStatus,
            report: repo.gitingestReport || null,
            generatedAt: repo.gitingestReportGeneratedAt || null,
            error: repo.gitingestReportError || null,
          })
        } catch (error: any) {
          console.error('Error fetching GitIngest report:', error)
          return Response.json(
            { error: 'Failed to fetch report' },
            { status: 500 }
          )
        }
      },
      POST: async ({ request, params }) => {
        try {
          const { repoId } = params

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

          // Get repository
          const repo = await convexClient.query(api.repos.getRepoById, {
            repoId: repoId as Id<'repos'>,
          })

          if (!repo) {
            return Response.json(
              { error: 'Repository not found' },
              { status: 404 }
            )
          }

          // Verify ownership
          if (repo.userId !== convexUser._id) {
            return Response.json({ error: 'Forbidden' }, { status: 403 })
          }

          // Check if already processing
          if (repo.gitingestReportStatus === 'processing') {
            return Response.json(
              { error: 'Report generation already in progress' },
              { status: 409 }
            )
          }

          // Trigger report generation
          try {
            const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
            const callbackUrl = `${appUrl}/api/repo/gitingest-callback`

            // Update status to processing
            await convexClient.mutation(api.repos.updateGitIngestReport, {
              repoId: repo._id,
              status: 'processing',
            })

            // Trigger GitIngest service
            await triggerGitIngestReport({
              repoUrl: repo.url,
              branch: repo.branch,
              callbackUrl,
            })

            return Response.json({
              success: true,
              message: 'Report generation started',
            })
          } catch (error: any) {
            // Update status to failed
            await convexClient.mutation(api.repos.updateGitIngestReport, {
              repoId: repo._id,
              status: 'failed',
              error: error.message || 'Failed to trigger report generation',
            })

            throw error
          }
        } catch (error: any) {
          console.error('Error triggering GitIngest report:', error)
          return Response.json(
            { error: 'Failed to trigger report generation' },
            { status: 500 }
          )
        }
      },
    },
  },
})

