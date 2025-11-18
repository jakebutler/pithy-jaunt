import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { RepoConnectForm } from '@/components/repos/RepoConnectForm'
import { RepoCard } from '@/components/repos/RepoCard'
import { Layout } from '@/components/ui/layout'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/repos')({
  loader: async ({ context }) => {
    const request = context.request
    const supabase = createClient(request)
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw redirect({
        to: '/login',
        search: {
          returnTo: '/repos',
        },
      })
    }

    // Get user from Convex
    const convexUser = await convexClient.query(
      api.users.getUserBySupabaseId,
      { supabaseUserId: user.id }
    )

    if (!convexUser) {
      throw redirect({ to: '/login' })
    }

    // Fetch user's repositories
    const repos = await convexClient.query(api.repos.getReposByUser, {
      userId: convexUser._id,
    })

    return {
      user: {
        email: user.email,
      },
      repos: Array.isArray(repos) ? repos : [],
    }
  },
  component: ReposPage,
})

function ReposPage() {
  const { user, repos } = Route.useLoaderData()

  return (
    <Layout userEmail={user.email}>
      <PageHeader
        title="Repositories"
        description="Connect GitHub repositories to analyze code and generate tasks"
      />

          {/* Connect Repository Form */}
          <Card className="mb-8">
            <CardBody>
              <h2 className="text-h3 text-neutral-dark mb-4">
                Connect a Repository
              </h2>
              <RepoConnectForm />
            </CardBody>
          </Card>

          {/* Repository List */}
          <div>
            <h2 className="text-h3 text-neutral-dark mb-4">
              Connected Repositories ({repos.length})
            </h2>

            {repos.length === 0 ? (
              <EmptyState
                icon={
                  <svg
                    className="mx-auto h-12 w-12 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                }
                title="No repositories connected"
                description="Get started by connecting your first repository above"
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {repos.map((repo: any) => (
                  <RepoCard
                    key={repo._id}
                    id={repo._id}
                    name={repo.name}
                    owner={repo.owner}
                    url={repo.url}
                    status={repo.analyzerStatus}
                    lastAnalyzedAt={repo.lastAnalyzedAt}
                    coderabbitDetected={repo.coderabbitDetected}
                  />
                ))}
              </div>
            )}
          </div>
    </Layout>
  )
}

