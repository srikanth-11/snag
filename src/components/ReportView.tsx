"use client";

import { useMemo, useState } from "react";
import type { Finding, FindingCategory, Severity } from "@/lib/types";
import { FindingCard } from "@/components/FindingCard";
import { HealthRing } from "@/components/HealthRing";
import { SEVERITY_ORDER } from "@/components/SeverityBadge";

const CATEGORY_ORDER: FindingCategory[] = [
  "accessibility",
  "visual",
  "performance",
  "error",
  "network",
  "ux",
];
const CATEGORY_TITLE: Record<FindingCategory, string> = {
  accessibility: "Accessibility",
  visual: "Visual & layout",
  performance: "Performance",
  error: "Errors & crashes",
  network: "Network",
  ux: "UX & flows",
};

const SEV_FILTERS: { label: string; max: number }[] = [
  { label: "All", max: 3 },
  { label: "High+", max: 1 },
  { label: "Critical", max: 0 },
];

const SEV_ORDER: Severity[] = ["critical", "high", "medium", "low"];
const SEV_TONE: Record<Severity, string> = {
  critical: "border-ember/50 bg-ember/10 text-ember",
  high: "border-ember/30 bg-ember/5 text-ember/90",
  medium: "border-edge bg-bone/5 text-bone",
  low: "border-edge text-smoke",
};

function verdictFor(grade: string): string {
  switch (grade) {
    case "A":
      return "Solid. Only small things left to tidy up.";
    case "B":
      return "In good shape, with a handful worth fixing.";
    case "C":
      return "Some real issues to fix before your users hit them.";
    case "D":
      return "Notable problems worth a focused pass.";
    default:
      return "Significant issues found across the app.";
  }
}

export default function ReportView({
  findings,
  score,
  grade,
  pages,
  summary,
}: {
  findings: Finding[];
  score: number;
  grade: string;
  pages: number;
  summary?: string;
}) {
  const [cats, setCats] = useState<Set<FindingCategory>>(new Set());
  const [sevMax, setSevMax] = useState(3);
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c = {} as Record<FindingCategory, number>;
    for (const f of findings) c[f.category] = (c[f.category] ?? 0) + 1;
    return c;
  }, [findings]);

  const filtered = useMemo(
    () =>
      findings.filter((f) => {
        if (cats.size && !cats.has(f.category)) return false;
        if (SEVERITY_ORDER[f.severity] > sevMax) return false;
        if (q && !(f.title + " " + f.detail).toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [findings, cats, sevMax, q],
  );

  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: filtered
      .filter((f) => f.category === cat)
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
  })).filter((g) => g.items.length);

  const toggleCat = (c: FindingCategory) =>
    setCats((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });

  const sev = useMemo(() => {
    const s: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) s[f.severity]++;
    return s;
  }, [findings]);
  const topCat = (Object.keys(counts) as FindingCategory[]).sort((a, b) => counts[b] - counts[a])[0];

  return (
    <div>
      {/* Executive summary */}
      <div className="mt-6 rounded-xl border border-edge bg-ash/40 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <HealthRing score={score} grade={grade} />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs uppercase tracking-widest text-smoke">Verdict</p>
            <p className="mt-1.5 font-display text-xl font-semibold leading-snug">
              {verdictFor(grade)}
            </p>
            {summary && (
              <p className="mt-2 text-sm leading-relaxed text-bone/85">{summary}</p>
            )}
            <p className="mt-2 text-sm text-smoke">
              {findings.length} {findings.length === 1 ? "issue" : "issues"} across {pages}{" "}
              {pages === 1 ? "page" : "pages"}
              {topCat ? (
                <>
                  , most in <span className="text-bone">{CATEGORY_TITLE[topCat]}</span>
                </>
              ) : null}
              .
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SEV_ORDER.filter((s) => sev[s]).map((s) => (
                <span
                  key={s}
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${SEV_TONE[s]}`}
                >
                  {sev[s]} {s}
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-ember px-3.5 py-2 text-sm font-medium text-void transition-opacity hover:opacity-90"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_ORDER.filter((c) => counts[c]).map((c) => (
            <button
              key={c}
              onClick={() => toggleCat(c)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                cats.has(c)
                  ? "bg-ember/15 text-ember"
                  : "border border-edge text-smoke hover:text-bone"
              }`}
            >
              {CATEGORY_TITLE[c]} · {counts[c]}
            </button>
          ))}
          {cats.size > 0 && (
            <button onClick={() => setCats(new Set())} className="text-xs text-proof hover:underline">
              clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search issues…"
            aria-label="Search issues"
            className="min-w-0 flex-1 rounded-lg border border-edge bg-ash px-4 py-2 text-sm text-bone placeholder:text-smoke/70 focus:border-proof/60"
          />
          <div className="flex gap-1">
            {SEV_FILTERS.map((s) => (
              <button
                key={s.label}
                onClick={() => setSevMax(s.max)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  sevMax === s.max ? "bg-bone/10 text-bone" : "text-smoke hover:text-bone"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Findings */}
      {groups.length === 0 ? (
        <p className="mt-10 text-center text-sm text-smoke">No issues match these filters.</p>
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map((g) => (
            <section key={g.cat}>
              <h2 className="mb-3 font-display text-xl font-bold">
                {CATEGORY_TITLE[g.cat]}{" "}
                <span className="font-mono text-sm font-normal text-smoke">{g.items.length}</span>
              </h2>
              <div className="space-y-4">
                {g.items.map((f, i) => (
                  <FindingCard key={i} f={f} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
