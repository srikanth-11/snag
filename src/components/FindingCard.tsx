"use client";

import { toast } from "sonner";
import type { Finding } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SnaggedStamp } from "@/components/SnaggedStamp";

function toIssueMarkdown(f: Finding): string {
  const parts = [
    `## ${f.title}`,
    ``,
    `**Severity:** ${f.severity}`,
    ``,
    `**What happens:** ${f.detail || "—"}`,
  ];
  if (f.repro.length) {
    parts.push(``, `**Steps to reproduce:**`, ...f.repro);
  }
  if (f.evidence.length) {
    parts.push(``, `**Evidence:**`, "```", ...f.evidence, "```");
  }
  if (f.screenshotPath) {
    parts.push(``, `![screenshot](${f.screenshotPath})`);
  }
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
      <div className="flex items-center gap-2">
        <SeverityBadge severity={f.severity} />
        {f.verified && <SnaggedStamp />}
        <span className="ml-auto font-mono text-xs text-smoke">{f.kind}</span>
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold">{f.title}</h3>
      {f.detail && <p className="mt-1 text-sm leading-relaxed text-smoke">{f.detail}</p>}

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

      <button
        onClick={copy}
        className="mt-4 rounded-lg border border-edge px-3 py-1.5 text-sm text-bone transition-colors hover:border-proof/50"
      >
        Copy as GitHub issue
      </button>
    </div>
  );
}
