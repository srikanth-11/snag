import type { Finding } from "@/lib/types";

// Markdown for a single finding — used by "Copy as GitHub issue" and the
// whole-report export.
export function findingMarkdown(f: Finding): string {
  const parts = [`## ${f.title}`, ``, `**Category:** ${f.category}  ·  **Severity:** ${f.severity}`];
  parts.push(``, `**What happens:** ${f.detail || "(none)"}`);
  if (f.selector) parts.push(``, `**Element:** \`${f.selector}\``);
  if (f.suggestion) parts.push(``, `**Suggested fix:** ${f.suggestion}`);
  if (f.fix) parts.push(``, `**Root-cause fix:**`, "```", f.fix, "```");
  if (f.repro.length) parts.push(``, `**Steps to reproduce:**`, ...f.repro);
  if (f.evidence.length) parts.push(``, `**Evidence:**`, "```", ...f.evidence, "```");
  if (f.docsUrl) parts.push(``, `**How to fix:** ${f.docsUrl}`);
  if (f.screenshotPath) parts.push(``, `![screenshot](${f.screenshotPath})`);
  parts.push(``, `_Found by Snag._`);
  return parts.join("\n");
}

// The full report as one markdown document.
export function reportMarkdown(opts: {
  url: string;
  score: number;
  grade: string;
  summary?: string;
  findings: Finding[];
}): string {
  const { url, score, grade, summary, findings } = opts;
  const head = [
    `# Snag report — ${url}`,
    ``,
    `**Health:** ${score}/100 (${grade})  ·  **Issues found:** ${findings.length}`,
  ];
  if (summary) head.push(``, summary);
  head.push(``, `---`, ``);
  return head.join("\n") + findings.map(findingMarkdown).join("\n\n---\n\n") + "\n";
}
