import { createFileRoute, Link, redirect, notFound } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { TaskCreateForm } from '@/components/tasks/TaskCreateForm'

export const Route = createFileRoute('/repos/$repoId/tasks/new')({
  loader: async ({ context, params }) => {
    const { repoId } = params
    const request = context.request
    
    const supabase = createClient(request)
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw redirect({
        to: '/login',
        search: {
          returnTo: `/repos/${repoId}/tasks/new`,
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

    // Fetch repository
    const repo = await convexClient.query(api.repos.getRepoById, {
      repoId: repoId as Id<'repos'>,
    })

    if (!repo) {
      throw notFound()
    }

    // Verify user owns the repository
    if (repo.userId !== convexUser._id) {
      throw redirect({ to: '/repos' })
    }

    return {
      user: {
        email: user.email,
      },
      repo,
    }
  },
  component: CreateTaskPage,
})

function CreateTaskPage() {
  const { user, repo } = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-xl font-bold">
                Pithy Jaunt
              </Link>
              <span className="text-gray-400">/</span>
              <Link to="/repos" className="text-sm text-gray-700 hover:text-gray-900">
                Repositories
              </Link>
              <span className="text-gray-400">/</span>
              <Link
                to="/repos/$repoId"
                params={{ repoId: repo._id }}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                {repo.owner}/{repo.name}
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-sm font-medium text-gray-900">New Task</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/repos/$repoId"
                params={{ repoId: repo._id }}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
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

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create New Task
            </h1>
            <p className="text-gray-600">
              Create a task for {repo.owner}/{repo.name}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <TaskCreateForm
              repoId={repo._id}
              repoName={`${repo.owner}/${repo.name}`}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

