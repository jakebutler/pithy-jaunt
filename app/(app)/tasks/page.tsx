import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/auth/supabase-server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TaskCard } from "@/components/tasks/TaskCard";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: "queued" | "running" | "completed" | "failed" | "needs_review" | "cancelled";
  priority: "low" | "normal" | "high";
  initiator: "user" | "coderabbit";
  prUrl?: string;
  createdAt: number;
}

export default async function TasksPage() {
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

  const tasks = await fetchTasks(convexUser._id);

  return (
    <>
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
              <Link href="/repos">
                <Button variant="primary">Connect a Repository</Button>
              </Link>
            }
          />
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

async function fetchTasks(userId: Id<"users">): Promise<Task[]> {
  const result = await convexClient.query(api.tasks.getTasksByUser, { userId });
  return Array.isArray(result) ? (result as Task[]) : [];
}

