"use client";

import { useMemo, useState } from "react";
import type { Finding, FindingCategory } from "@/lib/types";
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

export default function ReportView({
  findings,
  score,
  grade,
  pages,
}: {
  findings: Finding[];
  score: number;
  grade: string;
  pages: number;
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

  return (
    <div>
      {/* Score + coverage header */}
      <div className="mt-6 flex flex-wrap items-center gap-6 rounded-xl border border-edge bg-ash/40 p-5">
        <HealthRing score={score} grade={grade} />
        <div className="min-w-0">
          <p className="text-sm text-smoke">Health score</p>
          <p className="mt-1 text-2xl font-bold">
            {findings.length} {findings.length === 1 ? "issue" : "issues"} across {pages}{" "}
            {pages === 1 ? "page" : "pages"}
          </p>
          <p className="mt-1 text-sm text-smoke">
            Snag covers the checks a machine can run. You still own the business logic.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 space-y-3">
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
