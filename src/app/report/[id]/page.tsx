import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { FindingCard } from "@/components/FindingCard";
import { SEVERITY_ORDER } from "@/components/SeverityBadge";
import { createClient } from "@/lib/supabase/server";
import { getJob, getFindings } from "@/lib/db";
import { dedupe } from "@/lib/agent/dedupe";
import type { Finding, FindingCategory } from "@/lib/types";

// The user's focus (a11y, contrast, visual) leads; functional issues follow.
const CATEGORY_ORDER: FindingCategory[] = [
  "accessibility",
  "visual",
  "error",
  "network",
  "ux",
  "performance",
];
const CATEGORY_TITLE: Record<FindingCategory, string> = {
  accessibility: "Accessibility",
  visual: "Visual & layout",
  error: "Errors & crashes",
  network: "Network",
  ux: "UX & flows",
  performance: "Performance",
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const job = await getJob(supabase, id);
  if (!job) notFound();

  const findings = dedupe(await getFindings(supabase, id));
  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: findings
      .filter((f) => f.category === cat)
      .sort((a: Finding, b: Finding) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
  })).filter((g) => g.items.length);

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
          <>
            {/* Category summary */}
            <div className="mt-6 flex flex-wrap gap-2">
              {groups.map((g) => (
                <span
                  key={g.cat}
                  className="rounded-full border border-edge bg-ash/40 px-3 py-1 font-mono text-xs text-bone"
                >
                  {CATEGORY_TITLE[g.cat]} · {g.items.length}
                </span>
              ))}
            </div>

            <div className="mt-8 space-y-10">
              {groups.map((g) => (
                <section key={g.cat}>
                  <h2 className="mb-3 font-display text-xl font-bold">
                    {CATEGORY_TITLE[g.cat]}{" "}
                    <span className="font-mono text-sm font-normal text-smoke">
                      {g.items.length}
                    </span>
                  </h2>
                  <div className="space-y-4">
                    {g.items.map((f, i) => (
                      <FindingCard key={i} f={f} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
