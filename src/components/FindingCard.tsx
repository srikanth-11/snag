"use client";

import { toast } from "sonner";
import type { Finding, FindingCategory } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SnaggedStamp } from "@/components/SnaggedStamp";

const CATEGORY_LABEL: Record<FindingCategory, string> = {
  accessibility: "accessibility",
  error: "error",
  network: "network",
  visual: "visual",
  ux: "ux",
  performance: "performance",
};

function CategoryBadge({ category }: { category: FindingCategory }) {
  return (
    <span className="rounded border border-edge bg-bone/5 px-2 py-0.5 font-mono text-[11px] lowercase text-smoke">
      {CATEGORY_LABEL[category]}
    </span>
  );
}

function toIssueMarkdown(f: Finding): string {
  const parts = [
    `## ${f.title}`,
    ``,
    `**Category:** ${f.category}  ·  **Severity:** ${f.severity}`,
  ];
  parts.push(``, `**What happens:** ${f.detail || "—"}`);
  if (f.selector) parts.push(``, `**Element:** \`${f.selector}\``);
  if (f.repro.length) parts.push(``, `**Steps to reproduce:**`, ...f.repro);
  if (f.evidence.length) parts.push(``, `**Evidence:**`, "```", ...f.evidence, "```");
  if (f.docsUrl) parts.push(``, `**How to fix:** ${f.docsUrl}`);
  if (f.screenshotPath) parts.push(``, `![screenshot](${f.screenshotPath})`);
  parts.push(``, `_Found by Snag._`);
  return parts.join("\n");
}

export function FindingCard({ f }: { f: Finding }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(toIssueMarkdown(f));
      toast.success("Copied. Paste into a new GitHub issue.");
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  }

  return (
    <div className="rounded-xl border border-edge bg-ash/40 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={f.severity} />
        <CategoryBadge category={f.category} />
        {f.verified && <SnaggedStamp />}
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold">{f.title}</h3>
      {f.detail && <p className="mt-1 text-sm leading-relaxed text-smoke">{f.detail}</p>}

      {f.selector && (
        <p className="mt-2 break-all font-mono text-xs text-proof">{f.selector}</p>
      )}

      {f.repro.length > 0 && (
        <ol className="mt-3 space-y-1 font-mono text-xs text-bone">
          {f.repro.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      )}

      {f.evidence.length > 0 && (
        <pre className="mt-3 overflow-x-auto rounded bg-void/60 p-3 font-mono text-xs text-proof">
          {f.evidence.join("\n")}
        </pre>
      )}

      {f.screenshotPath && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={f.screenshotPath}
          alt="Screenshot at the moment the bug was found"
          className="mt-3 max-h-64 rounded border border-edge"
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={copy}
          className="rounded-lg border border-edge px-3 py-1.5 text-sm text-bone transition-colors hover:border-proof/50"
        >
          Copy as GitHub issue
        </button>
        {f.docsUrl && (
          <a
            href={f.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-proof hover:underline"
          >
            How to fix ↗
          </a>
        )}
      </div>
    </div>
  );
}
