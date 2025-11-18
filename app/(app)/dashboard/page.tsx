import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/supabase-server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Task {
  _id: string;
  title: string;
  status: string;
  createdAt: number;
  repoId?: string;
}

interface Repo {
  _id: string;
  name: string;
  owner: string;
}

interface Stats {
  totalRepos: number;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
}

interface RepoStat {
  repo: Repo;
  stats: {
    successful: number;
    failed: number;
    notStarted: number;
  };
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const convexUser = await getOrCreateConvexUser(user.id, user.email ?? "");
  const repos = await fetchRepos(convexUser?._id);
  const tasks = await fetchTasks(convexUser?._id);

  const stats = buildStats(repos, tasks);
  const recentTasks = tasks
    .slice()
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 5);
  const repoStats = buildRepoStats(repos, tasks);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Warm minimalism with purposeful color—your repos, tasks, and statuses at a glance."
      />

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Repositories" value={stats.totalRepos} />
        <StatCard label="Total Tasks" value={stats.totalTasks} />
        <StatCard label="Running" value={stats.tasksByStatus.running ?? 0} accent="text-primary" />
        <StatCard label="Completed" value={stats.tasksByStatus.completed ?? 0} accent="text-success" />
      </section>

      {repos.length > 0 && (
        <Card className="mb-8">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3 text-neutral-dark">Repository Summary</h2>
              <Link href="/repos" className="text-small text-primary hover:text-primary-dark transition-colors">
                View repositories
              </Link>
            </div>
            {repoStats.length === 0 ? (
              <p className="text-small text-neutral-500">No repositories connected yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {repoStats.map(({ repo, stats }) => (
                  <Link href={`/repos/${repo._id}`} key={repo._id} className="block">
                    <Card variant="outlined" className="hover:border-primary hover:shadow-md transition-all">
                      <CardBody>
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-body font-medium text-neutral-dark">
                            {repo.owner}/{repo.name}
                          </h3>
                        </div>
                        <div className="space-y-2">
                          <SummaryRow label="Successful" value={stats.successful} valueClass="text-success" />
                          <SummaryRow label="Failed" value={stats.failed} valueClass="text-error" />
                          <SummaryRow label="Not Started" value={stats.notStarted} />
                        </div>
                      </CardBody>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Card className="mb-8">
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h3 text-neutral-dark">Recent Tasks</h2>
            <Link href="/tasks" className="text-small text-primary hover:text-primary-dark transition-colors">
              View all
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <p className="text-small text-neutral-500">No tasks yet. Create a task to get started.</p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <Link href={`/tasks/${task._id}`} key={task._id} className="block">
                  <Card variant="outlined" className="hover:border-primary transition-colors">
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-small font-medium text-neutral-dark">{task.title}</h3>
                          <p className="text-caption text-neutral-500 mt-1">
                            {task.createdAt ? new Date(task.createdAt).toLocaleString() : "—"}
                          </p>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-h3 text-neutral-dark mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/repos">
              <Button variant="primary">Connect Repository</Button>
            </Link>
            {repos.length > 0 && (
              <Link href={`/repos/${repos[0]._id}`}>
                <Button variant="outline">Create Task</Button>
              </Link>
            )}
            <Link href="/tasks">
              <Button variant="outline">View All Tasks</Button>
            </Link>
          </div>
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

async function fetchRepos(userId?: Id<"users">) {
  if (!userId) return [];
  const result = await convexClient.query(api.repos.getReposByUser, { userId });
  return Array.isArray(result) ? (result as Repo[]) : [];
}

async function fetchTasks(userId?: Id<"users">) {
  if (!userId) return [];
  const result = await convexClient.query(api.tasks.getTasksByUser, { userId });
  return Array.isArray(result) ? (result as Task[]) : [];
}

function buildStats(repos: Repo[], tasks: Task[]): Stats {
  const tasksByStatus = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalRepos: repos.length,
    totalTasks: tasks.length,
    tasksByStatus,
  };
}

function buildRepoStats(repos: Repo[], tasks: Task[]): RepoStat[] {
  if (!repos.length) return [];

  return repos.map((repo) => {
    const repoTasks = tasks.filter((task) => task.repoId === repo._id);
    return {
      repo,
      stats: {
        successful: repoTasks.filter((task) => task.status === "completed").length,
        failed: repoTasks.filter((task) => task.status === "failed").length,
        notStarted: repoTasks.filter((task) => task.status === "queued").length,
      },
    };
  });
}

function StatCard({
  label,
  value,
  accent = "text-neutral-400",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card variant="elevated">
      <CardBody>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className={`h-6 w-6 ${accent}`}>●</span>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-small font-medium text-neutral-500 truncate">{label}</dt>
              <dd className="text-h4 font-medium text-neutral-dark">{value}</dd>
            </dl>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  valueClass = "text-neutral-600",
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-small">
      <span className="text-neutral-600">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Badge variant="success">{status}</Badge>;
    case "running":
      return <Badge variant="info">{status}</Badge>;
    case "failed":
      return <Badge variant="error">{status}</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

