import { createClient } from "@/lib/auth/supabase-server";
import { redirect } from "next/navigation";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user from Convex, create if doesn't exist
  let convexUser = await convexClient.query(
    api.users.getUserBySupabaseId,
    { supabaseUserId: user.id }
  );

  // If user doesn't exist in Convex, create them
  // This can happen when switching Convex deployments
  if (!convexUser) {
    try {
      const userId = await convexClient.mutation(api.users.upsertUser, {
        supabaseUserId: user.id,
        email: user.email || "",
      });
      // Fetch the newly created user
      convexUser = await convexClient.query(
        api.users.getUserBySupabaseId,
        { supabaseUserId: user.id }
      );
      if (!convexUser) {
        // Still not found after creation, something is wrong
        throw new Error("Failed to create or retrieve Convex user");
      }
    } catch (error) {
      console.error("Error creating Convex user:", error);
      // Return error page instead of redirecting to avoid loop
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Setup Required
            </h1>
            <p className="text-gray-600 mb-4">
              Your account needs to be set up in our system. Please try refreshing
              the page, or contact support if the issue persists.
            </p>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                Sign Out and Try Again
              </button>
            </form>
          </div>
        </div>
      );
    }
  }

  // Fetch user's repositories
  const reposResult = await convexClient.query(api.repos.getReposByUser, {
    userId: convexUser._id,
  });
  const repos = Array.isArray(reposResult) ? reposResult : [];

  // Fetch user's tasks
  const tasksResult = await convexClient.query(api.tasks.getTasksByUser, {
    userId: convexUser._id,
  });
  const tasks = Array.isArray(tasksResult) ? tasksResult : [];

  // Calculate statistics
  const stats = {
    totalRepos: repos.length,
    totalTasks: tasks.length,
    tasksByStatus: {
      queued: tasks.filter((t) => t.status === "queued").length,
      running: tasks.filter((t) => t.status === "running").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
      needsReview: tasks.filter((t) => t.status === "needs_review").length,
    },
  };

  // Get recent tasks
  const recentTasks = tasks
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  // Calculate task statistics per repository
  const repoStats = repos.map((repo) => {
    const repoTasks = tasks.filter((task) => task.repoId === repo._id);
    return {
      repo,
      stats: {
        successful: repoTasks.filter((t) => t.status === "completed").length,
        failed: repoTasks.filter((t) => t.status === "failed").length,
        notStarted: repoTasks.filter((t) => t.status === "queued").length,
      },
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold">
                Pithy Jaunt
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/repos"
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Repositories
              </Link>
              <Link
                href="/tasks"
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Tasks
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
              Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back! Here&apos;s an overview of your repositories and tasks.
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-gray-400"
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
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Repositories
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalRepos}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-gray-400"
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
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Tasks
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalTasks}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-blue-400"
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
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Running
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.tasksByStatus.running}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-green-400"
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
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Completed
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.tasksByStatus.completed}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Repository Summary */}
          {repos.length > 0 && (
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Repository Summary
                </h2>
                {repoStats.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No repositories connected yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {repoStats.map(({ repo, stats }) => (
                      <Link
                        key={repo._id}
                        href={`/repos/${repo._id}`}
                        className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-base font-medium text-gray-900">
                            {repo.owner}/{repo.name}
                          </h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Successful</span>
                            <span className="font-medium text-green-600">
                              {stats.successful}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Failed</span>
                            <span className="font-medium text-red-600">
                              {stats.failed}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Not Started</span>
                            <span className="font-medium text-gray-600">
                              {stats.notStarted}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Tasks */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Recent Tasks</h2>
                <Link
                  href="/tasks"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View all
                </Link>
              </div>
              {recentTasks.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No tasks yet. Create a task to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map((task) => (
                    <Link
                      key={task._id}
                      href={`/tasks/${task._id}`}
                      className="block p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {task.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(task.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : task.status === "running"
                              ? "bg-blue-100 text-blue-800"
                              : task.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/repos"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Connect Repository
                </Link>
                {repos.length > 0 && (
                  <Link
                    href={`/repos/${repos[0]._id}/tasks/new`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Create Task
                  </Link>
                )}
                <Link
                  href="/tasks"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  View All Tasks
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
