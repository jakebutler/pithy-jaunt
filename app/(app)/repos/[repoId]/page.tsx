import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/auth/supabase-server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { GitIngestReport } from "@/components/repos/GitIngestReport";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ repoId: string }>;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  createdAt: number;
  initiator?: string;
  prUrl?: string;
}

export default async function RepoDetailPage({ params }: PageProps) {
  const { repoId } = await params;
  const supabase = await createClient();
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

  const repo = await convexClient.query(api.repos.getRepoById, {
    repoId: repoId as Id<"repos">,
  });

  if (!repo) {
    notFound();
  }

  if (repo.userId !== convexUser._id) {
    redirect("/repos");
  }

  const tasksResult = await convexClient.query(api.tasks.getTasksByRepo, {
    repoId: repo._id,
  });
  const tasks = Array.isArray(tasksResult) ? tasksResult : [];

  function getStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return <Badge variant="success">{status}</Badge>;
      case "running":
        return <Badge variant="info">{status}</Badge>;
      case "failed":
        return <Badge variant="error">{status}</Badge>;
      case "needs_review":
        return <Badge variant="warning">{status}</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Repositories", to: "/repos" },
          { label: `${repo.owner}/${repo.name}`, to: `/repos/${repo._id}` },
        ]}
      />

      <PageHeader
        title={`${repo.owner}/${repo.name}`}
        description={`${repo.url} • Branch: ${repo.branch}`}
        actions={
          <Link href={`/repos/${repo._id}/tasks/new`}>
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
            status={repo.gitingestReportStatus || "pending"}
            report={repo.gitingestReport as unknown as Parameters<typeof GitIngestReport>[0]['report']}
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
              href={`/repos/${repo._id}/tasks/new`}
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
                <Link href={`/repos/${repo._id}/tasks/new`}>
                  <Button variant="primary">Create Task</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {tasks.map((task: Task) => (
                <Link
                  key={task._id}
                  href={`/tasks/${task._id}`}
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
                            {task.initiator === "coderabbit" && (
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

