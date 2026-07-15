import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";

export default async function DashboardPage() {
  if (!hasSupabase) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Your hunts</h1>
            <p className="mt-1 text-sm text-smoke">Signed in as {user.email}</p>
          </div>
          <Link
            href="/#try"
            className="rounded-lg bg-ember px-4 py-2 font-medium text-void transition-opacity hover:opacity-90"
          >
            New hunt
          </Link>
        </div>

        <div className="mt-8 rounded-xl border border-edge bg-ash/40 p-10 text-center text-smoke">
          No hunts yet. Paste a URL on the home page to run your first one.
        </div>
      </main>
    </>
  );
}
