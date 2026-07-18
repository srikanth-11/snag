import { chromium, type Browser, type Page } from "playwright";
import type { Driver } from "@/lib/agent/loop";
import type { HuntAuth } from "@/lib/types";
import { attachObservers } from "@/lib/agent/observers";
import { execute } from "@/lib/agent/actions";
import { attemptLogin } from "@/lib/agent/login";
import { runAxe } from "@/lib/agent/a11y";
import { runAudit } from "@/lib/agent/audit";
import { runPerf } from "@/lib/agent/perf";
import { runResponsive } from "@/lib/agent/responsive";
import { isBlockedHost } from "@/lib/ssrf";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) return browser;
  browser = await chromium.launch({
    // Some sites' login flows only work in a headed browser; on the server this
    // runs headed under a virtual display (xvfb). SNAG_HEADFUL=1 forces headed.
    headless: process.env.SNAG_HEADFUL !== "1",
    args: [
      "--disable-dev-shm-usage",
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
  // Resilient to in-flight navigations (e.g. a redirect right after login):
  // wait for the DOM, retry once, and fall back to text-only rather than crash.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
      const buf = await page.screenshot({ type: "jpeg", quality: 55 });
      return buf.toString("base64");
    } catch {
      await page.waitForTimeout(600).catch(() => {});
    }
  }
  return "";
}

// A compact list of interactive elements for the prompt (Playwright dropped the
// accessibility snapshot API, so we read the DOM directly).
export async function axDigest(page: Page): Promise<string> {
  try {
    return await axDigestInner(page);
  } catch {
    return "";
  }
}

async function axDigestInner(page: Page): Promise<string> {
  const items = await page.evaluate(() => {
    const out: string[] = [];
    const els = document.querySelectorAll(
      'a, button, input:not([type="password"]), textarea, select, [role="button"], [role="link"], [role="textbox"]',
    );
    els.forEach((el) => {
      if (out.length > 90) return;
      const tag = el.getAttribute("role") ?? el.tagName.toLowerCase();
      // Never read an element's .value — a typed credential must not reach the
      // digest that goes to the LLM.
      const label =
        (el as HTMLElement).innerText?.trim() ||
        el.getAttribute("aria-label") ||
        el.getAttribute("placeholder") ||
        el.getAttribute("name") ||
        "";
      if (label) out.push(`${tag}: ${label}`.slice(0, 120));
    });
    return out;
  });
  return items.slice(0, 90).join("\n");
}

// Real Playwright-backed implementation of the loop's Driver interface.
// When `auth` is given, logs in first (deterministically) so the hunt runs
// against the app behind the login wall.
export async function createPlaywrightDriver(url: string, auth?: HuntAuth): Promise<Driver> {
  const b = await getBrowser();
  // Present as a normal desktop Chrome — some sites (especially their login/auth
  // flow) reject the default "HeadlessChrome" UA and the webdriver flag.
  const context = await b.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    locale: "en-US",
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  // SSRF guard at the network layer: isSafeTarget only vetted the initial URL,
  // but redirects and agent-driven navigation can still reach private hosts.
  // Abort any request whose host is private/loopback/link-local/metadata.
  await context.route("**/*", async (route) => {
    let host = "";
    try {
      host = new URL(route.request().url()).hostname;
    } catch {
      // no host (data:/blob:/about:) — allow
    }
    if (await isBlockedHost(host)) {
      await route.abort("blockedbyclient").catch(() => {});
      return;
    }
    await route.continue().catch(() => {});
  });

  const page = await context.newPage();

  // Log in before observers attach, so the login page's own noise isn't
  // reported as findings.
  if (auth?.username && auth.password) {
    await page
      .goto(auth.loginUrl || url, { waitUntil: "domcontentloaded", timeout: 20000 })
      .catch(() => {});
    // Let a client-rendered (SPA) login form hydrate before we interact, or the
    // click hits a dead form and no sign-in happens.
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800).catch(() => {});
    await attemptLogin(page, auth);
  }

  const obs = attachObservers(page);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  // Let heavy SPA content render before the first screenshot, so the agent
  // doesn't judge a still-loading page as broken.
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200).catch(() => {});

  return {
    currentUrl: () => page.url(),
    screenshot: () => screenshotB64(page),
    digest: () => axDigest(page),
    act: (action) => execute(page, action),
    drain: () => obs.drain(),
    scanA11y: async (uploadCrop) => [
      ...(await runAxe(page, uploadCrop)),
      ...(await runAudit(page)),
    ],
    scanPerf: () => runPerf(page),
    scanResponsive: () => runResponsive(page),
    dispose: async () => {
      obs.dispose();
      await context.close().catch(() => {});
    },
  };
}
