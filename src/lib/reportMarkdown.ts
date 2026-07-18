import type { Finding } from "@/lib/types";

// Markdown for a single finding, used by the "Copy as GitHub issue" button.
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
