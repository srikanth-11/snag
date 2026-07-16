import type { Finding, Severity } from "@/lib/types";

const RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function maxSeverity(a: Severity, b: Severity): Severity {
  return RANK[a] >= RANK[b] ? a : b;
}

// Digits masked so "500 GET /cart?id=1" and "…?id=2" collapse to one finding.
function norm(s: string): string {
  return s.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim().slice(0, 120);
}

function key(f: Finding): string {
  return `${f.kind}|${norm(f.title)}|${norm(f.evidence[0] ?? "")}`;
}

// Merge findings describing the same root problem; keep the highest severity
// and union their evidence.
export function dedupe(findings: Finding[]): Finding[] {
  const map = new Map<string, Finding>();
  for (const f of findings) {
    const k = key(f);
    const existing = map.get(k);
    if (!existing) {
      map.set(k, { ...f, evidence: [...f.evidence] });
      continue;
    }
    existing.severity = maxSeverity(existing.severity, f.severity);
    for (const e of f.evidence) {
      if (!existing.evidence.includes(e)) existing.evidence.push(e);
    }
  }
  return [...map.values()];
}
