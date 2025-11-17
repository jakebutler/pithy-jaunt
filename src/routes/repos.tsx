import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { RepoConnectForm } from '@/components/repos/RepoConnectForm'
import { RepoCard } from '@/components/repos/RepoCard'

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-xl font-bold">
                Pithy Jaunt
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <span className="text-sm text-gray-700">{user.email}</span>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Repositories
            </h1>
            <p className="text-gray-600">
              Connect GitHub repositories to analyze code and generate tasks
            </p>
          </div>

          {/* Connect Repository Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Connect a Repository
            </h2>
            <RepoConnectForm />
          </div>

          {/* Repository List */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Connected Repositories ({repos.length})
            </h2>

            {repos.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No repositories connected
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by connecting your first repository above
                </p>
              </div>
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
        </div>
      </main>
    </div>
  )
}

