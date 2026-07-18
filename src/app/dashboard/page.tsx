import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import HuntList from "@/components/HuntList";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { listUserJobs } from "@/lib/db";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-edge bg-ash/40 p-5">
      <div className="font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-smoke">{label}</div>
    </div>
  );
}

export default async function DashboardPage() {
  if (!hasSupabase) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const jobs = await listUserJobs(supabase, user.id);
  const totalFindings = jobs.reduce((s, j) => s + j.findingCount, 0);
  const running = jobs.filter((j) => j.status === "running" || j.status === "queued").length;

  return (
    <AppShell email={user.email ?? ""}>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-bold">Your hunts</h1>
          <Link
            href="/#try"
            className="rounded-lg bg-ember px-4 py-2 font-medium text-void transition-opacity hover:opacity-90"
          >
            New hunt
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <Stat label="Hunts" value={jobs.length} />
          <Stat label="Findings" value={totalFindings} />
          <Stat label="Running" value={running} />
        </div>

        <div className="mt-8">
          {jobs.length === 0 ? (
            <div className="rounded-xl border border-edge bg-ash/40 p-10 text-center text-smoke">
              No hunts yet. Paste a URL on the home page to run your first one.
            </div>
          ) : (
            <HuntList jobs={jobs} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
