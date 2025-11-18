import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Layout } from '@/components/ui/layout'
import { Navigation } from '@/components/ui/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/dashboard')({
  loader: async ({ context }) => {
    console.log('[Dashboard] Loader running', { hasRequest: !!context.request });
    // Get request from context - only check auth on server-side
    const request = context.request
    if (!request) {
      console.log('[Dashboard] No request (client-side), returning empty data');
      // On client-side navigation, return empty data and let the component handle auth
      // This prevents reload loops when navigating after login/signup
      return {
        user: null,
        convexUser: null,
        repos: [],
        tasks: [],
        stats: {
          totalRepos: 0,
          totalTasks: 0,
          activeTasks: 0,
          completedTasks: 0,
        },
      }
    }
    
    console.log('[Dashboard] Server-side loader, checking auth');

    const supabase = createClient(request)
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw redirect({
        to: '/login',
        search: {
          returnTo: '/dashboard',
        },
      })
    }

    // Get user from Convex, create if doesn't exist
    let convexUser = await convexClient.query(
      api.users.getUserBySupabaseId,
      { supabaseUserId: user.id }
    )

    // If user doesn't exist in Convex, create them
    if (!convexUser) {
      try {
        await convexClient.mutation(api.users.upsertUser, {
          supabaseUserId: user.id,
          email: user.email || '',
        })
        // Fetch the newly created user
        convexUser = await convexClient.query(
          api.users.getUserBySupabaseId,
          { supabaseUserId: user.id }
        )
        if (!convexUser) {
          throw new Error('Failed to create or retrieve Convex user')
        }
      } catch (error) {
        console.error('Error creating Convex user:', error)
        throw error
      }
    }

    // Fetch user's repositories
    const reposResult = await convexClient.query(api.repos.getReposByUser, {
      userId: convexUser._id,
    })
    const repos = Array.isArray(reposResult) ? reposResult : []

    // Fetch user's tasks
    const tasksResult = await convexClient.query(api.tasks.getTasksByUser, {
      userId: convexUser._id,
    })
    const tasks = Array.isArray(tasksResult) ? tasksResult : []

    // Calculate statistics
    const stats = {
      totalRepos: repos.length,
      totalTasks: tasks.length,
      tasksByStatus: {
        queued: tasks.filter((t) => t.status === 'queued').length,
        running: tasks.filter((t) => t.status === 'running').length,
        completed: tasks.filter((t) => t.status === 'completed').length,
        failed: tasks.filter((t) => t.status === 'failed').length,
        needsReview: tasks.filter((t) => t.status === 'needs_review').length,
      },
    }

    // Get recent tasks
    const recentTasks = tasks
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)

    // Calculate task statistics per repository
    const repoStats = repos.map((repo) => {
      const repoTasks = tasks.filter((task) => task.repoId === repo._id)
      return {
        repo,
        stats: {
          successful: repoTasks.filter((t) => t.status === 'completed').length,
          failed: repoTasks.filter((t) => t.status === 'failed').length,
          notStarted: repoTasks.filter((t) => t.status === 'queued').length,
        },
      }
    })

    return {
      user: {
        email: user.email,
      },
      repos,
      tasks,
      stats,
      recentTasks,
      repoStats,
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { user, repos, stats, recentTasks, repoStats } = Route.useLoaderData()

  // Handle client-side navigation where user might be null
  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-neutral-600">Loading...</p>
        </div>
      </Layout>
    )
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <Badge variant="success">{status}</Badge>
      case 'running':
        return <Badge variant="info">{status}</Badge>
      case 'failed':
        return <Badge variant="error">{status}</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  // Handle fallback stats structure
  const tasksByStatus = 'tasksByStatus' in stats ? stats.tasksByStatus : {
    running: 0,
    completed: 0,
  }

  return (
    <Layout userEmail={user.email}>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's an overview of your repositories and tasks."
      />

      {/* Statistics */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card variant="elevated">
              <CardBody>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-neutral-400"
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
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-small font-medium text-neutral-500 truncate">
                        Repositories
                      </dt>
                      <dd className="text-h4 font-medium text-neutral-dark">
                        {stats.totalRepos}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card variant="elevated">
              <CardBody>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-neutral-400"
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
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-small font-medium text-neutral-500 truncate">
                        Total Tasks
                      </dt>
                      <dd className="text-h4 font-medium text-neutral-dark">
                        {stats.totalTasks}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card variant="elevated">
              <CardBody>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-small font-medium text-neutral-500 truncate">
                        Running
                      </dt>
                      <dd className="text-h4 font-medium text-neutral-dark">
                        {tasksByStatus.running}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card variant="elevated">
              <CardBody>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-success"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-small font-medium text-neutral-500 truncate">
                        Completed
                      </dt>
                      <dd className="text-h4 font-medium text-neutral-dark">
                        {tasksByStatus.completed}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Repository Summary */}
          {repos.length > 0 && repoStats && (
            <Card className="mb-8">
              <CardBody>
                <h2 className="text-h3 text-neutral-dark mb-4">
                  Repository Summary
                </h2>
                {repoStats.length === 0 ? (
                  <p className="text-small text-neutral-500">
                    No repositories connected yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {repoStats.map((item: { repo: any; stats: any }) => {
                      const { repo, stats } = item
                      return (
                        <Link
                          key={repo._id}
                          to="/repos/$repoId"
                          params={{ repoId: repo._id }}
                          className="block"
                        >
                          <Card variant="outlined" className="hover:border-primary hover:shadow-md transition-all">
                            <CardBody>
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="text-body font-medium text-neutral-dark">
                                  {repo.owner}/{repo.name}
                                </h3>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-small">
                                  <span className="text-neutral-600">Successful</span>
                                  <span className="font-medium text-success">
                                    {stats.successful}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-small">
                                  <span className="text-neutral-600">Failed</span>
                                  <span className="font-medium text-error">
                                    {stats.failed}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-small">
                                  <span className="text-neutral-600">Not Started</span>
                                  <span className="font-medium text-neutral-600">
                                    {stats.notStarted}
                                  </span>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Recent Tasks */}
          <Card className="mb-8">
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h3 text-neutral-dark">Recent Tasks</h2>
                <Link
                  to="/tasks"
                  className="text-small text-primary hover:text-primary-dark transition-colors"
                >
                  View all
                </Link>
              </div>
              {!recentTasks || recentTasks.length === 0 ? (
                <p className="text-small text-neutral-500">
                  No tasks yet. Create a task to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentTasks?.map((task: any) => (
                    <Link
                      key={task._id}
                      to="/tasks/$taskId"
                      params={{ taskId: task._id }}
                      className="block"
                    >
                      <Card variant="outlined" className="hover:border-primary transition-colors">
                        <CardBody>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-small font-medium text-neutral-dark">
                                {task.title}
                              </h3>
                              <p className="text-caption text-neutral-500 mt-1">
                                {new Date(task.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {getStatusBadge(task.status)}
                          </div>
                        </CardBody>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardBody>
              <h2 className="text-h3 text-neutral-dark mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <Link to="/repos">
                  <Button variant="primary">Connect Repository</Button>
                </Link>
                {repos.length > 0 && (
                  <Link to="/repos/$repoId" params={{ repoId: repos[0]._id }}>
                    <Button variant="outline">Create Task</Button>
                  </Link>
                )}
                <Link to="/tasks">
                  <Button variant="outline">View All Tasks</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
    </Layout>
  )
}

