import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/supabase-server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { RepoConnectForm } from "@/components/repos/RepoConnectForm";
import { RepoCard } from "@/components/repos/RepoCard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

interface Repo {
  _id: string;
  name: string;
  owner: string;
  url: string;
  analyzerStatus: "pending" | "analyzing" | "completed" | "failed";
  lastAnalyzedAt?: number;
  coderabbitDetected: boolean;
}

export default async function ReposPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const convexUser = await getOrCreateConvexUser(user.id, user.email ?? "");
  if (!convexUser) {
    redirect("/login");
  }

  const repos = await fetchRepos(convexUser._id);

  return (
    <>
      <PageHeader
        title="Repositories"
        description="Connect GitHub repositories to analyze code and generate tasks"
      />

      {/* Connect Repository Form */}
      <Card className="mb-8">
        <CardBody>
          <h2 className="text-h3 text-neutral-dark mb-4">
            Connect a Repository
          </h2>
          <RepoConnectForm />
        </CardBody>
      </Card>

      {/* Repository List */}
      <div>
        <h2 className="text-h3 text-neutral-dark mb-4">
          Connected Repositories ({repos.length})
        </h2>

        {repos.length === 0 ? (
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
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
            title="No repositories connected"
            description="Get started by connecting your first repository above"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {repos.map((repo) => (
              <RepoCard
                key={repo._id}
                id={repo._id}
                name={repo.name}
                owner={repo.owner}
                url={repo.url}
                status={repo.analyzerStatus}
                lastAnalyzedAt={repo.lastAnalyzedAt}
                coderabbitDetected={repo.coderabbitDetected}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

async function getOrCreateConvexUser(supabaseUserId: string, email: string) {
  if (!supabaseUserId) {
    return null;
  }

  let convexUser = await convexClient.query(api.users.getUserBySupabaseId, {
    supabaseUserId,
  });

  if (!convexUser) {
    await convexClient.mutation(api.users.upsertUser, {
      supabaseUserId,
      email,
    });
    convexUser = await convexClient.query(api.users.getUserBySupabaseId, {
      supabaseUserId,
    });
  }

  return convexUser;
}

async function fetchRepos(userId: string): Promise<Repo[]> {
  const result = await convexClient.query(api.repos.getReposByUser, { userId: userId as any });
  return Array.isArray(result) ? (result as Repo[]) : [];
}

