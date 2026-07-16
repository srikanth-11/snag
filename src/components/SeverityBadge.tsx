import type { Severity } from "@/lib/types";

const STYLES: Record<Severity, string> = {
  critical: "bg-ember/25 text-ember border-ember/50",
  high: "bg-ember/15 text-ember border-ember/40",
  medium: "bg-bone/10 text-bone border-edge",
  low: "bg-smoke/10 text-smoke border-edge",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${STYLES[severity]}`}
    >
      {severity}
    </span>
  );
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
