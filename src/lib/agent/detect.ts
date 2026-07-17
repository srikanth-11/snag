import type { Action, Finding, Severity } from "@/lib/types";
import { think, type ThinkJson } from "@/lib/llm";
import { SOFT_FINDINGS_SHAPE } from "@/lib/llm/schemas";
import { buildRepro } from "@/lib/agent/repro";

interface SoftRaw {
  findings?: { title?: string; detail?: string; severity?: string }[];
}

function normalizeSeverity(s?: string): Severity {
  return s === "critical" || s === "high" || s === "medium" || s === "low" ? s : "low";
}

// One vision pass that looks for silent failures the observers can't see:
// dead controls, broken layout, input wrongly accepted, content that never loaded.
export async function detectSoft(opts: {
  imageB64: string;
  url: string;
  actions: Action[];
  think?: ThinkJson;
}): Promise<Finding[]> {
  const run = opts.think ?? think;
  const prompt = `You are auditing a web page for SILENT failures — problems a user would notice but that throw no console error: a dead button, a broken or overlapping layout, a form that accepted clearly invalid input with no message, content that failed to load, or illegible text.

Current URL: ${opts.url}

Look at the screenshot. Report only real, visible problems — do not invent issues. If the page looks fine, return an empty list.

Respond with ONLY JSON in this shape:
${SOFT_FINDINGS_SHAPE}`;

  let raw: SoftRaw;
  try {
    raw = (await run({ prompt, imageB64: opts.imageB64 })) as SoftRaw;
  } catch {
    return [];
  }

  const list = Array.isArray(raw?.findings) ? raw.findings : [];
  return list.slice(0, 5).map((f) => ({
    kind: "soft" as const,
    category: "ux" as const,
    severity: normalizeSeverity(f.severity),
    title: (f.title ?? "Possible issue").slice(0, 120),
    detail: (f.detail ?? "").slice(0, 400),
    evidence: [],
    repro: buildRepro(opts.actions),
    screenshotPath: undefined,
    verified: false,
  }));
}
