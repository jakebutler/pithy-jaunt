import { createFileRoute, Link, redirect, notFound } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { GitIngestReport } from '@/components/repos/GitIngestReport'
import { ExternalLink } from '@/components/ui/ExternalLink'

export const Route = createFileRoute('/repos/$repoId')({
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
          returnTo: `/repos/${repoId}`,
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

    // Fetch tasks for this repository
    const tasksResult = await convexClient.query(api.tasks.getTasksByRepo, {
      repoId: repo._id,
    })
    const tasks = Array.isArray(tasksResult) ? tasksResult : []

    return {
      user: {
        email: user.email,
      },
      repo,
      tasks,
    }
  },
  component: RepoDetailPage,
})

function RepoDetailPage() {
  const { user, repo, tasks } = Route.useLoaderData()

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
              <span className="text-sm font-medium text-gray-900">
                {repo.owner}/{repo.name}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/repos"
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Back to Repositories
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
          {/* Repository Header */}
          <div className="bg-white shadow rounded-lg mb-6 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {repo.owner}/{repo.name}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <ExternalLink href={repo.url} className="text-blue-600 hover:text-blue-800">
                    {repo.url}
                  </ExternalLink>
                  <span>Branch: {repo.branch}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/repos/$repoId/tasks/new"
                  params={{ repoId: repo._id }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Task
                </Link>
              </div>
            </div>
          </div>

          {/* GitIngest Report */}
          <div className="bg-white shadow rounded-lg mb-6 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Code Analysis Report
            </h2>
            <GitIngestReport
              repoId={repo._id}
              status={repo.gitingestReportStatus || 'pending'}
              report={repo.gitingestReport as any}
              error={repo.gitingestReportError}
            />
          </div>

          {/* Tasks List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Tasks ({tasks.length})
                </h2>
                <Link
                  to="/repos/$repoId/tasks/new"
                  params={{ repoId: repo._id }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Create New Task
                </Link>
              </div>
            </div>
            <div className="p-6">
              {tasks.length === 0 ? (
                <div className="text-center py-12">
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No tasks yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first task for this repository
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/repos/$repoId/tasks/new"
                      params={{ repoId: repo._id }}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Create Task
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task: any) => (
                    <Link
                      key={task._id}
                      to="/tasks/$taskId"
                      params={{ taskId: task._id }}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-base font-medium text-gray-900">
                            {task.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>
                              Created: {new Date(task.createdAt).toLocaleString()}
                            </span>
                            {task.initiator === 'coderabbit' && (
                              <span className="text-purple-600">From CodeRabbit</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              task.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : task.status === 'running'
                                ? 'bg-blue-100 text-blue-800'
                                : task.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : task.status === 'needs_review'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {task.status}
                          </span>
                          {task.prUrl && (
                            <ExternalLink
                              href={task.prUrl}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              View PR
                            </ExternalLink>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

