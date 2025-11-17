import { createFileRoute } from '@tanstack/react-router'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { GitIngestWebhookPayload } from '@/lib/gitingest/client'
import { fetchRepositoryMetadata } from '@/lib/github/metadata'

export const Route = createFileRoute('/api/repo/gitingest-callback')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload: GitIngestWebhookPayload = await request.json()

          // Validate payload
          if (!payload.jobId || !payload.repoUrl || !payload.status) {
            return Response.json(
              { error: 'Invalid payload: missing required fields' },
              { status: 400 }
            )
          }

          // Find repository by URL
          const metadata = await fetchRepositoryMetadata(payload.repoUrl)
          const repo = await convexClient.query(api.repos.getRepoByOwnerAndName, {
            owner: metadata.owner,
            name: metadata.name,
          })

          if (!repo) {
            console.error(
              `GitIngest callback: Repository not found for ${payload.repoUrl}`
            )
            return Response.json(
              { error: 'Repository not found' },
              { status: 404 }
            )
          }

          // Update repository with report results
          if (payload.status === 'completed' && payload.report) {
            await convexClient.mutation(api.repos.updateGitIngestReport, {
              repoId: repo._id,
              status: 'completed',
              report: payload.report,
            })
          } else if (payload.status === 'failed') {
            await convexClient.mutation(api.repos.updateGitIngestReport, {
              repoId: repo._id,
              status: 'failed',
              error: payload.error || 'Report generation failed',
            })
          }

          return Response.json({ success: true })
        } catch (error: any) {
          console.error('GitIngest callback error:', error)

          // Return 200 to acknowledge receipt even on error
          // (GitIngest service will retry if we return error status)
          return Response.json(
            { error: 'Internal server error' },
            { status: 200 }
          )
        }
      },
    },
  },
})

