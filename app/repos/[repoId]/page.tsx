import { createClient } from "@/lib/auth/supabase-server";
import { redirect, notFound } from "next/navigation";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CodeRabbitReport } from "@/components/repos/CodeRabbitReport";
import { GitIngestReport } from "@/components/repos/GitIngestReport";
import Link from "next/link";
import { ExternalLink } from "@/components/ui/ExternalLink";

export default async function RepoDetailPage({
  params,
}: {
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = await params;
  
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user from Convex
  const convexUser = await convexClient.query(
    api.users.getUserBySupabaseId,
    { supabaseUserId: user.id }
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

  // TODO: Fetch actual analysis report when webhook is implemented
  // For now, we just show the status
  const report = null;

  // Fetch tasks for this repository
  const tasks = await convexClient.query(api.tasks.getTasksByRepo, {
    repoId: repo._id,
  });

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
              <span className="text-sm font-medium text-gray-900">
                {repo.owner}/{repo.name}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/repos"
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
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {repo.owner}/{repo.name}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600"
                  >
                    {repo.url}
                  </a>
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                  <span>Branch: {repo.branch}</span>
                  {repo.coderabbitDetected && (
                    <span className="text-green-600">CodeRabbit configured</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CodeRabbit Analysis Report */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              CodeRabbit Analysis
            </h2>
            <CodeRabbitReport
              status={repo.analyzerStatus}
              report={report || undefined}
            />
          </div>

          {/* GitIngest Report */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Repository Report
            </h2>
            <GitIngestReport
              status={repo.gitingestReportStatus || "pending"}
              report={repo.gitingestReport || undefined}
              error={repo.gitingestReportError || undefined}
              repoId={repo._id}
            />
          </div>

          {/* Tasks Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Tasks ({tasks.length})
              </h2>
              <Link
                href={`/repos/${repo._id}/tasks/new`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              >
                Create Task
              </Link>
            </div>
            
            {tasks.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                No tasks yet. Create one to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task._id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/tasks/${task._id}`}
                        className="flex-1 block"
                      >
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="capitalize">{task.status}</span>
                          <span>•</span>
                          <span className="capitalize">{task.priority} priority</span>
                          {task.initiator === "coderabbit" && (
                            <>
                              <span>•</span>
                              <span className="text-purple-600">From CodeRabbit</span>
                            </>
                          )}
                        </div>
                      </Link>
                      {task.prUrl && (
                        <ExternalLink
                          href={task.prUrl}
                          className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                        >
                          View PR
                        </ExternalLink>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

