import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'

export const Route = createFileRoute('/api/repo')({
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

          // Fetch user's repositories
          const reposResult = await convexClient.query(api.repos.getReposByUser, {
            userId: convexUser._id,
          })
          const repos = Array.isArray(reposResult) ? reposResult : []

          // Format response
          const formattedRepos = repos.map((repo: any) => ({
            id: repo._id,
            url: repo.url,
            owner: repo.owner,
            name: repo.name,
            branch: repo.branch,
            status: repo.analyzerStatus,
            coderabbitDetected: repo.coderabbitDetected,
            lastAnalyzedAt: repo.lastAnalyzedAt,
            createdAt: repo.createdAt,
          }))

          return Response.json({ repos: formattedRepos }, { status: 200 })
        } catch (error: any) {
          console.error('Error fetching repositories:', error)
          return Response.json(
            { error: 'Failed to fetch repositories' },
            { status: 500 }
          )
        }
      },
    },
  },
})

