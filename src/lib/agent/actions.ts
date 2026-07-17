import type { Page, Locator } from "playwright";
import type { Action } from "@/lib/types";

// Third-party sign-in the agent must never use — it leads off-site to an OAuth
// provider and abandons the app under test. Email/password login is handled
// deterministically before the hunt starts.
const SSO_BUTTON =
  /sign ?in with|log ?in with|continue with|\b(clever|google|apple|microsoft|facebook|okta|saml|sso)\b/i;
const SSO_DOMAIN =
  /(^|\.)(clever\.com|accounts\.google\.com|login\.microsoftonline\.com|appleid\.apple\.com|facebook\.com|okta\.com)$/i;

// Resolve a target string to a visible element. Exact name matches are tried
// first so "Sign In" doesn't fuzzily resolve to "Sign in with Clever".
async function locate(page: Page, target?: string): Promise<Locator | null> {
  if (!target) return null;
  const attempts = [
    page.getByRole("button", { name: target, exact: true }),
    page.getByRole("link", { name: target, exact: true }),
    page.getByRole("textbox", { name: target, exact: true }),
    page.getByRole("button", { name: target }),
    page.getByRole("link", { name: target }),
    page.getByRole("textbox", { name: target }),
    page.getByPlaceholder(target),
    page.getByLabel(target),
    page.getByText(target, { exact: false }),
  ];
  for (const loc of attempts) {
    try {
      const first = loc.first();
      if (await first.isVisible({ timeout: 500 })) return first;
    } catch {
      // try the next strategy
    }
  }
  return null;
}

async function elementLabel(el: Locator): Promise<string> {
  try {
    const text = (await el.textContent())?.trim();
    if (text) return text;
    return (await el.getAttribute("aria-label"))?.trim() ?? "";
  } catch {
    return "";
  }
}

// Execute one action. Failures are intentionally swallowed by the caller — a
// broken selector is an observation for the loop, not a crash.
export async function execute(page: Page, action: Action): Promise<void> {
  switch (action.kind) {
    case "navigate": {
      if (!action.value) break;
      let host = "";
      try {
        host = new URL(action.value).hostname;
      } catch {
        // relative or malformed — let Playwright handle it
      }
      if (host && SSO_DOMAIN.test(host)) {
        throw new Error(`refusing navigation to sign-in provider: ${host}`);
      }
      await page.goto(action.value, { waitUntil: "domcontentloaded", timeout: 15000 });
      break;
    }
    case "click": {
      if (SSO_BUTTON.test(action.target ?? "")) {
        throw new Error(`refusing third-party sign-in: "${action.target}"`);
      }
      const el = await locate(page, action.target);
      if (!el) throw new Error(`no element for "${action.target}"`);
      // Guard against a fuzzy match landing on an SSO button (e.g. "Sign In"
      // resolving to "Sign in with Clever").
      const label = await elementLabel(el);
      if (SSO_BUTTON.test(label)) {
        throw new Error(`refusing third-party sign-in (resolved to "${label}")`);
      }
      await el.click({ timeout: 3000 });
      break;
    }
    case "type": {
      const el = await locate(page, action.target);
      if (!el) throw new Error(`no field for "${action.target}"`);
      await el.fill(action.value ?? "", { timeout: 3000 });
      break;
    }
    case "scroll":
      await page.mouse.wheel(0, 800);
      break;
    case "back":
      await page.goBack({ waitUntil: "domcontentloaded", timeout: 8000 });
      break;
    case "stop":
      break;
  }
}
