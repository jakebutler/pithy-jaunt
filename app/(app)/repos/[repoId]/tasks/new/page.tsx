import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/auth/supabase-server";
import { convexClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TaskCreateForm } from "@/components/tasks/TaskCreateForm";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ repoId: string }>;
}

export default async function NewTaskPage({ params }: PageProps) {
  const { repoId } = await params;
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

  const repo = await convexClient.query(api.repos.getRepoById, {
    repoId: repoId as Id<"repos">,
  });

  if (!repo) {
    notFound();
  }

  if (repo.userId !== convexUser._id) {
    redirect("/repos");
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Repositories", to: "/repos" },
          { label: `${repo.owner}/${repo.name}`, to: `/repos/${repo._id}` },
          { label: "New Task", to: `/repos/${repo._id}/tasks/new` },
        ]}
      />

      <PageHeader
        title="Create New Task"
        description={`Create a new task for ${repo.owner}/${repo.name}`}
      />

      <Card>
        <CardBody>
          <TaskCreateForm
            repoId={repo._id}
            repoName={`${repo.owner}/${repo.name}`}
          />
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

