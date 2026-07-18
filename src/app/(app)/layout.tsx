import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";

// Shared shell for the signed-in app pages. Living in a layout means the sidebar
// stays mounted across navigation — only the page content swaps (and shows the
// segment's loading skeleton), so moving between Dashboard and Settings is instant.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabase) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");
  return <AppShell email={user.email ?? ""}>{children}</AppShell>;
}
