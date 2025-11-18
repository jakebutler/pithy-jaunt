import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { convexClient } from '@/lib/convex/server'
import { api } from '@/convex/_generated/api'
import { TaskCard } from '@/components/tasks/TaskCard'
import { Layout } from '@/components/ui/layout'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/tasks')({
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
          returnTo: '/tasks',
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

    // Fetch user's tasks
    const tasksResult = await convexClient.query(api.tasks.getTasksByUser, {
      userId: convexUser._id,
    })
    const tasks = Array.isArray(tasksResult) ? tasksResult : []

    return {
      user: {
        email: user.email,
      },
      tasks,
    }
  },
  component: TasksPage,
})

function TasksPage() {
  const { user, tasks } = Route.useLoaderData()

  return (
    <Layout userEmail={user.email}>
      <PageHeader
        title="Tasks"
        description="View and manage your tasks"
      />

      {/* Task List */}
      <div>
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
            description="Tasks will appear here when you create them or when CodeRabbit generates suggestions"
            action={
              <Link to="/repos">
                <Button variant="primary">Connect a Repository</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task: any) => (
              <TaskCard
                key={task._id}
                taskId={task._id}
                title={task.title}
                description={task.description}
                status={task.status}
                priority={task.priority}
                initiator={task.initiator}
                prUrl={task.prUrl}
                createdAt={task.createdAt}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

