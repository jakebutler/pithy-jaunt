import { createClient } from "@/lib/auth/supabase-server";
import { redirect } from "next/navigation";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { TaskCard } from "@/components/tasks/TaskCard";
import Link from "next/link";

export default async function TasksPage() {
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

  // Fetch user's tasks
  const tasksResult = await convexClient.query(api.tasks.getTasksByUser, {
    userId: convexUser._id,
  });
  const tasks = Array.isArray(tasksResult) ? tasksResult : [];

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
              <span className="text-sm font-medium text-gray-900">Tasks</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/repos"
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Repositories
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Tasks
            </h1>
            <p className="text-gray-600">
              View and manage your tasks
            </p>
          </div>

          {/* Task List */}
          <div>
            {tasks.length === 0 ? (
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No tasks yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Tasks will appear here when you create them or when CodeRabbit generates suggestions
                </p>
                <div className="mt-6">
                  <Link
                    href="/repos"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Connect a Repository
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tasks.map((task) => (
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
        </div>
      </main>
    </div>
  );
}

