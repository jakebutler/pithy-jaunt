import { createFileRoute, Link, redirect, notFound } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { GitIngestReport } from '@/components/repos/GitIngestReport'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { Layout } from '@/components/ui/layout'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

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

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <Badge variant="success">{status}</Badge>
      case 'running':
        return <Badge variant="info">{status}</Badge>
      case 'failed':
        return <Badge variant="error">{status}</Badge>
      case 'needs_review':
        return <Badge variant="warning">{status}</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  return (
    <Layout userEmail={user.email}>
      <Breadcrumb
        items={[
          { label: 'Repositories', to: '/repos' },
          { label: `${repo.owner}/${repo.name}`, to: `/repos/${repo._id}` },
        ]}
      />
      
      <PageHeader
        title={`${repo.owner}/${repo.name}`}
        description={
          <div className="flex items-center gap-4 text-small text-neutral-600">
            <ExternalLink href={repo.url} className="text-primary hover:text-primary-dark transition-colors">
              {repo.url}
            </ExternalLink>
            <span>Branch: {repo.branch}</span>
          </div>
        }
        actions={
          <Link to="/repos/$repoId/tasks/new" params={{ repoId: repo._id }}>
            <Button variant="primary">Create Task</Button>
          </Link>
        }
      />

      {/* GitIngest Report */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-h3 text-neutral-dark">
            Code Analysis Report
          </h2>
        </CardHeader>
        <CardBody>
          <GitIngestReport
            repoId={repo._id}
            status={repo.gitingestReportStatus || 'pending'}
            report={repo.gitingestReport as any}
            error={repo.gitingestReportError}
          />
        </CardBody>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-h3 text-neutral-dark">
              Tasks ({tasks.length})
            </h2>
            <Link
              to="/repos/$repoId/tasks/new"
              params={{ repoId: repo._id }}
              className="text-small text-primary hover:text-primary-dark transition-colors"
            >
              Create New Task
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {tasks.length === 0 ? (
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              }
              title="No tasks yet"
              description="Get started by creating your first task for this repository"
              action={
                <Link to="/repos/$repoId/tasks/new" params={{ repoId: repo._id }}>
                  <Button variant="primary">Create Task</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {tasks.map((task: any) => (
                <Link
                  key={task._id}
                  to="/tasks/$taskId"
                  params={{ taskId: task._id }}
                  className="block"
                >
                  <Card variant="outlined" className="hover:border-primary hover:shadow-md transition-all">
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-body font-medium text-neutral-dark">
                            {task.title}
                          </h3>
                          <p className="text-small text-neutral-600 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-caption text-neutral-500">
                            <span>
                              Created: {new Date(task.createdAt).toLocaleString()}
                            </span>
                            {task.initiator === 'coderabbit' && (
                              <Badge variant="info" size="sm">From CodeRabbit</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(task.status)}
                          {task.prUrl && (
                            <ExternalLink
                              href={task.prUrl}
                              className="text-small text-primary hover:text-primary-dark transition-colors"
                            >
                              View PR
                            </ExternalLink>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </Layout>
  )
}

