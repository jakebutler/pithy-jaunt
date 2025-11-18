import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/supabase-server";
import { Layout } from "@/components/ui/layout";

interface AppLayoutProps {
  children: ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <Layout userEmail={user.email ?? undefined}>{children}</Layout>;
}

