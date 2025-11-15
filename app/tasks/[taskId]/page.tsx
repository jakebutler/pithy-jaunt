import { createClient } from "@/lib/auth/supabase-server";
import { redirect, notFound } from "next/navigation";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TaskLogs } from "@/components/tasks/TaskLogs";
import { WorkspaceStatus } from "@/components/tasks/WorkspaceStatus";
import Link from "next/link";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  
  const supabase = await createClient();
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Get user from Convex
  const convexUser = await convexClient.query(
    api.users.getUserBySupabaseId,
    { supabaseUserId: session.user.id }
  );

  if (!convexUser) {
    redirect("/login");
  }

  // Fetch task
  const task = await convexClient.query(api.tasks.getTaskById, {
    taskId: taskId as Id<"tasks">,
  });

  if (!task) {
    notFound();
  }

  // Verify user owns the task
  if (task.userId !== convexUser._id) {
    redirect("/tasks");
  }

  // Get repository info
  const repo = await convexClient.query(api.repos.getRepoById, {
    repoId: task.repoId,
  });

  function getStatusBadge(taskStatus: "queued" | "running" | "completed" | "failed" | "needs_review" | "cancelled") {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    
    switch (taskStatus) {
      case "completed":
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Completed</span>;
      case "running":
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Running</span>;
      case "failed":
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Failed</span>;
      case "needs_review":
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Needs Review</span>;
      case "cancelled":
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Cancelled</span>;
      case "queued":
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Queued</span>;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-xl font-bold">
                Pithy Jaunt
              </Link>
              <span className="text-gray-400">/</span>
              <Link href="/tasks" className="text-sm text-gray-700 hover:text-gray-900">
                Tasks
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                {task.title}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/tasks"
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Back to Tasks
              </Link>
              <span className="text-sm text-gray-700">{session.user.email}</span>
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
          {/* Task Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {task.title}
                </h1>
                <div className="flex items-center gap-3 mb-4">
                  {getStatusBadge(task.status)}
                  <span className="text-sm text-gray-600">
                    Priority: {task.priority}
                  </span>
                  {task.initiator === "coderabbit" && (
                    <span className="text-sm text-purple-600">From CodeRabbit</span>
                  )}
                </div>
              </div>
            </div>

            {repo && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Repository:{" "}
                  <Link
                    href={`/repos/${repo._id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {repo.owner}/{repo.name}
                  </Link>
                </p>
              </div>
            )}

            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          </div>

          {/* Task Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="flex gap-3">
              {task.status === "queued" && (
                <form action={`/api/task/${task._id}/execute`} method="POST">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Execute Task
                  </button>
                </form>
              )}

              {(task.status === "queued" || task.status === "running") && (
                <form action={`/api/task/${task._id}/cancel`} method="POST">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel Task
                  </button>
                </form>
              )}

              {task.status === "completed" && task.prUrl && (
                <form action={`/api/task/${task._id}/approve`} method="POST">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Approve & Merge PR
                  </button>
                </form>
              )}

              {task.prUrl && (
                <a
                  href={task.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  View PR
                </a>
              )}
            </div>
          </div>

          {/* Workspace Status */}
          {task.assignedWorkspaceId && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Workspace</h2>
              <div className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Workspace ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{task.assignedWorkspaceId}</dd>
                </div>
                {/* TODO: Fetch workspace details for uptime */}
                <WorkspaceStatus status="running" />
              </div>
            </div>
          )}

          {/* Execution Logs */}
          {(task.status === "running" || task.status === "completed" || task.status === "failed") && (
            <div className="mb-6">
              <TaskLogs taskId={task._id} />
            </div>
          )}

          {/* Task Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">{task.status}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Priority</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{task.priority}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(task.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(task.updatedAt).toLocaleString()}
                </dd>
              </div>
              {task.branchName && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Branch</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{task.branchName}</dd>
                </div>
              )}
              {task.modelPreference && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Model</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {task.modelPreference.provider}/{task.modelPreference.model}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}

