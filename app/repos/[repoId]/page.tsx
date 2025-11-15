import { createClient } from "@/lib/auth/supabase-server";
import { redirect, notFound } from "next/navigation";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CodeRabbitReport } from "@/components/repos/CodeRabbitReport";
import Link from "next/link";

export default async function RepoDetailPage({
  params,
}: {
  params: { repoId: string };
}) {
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
    repoId: params.repoId as Id<"repos">,
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
        </div>
      </main>
    </div>
  );
}

