import type { Page } from "playwright";
import type { Finding, Severity } from "@/lib/types";

const BREAKPOINTS = [
  { name: "mobile", w: 375, h: 812 },
  { name: "tablet", w: 768, h: 1024 },
];

function finding(severity: Severity, title: string, detail: string): Finding {
  return {
    kind: "hard",
    category: "visual",
    severity,
    title,
    detail,
    evidence: [],
    repro: [],
    suggestion:
      "Fix the layout at this viewport — use responsive units, let rows wrap, and keep tap targets ≥ 44×44px.",
    verified: true,
  };
}

// Resize to mobile/tablet and check for layout breaks; restore desktop after.
export async function runResponsive(page: Page): Promise<Finding[]> {
  const out: Finding[] = [];
  try {
    for (const bp of BREAKPOINTS) {
      await page.setViewportSize({ width: bp.w, height: bp.h });
      await page.waitForTimeout(500);
      const r = await page.evaluate((vw) => {
        const scrollW = document.documentElement.scrollWidth;
        let small = 0;
        document.querySelectorAll("a, button, input, [role='button']").forEach((el) => {
          const rect = (el as HTMLElement).getBoundingClientRect();
          const s = getComputedStyle(el as HTMLElement);
          if (s.display === "none" || rect.width < 1 || rect.height < 1) return;
          if (rect.width < 44 || rect.height < 44) small++;
        });
        return { overflow: scrollW > vw + 2, scrollW, small };
      }, bp.w);

      if (r.overflow) {
        out.push(
          finding(
            "high",
            `Horizontal scroll on ${bp.name} (${bp.w}px)`,
            `The page is ${r.scrollW}px wide in a ${bp.w}px viewport — content overflows and forces sideways scrolling.`,
          ),
        );
      }
      if (r.small > 6) {
        out.push(
          finding(
            "medium",
            `Tap targets too small on ${bp.name} (${bp.w}px)`,
            `${r.small} buttons/links/inputs are smaller than the recommended 44×44px, hard to tap on touch screens.`,
          ),
        );
      }
    }
  } catch {
    // best-effort
  } finally {
    await page.setViewportSize({ width: 1280, height: 800 }).catch(() => {});
  }
  return out;
}
