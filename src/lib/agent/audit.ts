import type { Page } from "playwright";
import type { Finding, FindingCategory, Severity } from "@/lib/types";

interface RawIssue {
  kind: string;
  detail: string;
  evidence?: string[];
}

const META: Record<string, { category: FindingCategory; severity: Severity; title: string }> = {
  "font-hierarchy": {
    category: "visual",
    severity: "medium",
    title: "Heading sizes don't follow a clear hierarchy",
  },
  "tiny-fonts": { category: "visual", severity: "low", title: "Body text is too small to read easily" },
  "type-scale": {
    category: "visual",
    severity: "low",
    title: "Inconsistent type scale (many distinct font sizes)",
  },
  "mixed-content": {
    category: "network",
    severity: "high",
    title: "Insecure resources on a secure page (mixed content)",
  },
  "img-dimensions": {
    category: "visual",
    severity: "low",
    title: "Images without width/height (causes layout shift)",
  },
  "img-distorted": { category: "visual", severity: "low", title: "Images shown at a distorted aspect ratio" },
};

// Deterministic DOM/visual audit for what axe doesn't cover: font hierarchy,
// legibility, type scale, mixed content, and image layout issues.
export async function runAudit(page: Page): Promise<Finding[]> {
  try {
    const issues = (await page.evaluate(() => {
      const out: { kind: string; detail: string; evidence?: string[] }[] = [];
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el as HTMLElement);
        return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none";
      };
      const sizeOf = (el: Element) => parseFloat(getComputedStyle(el as HTMLElement).fontSize) || 0;
      const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];

      // 1. Heading hierarchy — deeper headings should render smaller than shallower ones.
      const levelSize: Record<number, number> = {};
      for (let lvl = 1; lvl <= 4; lvl++) {
        const els = [...document.querySelectorAll(`h${lvl}`)].filter(visible);
        if (els.length) levelSize[lvl] = median(els.map(sizeOf));
      }
      const levels = Object.keys(levelSize).map(Number).sort((a, b) => a - b);
      for (let i = 1; i < levels.length; i++) {
        const hi = levels[i - 1];
        const lo = levels[i];
        if (levelSize[lo] >= levelSize[hi]) {
          out.push({
            kind: "font-hierarchy",
            detail: `An h${lo} (${Math.round(levelSize[lo])}px) is not smaller than an h${hi} (${Math.round(levelSize[hi])}px), so heading size doesn't communicate structure.`,
          });
        }
      }

      // 2. Legibility — a meaningful share of body text below 12px.
      let tiny = 0;
      let total = 0;
      document.querySelectorAll("p, span, li, a, td, label").forEach((el) => {
        if (el.children.length || !el.textContent?.trim() || !visible(el)) return;
        total++;
        if (sizeOf(el) < 12) tiny++;
      });
      if (total > 12 && tiny / total > 0.15) {
        out.push({
          kind: "tiny-fonts",
          detail: `${tiny} of ${total} text elements use a font size below 12px, which is hard to read (especially on mobile).`,
        });
      }

      // 3. Type-scale sprawl — too many distinct sizes signals no system.
      const sizes = new Set<number>();
      document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,li,a,button,td,label").forEach((el) => {
        if (visible(el) && el.textContent?.trim()) sizes.add(Math.round(sizeOf(el)));
      });
      if (sizes.size >= 14) {
        out.push({
          kind: "type-scale",
          detail: `${sizes.size} distinct font sizes are in use, suggesting there is no consistent type scale.`,
        });
      }

      // 4. Mixed content on a secure page.
      if (location.protocol === "https:") {
        const urls = [...document.querySelectorAll("img, script, link, iframe")]
          .map((e) => (e as HTMLImageElement).src || (e as HTMLLinkElement).href || "")
          .filter((u) => u.startsWith("http://"));
        if (urls.length) {
          out.push({
            kind: "mixed-content",
            detail: `${urls.length} resource(s) load over insecure http:// on an https page — browsers may block them.`,
            evidence: urls.slice(0, 3),
          });
        }
      }

      // 5. Images: missing dimensions (layout shift) and distortion.
      let noDim = 0;
      let distorted = 0;
      document.querySelectorAll("img").forEach((img) => {
        if (!visible(img)) return;
        if (!img.getAttribute("width") && !img.getAttribute("height")) noDim++;
        if (img.naturalWidth && img.naturalHeight && img.clientWidth && img.clientHeight) {
          const na = img.naturalWidth / img.naturalHeight;
          const ca = img.clientWidth / img.clientHeight;
          if (Math.abs(na - ca) / na > 0.15) distorted++;
        }
      });
      if (noDim > 0)
        out.push({
          kind: "img-dimensions",
          detail: `${noDim} image(s) have no width/height attributes, which can cause layout shift (CLS).`,
        });
      if (distorted > 0)
        out.push({
          kind: "img-distorted",
          detail: `${distorted} image(s) are displayed at a distorted aspect ratio.`,
        });

      return out;
    })) as RawIssue[];

    return issues
      .filter((i) => META[i.kind])
      .map((i) => {
        const m = META[i.kind];
        return {
          kind: "hard" as const,
          category: m.category,
          severity: m.severity,
          title: m.title,
          detail: i.detail,
          evidence: i.evidence ?? [],
          repro: [],
          verified: true,
        } satisfies Finding;
      });
  } catch {
    return [];
  }
}
