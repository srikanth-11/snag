import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import ReportView from "@/components/ReportView";
import { createClient } from "@/lib/supabase/server";
import { getJob, getFindings, getSteps } from "@/lib/db";
import { dedupe } from "@/lib/agent/dedupe";
import { healthScore } from "@/lib/score";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const job = await getJob(supabase, id);
  if (!job) notFound();

  const findings = dedupe(await getFindings(supabase, id));
  const steps = await getSteps(supabase, id);
  const pages = new Set(
    steps.map((s) => {
      try {
        const u = new URL(s.url);
        return u.origin + u.pathname;
      } catch {
        return s.url;
      }
    }),
  ).size;
  const { score, grade } = healthScore(findings);

  return (
    <AppShell email={user?.email ?? ""}>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-smoke">Report</p>
            <h1 className="mt-2 break-all font-display text-3xl font-bold">{job.url}</h1>
          </div>
          <Link
            href="/#try"
            className="shrink-0 rounded-lg border border-edge px-4 py-2 text-sm transition-colors hover:border-proof/50"
          >
            Run again
          </Link>
        </div>

        {findings.length === 0 ? (
          <div className="mt-8 rounded-xl border border-edge bg-ash/40 p-10 text-center text-smoke">
            Snag found nothing to catch. Either your app is solid or the target needs to be harder.
          </div>
        ) : (
          <ReportView findings={findings} score={score} grade={grade} pages={Math.max(1, pages)} />
        )}
      </main>
    </AppShell>
  );
}
