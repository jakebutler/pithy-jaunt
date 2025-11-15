import { createClient } from "@/lib/auth/supabase-server";
import { redirect, notFound } from "next/navigation";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TaskCreateForm } from "@/components/tasks/TaskCreateForm";
import Link from "next/link";

export default async function CreateTaskPage({
  params,
}: {
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = await params;
  
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

  // Fetch repository
  const repo = await convexClient.query(api.repos.getRepoById, {
    repoId: repoId as Id<"repos">,
  });

  if (!repo) {
    notFound();
  }

  // Verify user owns the repository
  if (repo.userId !== convexUser._id) {
    redirect("/repos");
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
              <Link href="/repos" className="text-sm text-gray-700 hover:text-gray-900">
                Repositories
              </Link>
              <span className="text-gray-400">/</span>
              <Link
                href={`/repos/${repo._id}`}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                {repo.owner}/{repo.name}
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-sm font-medium text-gray-900">New Task</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/repos/${repo._id}`}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
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
  );
}

