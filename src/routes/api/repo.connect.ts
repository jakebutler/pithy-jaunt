import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { validateRepository } from '@/lib/github/validation'
import { fetchRepositoryMetadata } from '@/lib/github/metadata'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { triggerGitIngestReport } from '@/lib/gitingest/client'
import { Id } from '@/convex/_generated/dataModel'

export const Route = createFileRoute('/api/repo/connect')({
  server: {
    handlers: {
      POST: async ({ request }) => {
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

          // Parse request body
          const { repoUrl, branch } = await request.json()

          if (!repoUrl) {
            return Response.json(
              { error: 'Repository URL is required' },
              { status: 400 }
            )
          }

          // Validate repository
          let validation
          try {
            validation = await validateRepository(repoUrl)
          } catch (error: any) {
            if (error.status === 403) {
              return Response.json(
                {
                  error:
                    'GitHub API rate limit exceeded. Please try again in a few minutes.',
                },
                { status: 429 }
              )
            }
            throw error
          }
          
          const targetBranch = branch || validation.defaultBranch

          // Check for duplicate connection
          const metadata = await fetchRepositoryMetadata(repoUrl)
          
          const existingRepo = await convexClient.query(
            api.repos.getRepoByUrlAndUser,
            {
              userId: convexUser._id,
              url: metadata.url,
            }
          )

          if (existingRepo) {
            return Response.json(
              {
                error: 'Repository already connected',
                repoId: existingRepo._id,
              },
              { status: 409 }
            )
          }

          // Create repository record in Convex
          const repoId = await convexClient.mutation(api.repos.createRepo, {
            userId: convexUser._id,
            url: metadata.url,
            owner: metadata.owner,
            name: metadata.name,
            branch: targetBranch,
            coderabbitDetected: false,
          })

          if (!repoId || typeof repoId !== 'string') {
            throw new Error('Failed to create repository: invalid ID returned')
          }

          // Trigger GitIngest report generation asynchronously
          try {
            const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
            const callbackUrl = `${appUrl}/api/repo/gitingest-callback`

            await convexClient.mutation(api.repos.updateGitIngestReport, {
              repoId: repoId as Id<'repos'>,
              status: 'processing',
            })

            await triggerGitIngestReport({
              repoUrl: metadata.url,
              branch: targetBranch,
              callbackUrl,
            })
          } catch (error) {
            console.error('Error triggering GitIngest report generation:', error)
            try {
              await convexClient.mutation(api.repos.updateGitIngestReport, {
                repoId: repoId as Id<'repos'>,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
              })
            } catch (updateError) {
              console.error('Failed to update GitIngest status:', updateError)
            }
          }

          return Response.json(
            {
              repoId,
              repoUrl: metadata.url,
              status: 'connected',
              next: `/repos/${repoId}`,
            },
            { status: 202 }
          )
        } catch (error: any) {
          console.error('Repository connection error:', error)

          if (error.message.includes('Invalid GitHub repository URL')) {
            return Response.json(
              { error: 'Invalid repository URL format' },
              { status: 400 }
            )
          }

          if (error.message.includes('Private repositories')) {
            return Response.json(
              { error: 'Private repositories are not supported in MVP' },
              { status: 403 }
            )
          }

          if (error.message.includes('not found')) {
            return Response.json(
              { error: 'Repository not found' },
              { status: 404 }
            )
          }

          if (error.message.includes('already connected')) {
            return Response.json(
              { error: error.message },
              { status: 409 }
            )
          }

          return Response.json(
            { error: 'Failed to connect repository' },
            { status: 500 }
          )
        }
      },
    },
  },
})

