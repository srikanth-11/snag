import type { Finding, Severity } from "@/lib/types";
import { think } from "@/lib/llm";
import { setJobSummary, getTopFindingsForFix, setFindingFix } from "@/lib/db";

const SEV_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function digest(findings: Finding[], cap: number): string {
  return [...findings]
    .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity])
    .slice(0, cap)
    .map((f) => `- [${f.severity}/${f.category}] ${f.title}`)
    .join("\n");
}

// Runs after a hunt finishes: a narrative summary of the whole run, plus a
// concrete root-cause fix for the most serious findings. Entirely best-effort —
// never throws, so it can't turn a finished hunt into a failed one.
export async function enrichHunt(jobId: string, url: string, findings: Finding[]): Promise<void> {
  if (!findings.length) return;

  // 1) Narrative summary.
  try {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) c[f.severity]++;
    const prompt =
      `An automated QA agent just finished testing ${url}. It found ${findings.length} issues ` +
      `(${c.critical} critical, ${c.high} high, ${c.medium} medium, ${c.low} low). Top findings:\n` +
      `${digest(findings, 24)}\n\n` +
      `Write a 2-3 sentence summary for the developer: the overall state of the app, which area is ` +
      `weakest, and the single most serious issue to fix first. Plain English, no markdown, no ` +
      `preamble. Respond ONLY as JSON: {"summary": "..."}`;
    const { summary } = await think<{ summary?: string }>({ prompt });
    if (summary && summary.trim()) await setJobSummary(jobId, summary.trim().slice(0, 700));
  } catch {
    // best-effort
  }

  // 2) Root-cause fix for the most serious findings.
  try {
    const top = await getTopFindingsForFix(jobId, 6);
    for (const f of top) {
      try {
        const prompt =
          `A QA finding on ${url}. Severity: ${f.severity}. Category: ${f.category ?? "general"}. ` +
          `Title: ${f.title}. Details: ${f.detail ?? ""}. Element: ${f.selector ?? "n/a"}.\n` +
          `Give a concrete root-cause fix a developer can apply. 1-3 sentences; include a minimal ` +
          `code snippet (HTML/CSS/JS/ARIA) only if it genuinely helps. No preamble. ` +
          `Respond ONLY as JSON: {"fix": "..."}`;
        const { fix } = await think<{ fix?: string }>({ prompt });
        if (fix && fix.trim()) await setFindingFix(f.id, fix.trim().slice(0, 900));
      } catch {
        // skip this finding
      }
    }
  } catch {
    // best-effort
  }
}
