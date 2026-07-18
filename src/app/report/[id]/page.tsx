import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import Nav from "@/components/Nav";
import ReportView from "@/components/ReportView";
import { Mark } from "@/components/brand";
import { createClient } from "@/lib/supabase/server";
import { getJob, getFindings, getSteps, findPreviousJobId } from "@/lib/db";
import { dedupe, findingKey } from "@/lib/agent/dedupe";
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

  // Regression diff vs the previous completed run on the same URL.
  const prevId = await findPreviousJobId(supabase, job.url, job.createdAt);
  let diff: { added: number; fixed: number; same: number } | null = null;
  if (prevId) {
    const prev = dedupe(await getFindings(supabase, prevId));
    const curKeys = new Set(findings.map(findingKey));
    const prevKeys = new Set(prev.map(findingKey));
    diff = {
      added: findings.filter((f) => !prevKeys.has(findingKey(f))).length,
      fixed: prev.filter((f) => !curKeys.has(findingKey(f))).length,
      same: findings.filter((f) => prevKeys.has(findingKey(f))).length,
    };
  }

  const content = (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        {/* Branded header, PDF only */}
        <div className="mb-6 hidden items-center justify-between border-b border-edge pb-4 print:flex">
          <span className="inline-flex items-center gap-2 font-display text-lg font-bold">
            <Mark className="h-5 w-5" /> snag
          </span>
          <span className="font-mono text-xs text-smoke">
            {new Date(job.createdAt).toLocaleString()}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-smoke">Report</p>
            <h1 className="mt-2 break-all font-display text-3xl font-bold">{job.url}</h1>
          </div>
          <Link
            href="/#try"
            className="shrink-0 rounded-lg border border-edge px-4 py-2 text-sm transition-colors hover:border-proof/50 print:hidden"
          >
            Run again
          </Link>
        </div>

        {diff && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-ember/40 bg-ember/10 px-3 py-1 text-ember">
              {diff.added} new
            </span>
            <span className="rounded-full border border-proof/40 bg-proof/10 px-3 py-1 text-proof">
              {diff.fixed} fixed
            </span>
            <span className="rounded-full border border-edge px-3 py-1 text-smoke">
              {diff.same} still present
            </span>
            <span className="text-xs text-smoke">since the previous run on this URL</span>
          </div>
        )}

        {findings.length === 0 ? (
          <div className="mt-8 rounded-xl border border-edge bg-ash/40 p-10 text-center text-smoke">
            Snag found nothing to catch. Either your app is solid or the target needs to be harder.
          </div>
        ) : (
          <ReportView findings={findings} score={score} grade={grade} pages={Math.max(1, pages)} />
        )}
    </main>
  );

  return user ? (
    <AppShell email={user.email ?? ""}>{content}</AppShell>
  ) : (
    <>
      <Nav />
      {content}
    </>
  );
}
