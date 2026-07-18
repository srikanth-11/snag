import type { Page } from "playwright";
import type { Finding, Severity } from "@/lib/types";

interface Metrics {
  lcp: number;
  cls: number;
  ttfb: number;
  fcp: number;
  lcpEl: string;
  clsEl: string;
}

// Directional field-style perf metrics from the Performance API (LCP, CLS,
// TTFB, FCP) with the culprit element. Single-load lab numbers are directional,
// not audit-grade, so we grade loosely and only flag clear problems.
export async function runPerf(page: Page): Promise<Finding[]> {
  try {
    const m = (await page.evaluate(
      () =>
        new Promise((resolve) => {
          const cssPath = (node: unknown): string => {
            let el = node as Element | null;
            if (!el || el.nodeType !== 1) return "";
            if ((el as HTMLElement).id) return `#${(el as HTMLElement).id}`;
            const parts: string[] = [];
            let depth = 0;
            while (el && el.nodeType === 1 && depth < 4) {
              let s = el.tagName.toLowerCase();
              if (el.classList.length) s += "." + [...el.classList].slice(0, 2).join(".");
              parts.unshift(s);
              el = el.parentElement;
              depth++;
            }
            return parts.join(" > ").slice(0, 120);
          };

          let lcp = 0;
          let lcpEl = "";
          let cls = 0;
          let worst = 0;
          let clsEl = "";
          try {
            new PerformanceObserver((l) => {
              const e = l.getEntries().pop() as unknown as { startTime: number; element?: Element };
              if (e) {
                lcp = e.startTime;
                if (e.element) lcpEl = cssPath(e.element);
              }
            }).observe({ type: "largest-contentful-paint", buffered: true });
          } catch {}
          try {
            new PerformanceObserver((l) => {
              for (const e of l.getEntries() as unknown as {
                value: number;
                hadRecentInput: boolean;
                sources?: { node?: Element }[];
              }[]) {
                if (e.hadRecentInput) continue;
                cls += e.value;
                if (e.value > worst) {
                  worst = e.value;
                  const n = e.sources?.[0]?.node;
                  if (n) clsEl = cssPath(n);
                }
              }
            }).observe({ type: "layout-shift", buffered: true });
          } catch {}

          setTimeout(() => {
            const nav = performance.getEntriesByType("navigation")[0] as
              | PerformanceNavigationTiming
              | undefined;
            const fcp = performance.getEntriesByName("first-contentful-paint")[0];
            resolve({
              lcp,
              cls,
              ttfb: nav?.responseStart ?? 0,
              fcp: fcp?.startTime ?? 0,
              lcpEl,
              clsEl,
            });
          }, 3500);
        }),
    )) as Metrics;

    const perf = (severity: Severity, title: string, detail: string, selector?: string): Finding => ({
      kind: "hard",
      category: "performance",
      severity,
      title,
      detail,
      evidence: [],
      repro: [],
      selector,
      verified: true,
    });

    const out: Finding[] = [];
    if (m.lcp > 4000)
      out.push(
        perf(
          "high",
          "Slow Largest Contentful Paint (LCP)",
          `The main content took ${(m.lcp / 1000).toFixed(1)}s to appear (good is under 2.5s).`,
          m.lcpEl || undefined,
        ),
      );
    else if (m.lcp > 2500)
      out.push(
        perf(
          "medium",
          "Largest Contentful Paint needs improvement",
          `The main content took ${(m.lcp / 1000).toFixed(1)}s to appear (good is under 2.5s).`,
          m.lcpEl || undefined,
        ),
      );

    if (m.cls > 0.25)
      out.push(
        perf(
          "high",
          "High layout shift (CLS)",
          `Cumulative Layout Shift is ${m.cls.toFixed(3)} (good is under 0.1) — content jumps as the page loads.`,
          m.clsEl || undefined,
        ),
      );
    else if (m.cls > 0.1)
      out.push(
        perf(
          "medium",
          "Layout shift needs improvement (CLS)",
          `Cumulative Layout Shift is ${m.cls.toFixed(3)} (good is under 0.1).`,
          m.clsEl || undefined,
        ),
      );

    if (m.ttfb > 1800)
      out.push(
        perf(
          "medium",
          "Slow server response (TTFB)",
          `The server took ${Math.round(m.ttfb)}ms to respond (good is under 800ms).`,
        ),
      );
    else if (m.ttfb > 800)
      out.push(
        perf(
          "low",
          "Server response could be faster (TTFB)",
          `The server took ${Math.round(m.ttfb)}ms to respond (good is under 800ms).`,
        ),
      );

    return out;
  } catch {
    return [];
  }
}
