import type { Finding, Severity } from "@/lib/types";

const PENALTY: Record<Severity, number> = { critical: 15, high: 8, medium: 3, low: 1 };

// A simple 0–100 health score: start at 100, subtract per finding by severity.
export function healthScore(findings: Finding[]): { score: number; grade: string } {
  const total = findings.reduce((s, f) => s + PENALTY[f.severity], 0);
  const score = Math.max(0, 100 - total);
  const grade =
    score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  return { score, grade };
}
