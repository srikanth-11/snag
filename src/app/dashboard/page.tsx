import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { listUserJobs } from "@/lib/db";

function statusTone(status: string): string {
  if (status === "done") return "text-proof";
  if (status === "error") return "text-ember";
  return "text-smoke";
}

export default async function DashboardPage() {
  if (!hasSupabase) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const jobs = await listUserJobs(supabase, user.id);

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

        {jobs.length === 0 ? (
          <div className="mt-8 rounded-xl border border-edge bg-ash/40 p-10 text-center text-smoke">
            No hunts yet. Paste a URL on the home page to run your first one.
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-[color:var(--edge)] overflow-hidden rounded-xl border border-edge bg-ash/40">
            {jobs.map((j) => {
              const running = j.status === "running" || j.status === "queued";
              return (
                <li key={j.id}>
                  <Link
                    href={running ? `/hunt/${j.id}` : `/report/${j.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ash/60"
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-sm text-bone">
                      {j.url}
                    </span>
                    <span className="hidden text-xs text-smoke sm:inline">
                      {new Date(j.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-smoke">
                      {j.findingCount} {j.findingCount === 1 ? "snag" : "snags"}
                    </span>
                    <span className={`font-mono text-xs ${statusTone(j.status)}`}>{j.status}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
