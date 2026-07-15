import { chromium, type Browser, type Page } from "playwright";
import type { Driver } from "@/lib/agent/loop";
import { attachObservers } from "@/lib/agent/observers";
import { execute } from "@/lib/agent/actions";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) return browser;
  browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-sandbox",
      "--js-flags=--max-old-space-size=256",
    ],
  });
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}

export async function screenshotB64(page: Page): Promise<string> {
  const buf = await page.screenshot({ type: "jpeg", quality: 55 });
  return buf.toString("base64");
}

// A compact list of interactive elements for the prompt (Playwright dropped the
// accessibility snapshot API, so we read the DOM directly).
export async function axDigest(page: Page): Promise<string> {
  const items = await page.evaluate(() => {
    const out: string[] = [];
    const els = document.querySelectorAll(
      'a, button, input, textarea, select, [role="button"], [role="link"], [role="textbox"]',
    );
    els.forEach((el) => {
      if (out.length > 60) return;
      const tag = el.getAttribute("role") ?? el.tagName.toLowerCase();
      const label =
        (el as HTMLElement).innerText?.trim() ||
        el.getAttribute("aria-label") ||
        el.getAttribute("placeholder") ||
        el.getAttribute("name") ||
        (el as HTMLInputElement).value ||
        "";
      if (label) out.push(`${tag}: ${label}`.slice(0, 120));
    });
    return out;
  });
  return items.slice(0, 60).join("\n");
}

// Real Playwright-backed implementation of the loop's Driver interface.
export async function createPlaywrightDriver(url: string): Promise<Driver> {
  const b = await getBrowser();
  const context = await b.newContext({ viewport: { width: 1100, height: 800 } });
  const page = await context.newPage();
  const obs = attachObservers(page);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});

  return {
    currentUrl: () => page.url(),
    screenshot: () => screenshotB64(page),
    digest: () => axDigest(page),
    act: (action) => execute(page, action),
    drain: () => obs.drain(),
    dispose: async () => {
      obs.dispose();
      await context.close().catch(() => {});
    },
  };
}
