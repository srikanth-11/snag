import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { FindingCard } from "@/components/FindingCard";
import { SEVERITY_ORDER } from "@/components/SeverityBadge";
import { createClient } from "@/lib/supabase/server";
import { getJob, getFindings } from "@/lib/db";
import { dedupe } from "@/lib/agent/dedupe";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const job = await getJob(supabase, id);
  if (!job) notFound();

  const findings = dedupe(await getFindings(supabase, id)).sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-smoke">Report</p>
            <h1 className="mt-2 break-all font-display text-3xl font-bold">{job.url}</h1>
            <p className="mt-1 text-sm text-smoke">
              {findings.length} {findings.length === 1 ? "snag" : "snags"} found
            </p>
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
          <div className="mt-8 space-y-4">
            {findings.map((f, i) => (
              <FindingCard key={i} f={f} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
