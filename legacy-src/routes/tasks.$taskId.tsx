import { createFileRoute, Link, redirect, notFound } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { TaskLogs } from '@/components/tasks/TaskLogs'
import { WorkspaceStatus } from '@/components/tasks/WorkspaceStatus'
import { TaskActions } from '@/components/tasks/TaskActions'
import { Layout } from '@/components/ui/layout'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/tasks/$taskId')({
  loader: async ({ context, params }) => {
    const { taskId } = params
    const request = context.request
    
    const supabase = createClient(request)
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw redirect({
        to: '/login',
        search: {
          returnTo: `/tasks/${taskId}`,
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

    // Fetch task
    const task = await convexClient.query(api.tasks.getTaskById, {
      taskId: taskId as Id<'tasks'>,
    })

    if (!task) {
      throw notFound()
    }

    // Verify user owns the task
    if (task.userId !== convexUser._id) {
      throw redirect({ to: '/tasks' })
    }

    // Get repository info
    const repo = await convexClient.query(api.repos.getRepoById, {
      repoId: task.repoId,
    })

    return {
      user: {
        email: user.email,
      },
      task,
      repo: repo || null,
    }
  },
  component: TaskDetailPage,
})

function TaskDetailPage() {
  const { user, task, repo } = Route.useLoaderData()

  function getStatusBadge(taskStatus: 'queued' | 'running' | 'completed' | 'failed' | 'needs_review' | 'cancelled') {
    switch (taskStatus) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>
      case 'running':
        return <Badge variant="info">Running</Badge>
      case 'failed':
        return <Badge variant="error">Failed</Badge>
      case 'needs_review':
        return <Badge variant="warning">Needs Review</Badge>
      case 'cancelled':
        return <Badge variant="default">Cancelled</Badge>
      case 'queued':
      default:
        return <Badge variant="default">Queued</Badge>
    }
  }

  return (
    <Layout userEmail={user.email}>
      <Breadcrumb
        items={[
          { label: 'Tasks', to: '/tasks' },
          { label: task.title, to: `/tasks/${task._id}` },
        ]}
      />
      
      <PageHeader
        title={task.title}
        description={
          <div className="flex items-center gap-3 flex-wrap">
            {getStatusBadge(task.status)}
            <span className="text-small text-neutral-600">
              Priority: {task.priority}
            </span>
            {task.initiator === 'coderabbit' && (
              <Badge variant="info" size="sm">From CodeRabbit</Badge>
            )}
            {repo && (
              <span className="text-small text-neutral-600">
                Repository:{' '}
                <Link
                  to="/repos/$repoId"
                  params={{ repoId: repo._id }}
                  className="text-primary hover:text-primary-dark transition-colors"
                >
                  {repo.owner}/{repo.name}
                </Link>
              </span>
            )}
          </div>
        }
      />

      {/* Task Description */}
      <Card className="mb-6">
        <CardBody>
          <h3 className="text-h4 text-neutral-dark mb-2">Description</h3>
          <p className="text-body text-neutral-700 whitespace-pre-wrap">{task.description}</p>
        </CardBody>
      </Card>

      {/* Task Actions */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-h3 text-neutral-dark">Actions</h2>
        </CardHeader>
        <CardBody>
          <TaskActions
            taskId={task._id}
            taskStatus={task.status}
            prUrl={task.prUrl}
          />
        </CardBody>
      </Card>

      {/* Workspace Status */}
      {task.assignedWorkspaceId && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-h3 text-neutral-dark">Workspace</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              <div>
                <dt className="text-small font-medium text-neutral-500">Workspace ID</dt>
                <dd className="mt-1 text-small text-neutral-dark font-mono">{task.assignedWorkspaceId}</dd>
              </div>
              <WorkspaceStatus status="running" />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Execution Logs */}
      {(task.status === 'running' || task.status === 'completed' || task.status === 'failed') && (
        <div className="mb-6">
          <TaskLogs taskId={task._id} />
        </div>
      )}

      {/* Task Details */}
      <Card>
        <CardHeader>
          <h2 className="text-h3 text-neutral-dark">Details</h2>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-small font-medium text-neutral-500">Status</dt>
              <dd className="mt-1 text-small text-neutral-dark">{task.status}</dd>
            </div>
            <div>
              <dt className="text-small font-medium text-neutral-500">Priority</dt>
              <dd className="mt-1 text-small text-neutral-dark capitalize">{task.priority}</dd>
            </div>
            <div>
              <dt className="text-small font-medium text-neutral-500">Created</dt>
              <dd className="mt-1 text-small text-neutral-dark">
                {new Date(task.createdAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-small font-medium text-neutral-500">Last Updated</dt>
              <dd className="mt-1 text-small text-neutral-dark">
                {new Date(task.updatedAt).toLocaleString()}
              </dd>
            </div>
            {task.branchName && (
              <div>
                <dt className="text-small font-medium text-neutral-500">Branch</dt>
                <dd className="mt-1 text-small text-neutral-dark font-mono">{task.branchName}</dd>
              </div>
            )}
            {task.modelPreference && (
              <div>
                <dt className="text-small font-medium text-neutral-500">Model</dt>
                <dd className="mt-1 text-small text-neutral-dark">
                  {task.modelPreference.provider}/{task.modelPreference.model}
                </dd>
              </div>
            )}
          </dl>
        </CardBody>
      </Card>
    </Layout>
  )
}

