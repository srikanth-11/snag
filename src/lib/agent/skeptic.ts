import type { Finding, Severity, Verdict } from "@/lib/types";
import { think, type ThinkJson } from "@/lib/llm";
import { VERDICT_SHAPE } from "@/lib/llm/schemas";

function normSev(s?: string): Severity {
  return s === "critical" || s === "high" || s === "medium" || s === "low" ? s : "low";
}

// Refute a candidate finding. Defaults to real=false when the model errors or is
// unsure — a false alarm that slips through costs more trust than a missed one.
export async function verifyFinding(
  f: Finding,
  imageB64?: string,
  thinkFn: ThinkJson = think,
): Promise<Verdict> {
  const prompt = `A QA agent reported this possible bug. Be a skeptic: is it a REAL, user-facing bug, or a false alarm? Default to real=false when unsure.

Title: ${f.title}
Detail: ${f.detail}
Evidence: ${f.evidence.join("; ") || "(none — visual only)"}

Respond with ONLY JSON:
${VERDICT_SHAPE}`;

  try {
    const v = (await thinkFn({ prompt, imageB64 })) as Verdict;
    return {
      real: Boolean(v.real),
      severity: normSev(v.severity),
      reason: (v.reason ?? "").slice(0, 300),
    };
  } catch {
    return { real: false, severity: f.severity, reason: "skeptic unavailable" };
  }
}

// Hard findings are objective (they came from the browser); only soft findings
// go through the skeptic. Returns the survivors, marked verified.
export async function screenFindings(
  findings: Finding[],
  thinkFn: ThinkJson = think,
): Promise<Finding[]> {
  const out: Finding[] = [];
  for (const f of findings) {
    if (f.kind === "hard") {
      out.push(f);
      continue;
    }
    const v = await verifyFinding(f, undefined, thinkFn);
    if (v.real) out.push({ ...f, verified: true, severity: v.severity });
  }
  return out;
}
