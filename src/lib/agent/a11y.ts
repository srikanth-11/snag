import type { Page } from "playwright";
import axe from "axe-core";
import type { Finding, Severity } from "@/lib/types";

function severityFromImpact(impact: string | null | undefined): Severity {
  switch (impact) {
    case "critical":
      return "critical";
    case "serious":
      return "high";
    case "moderate":
      return "medium";
    default:
      return "low";
  }
}

interface AxeNode {
  target?: string[];
  failureSummary?: string;
  html?: string;
}
interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  description: string;
  helpUrl: string;
  tags: string[];
  nodes: AxeNode[];
}

// Capture a cropped screenshot of an element and upload it, returning its URL.
async function cropElement(
  page: Page,
  selector: string,
  upload: (b64: string) => Promise<string>,
): Promise<string | undefined> {
  try {
    const loc = page.locator(selector).first();
    if (!(await loc.isVisible({ timeout: 1000 }).catch(() => false))) return undefined;
    await loc.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
    const buf = await loc.screenshot({ type: "jpeg", quality: 70, timeout: 3000 });
    return (await upload(buf.toString("base64"))) || undefined;
  } catch {
    return undefined;
  }
}

// Inject and run axe-core, mapping WCAG violations to findings. Deterministic —
// no LLM — so these are precise, objective, and WCAG-referenced. Covers colour
// contrast, missing alt text, unlabelled inputs, heading order, ARIA misuse,
// landmarks, link/button names, and more. When `cropUpload` is given, attaches
// a cropped screenshot of the offending element to each finding.
export async function runAxe(
  page: Page,
  cropUpload?: (b64: string) => Promise<string>,
): Promise<Finding[]> {
  try {
    // Inject axe by evaluating its source (bypasses target CSP that would block
    // an injected <script> tag), then run it in the same context.
    await page.evaluate(axe.source);
    const results = (await page.evaluate(async () => {
      const w = window as unknown as {
        axe: { run: (ctx: Document, opts: unknown) => Promise<unknown> };
      };
      return w.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
        },
        resultTypes: ["violations"],
      });
    })) as { violations?: AxeViolation[] };

    const violations = results?.violations ?? [];
    const findings: Finding[] = violations.slice(0, 40).map((v) => {
      const wcag = v.tags.filter((t) => t.startsWith("wcag")).join(" ");
      const first = v.nodes[0];
      const count = v.nodes.length;
      return {
        kind: "hard" as const,
        category: "accessibility" as const,
        severity: severityFromImpact(v.impact),
        title: v.help,
        detail:
          `${v.description}${wcag ? ` [${wcag.toUpperCase()}]` : ""} — affects ${count} element${count === 1 ? "" : "s"}.`.slice(
            0,
            400,
          ),
        evidence: v.nodes.slice(0, 3).map((n) => {
          const sel = n.target?.join(" ") ?? "";
          const why = n.failureSummary ? ` — ${n.failureSummary.replace(/\s+/g, " ")}` : "";
          return `${sel}${why}`.slice(0, 300);
        }),
        repro: [],
        selector: first?.target?.join(" "),
        docsUrl: v.helpUrl,
        verified: true,
      } satisfies Finding;
    });

    // Attach an element-cropped screenshot to the first ~12 findings that have
    // a selector, so the report shows exactly where each issue is.
    if (cropUpload) {
      let cropped = 0;
      for (const f of findings) {
        if (cropped >= 12) break;
        if (!f.selector) continue;
        const url = await cropElement(page, f.selector, cropUpload);
        if (url) {
          f.screenshotPath = url;
          cropped++;
        }
      }
    }

    return findings;
  } catch {
    return [];
  }
}
