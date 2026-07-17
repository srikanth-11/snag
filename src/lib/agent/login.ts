import type { Page, Locator } from "playwright";
import type { HuntAuth } from "@/lib/types";

const USER_SELECTORS = [
  'input[type="email"]',
  'input[autocomplete="username"]',
  'input[name*="email" i]',
  'input[name*="user" i]',
  'input[id*="email" i]',
  'input[id*="user" i]',
  'input[placeholder*="email" i]',
  'input[placeholder*="user" i]',
  'input[type="text"]',
];
const PASS_SELECTORS = [
  'input[type="password"]',
  'input[autocomplete="current-password"]',
  'input[name*="pass" i]',
  'input[placeholder*="password" i]',
];

// Matches SSO buttons ("Sign in with Google/Clever/…") so we never treat one as
// the email/password submit.
const SSO = /with|google|clever|apple|microsoft|facebook|okta|saml|sso/i;

async function firstVisible(page: Page, selectors: string[]): Promise<Locator | null> {
  for (const sel of selectors) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 500 })) return loc;
    } catch {
      // try next selector
    }
  }
  return null;
}

// Deterministic login before the hunt: fill the username + password fields and
// submit the email/password form (not an SSO button). Credentials never touch
// the LLM — this is plain browser automation.
export async function attemptLogin(
  page: Page,
  auth: HuntAuth,
): Promise<{ ok: boolean; reason?: string }> {
  let passField = await firstVisible(page, PASS_SELECTORS);

  // Some pages hide the email/password form behind a toggle (SSO-first). Reveal it.
  if (!passField) {
    const reveal = page
      .getByRole("button", {
        name: /e-?mail|use email|sign ?in with email|continue with email|use password|log ?in with email/i,
      })
      .filter({ hasNotText: SSO })
      .first();
    if (await reveal.isVisible({ timeout: 800 }).catch(() => false)) {
      await reveal.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(600);
      passField = await firstVisible(page, PASS_SELECTORS);
    }
  }

  const userField = await firstVisible(page, USER_SELECTORS);
  if (!userField || !passField) {
    return { ok: false, reason: "couldn't find the email/password fields on that page" };
  }

  // Type key-by-key (not fill) so controlled React/Vue inputs update their state.
  try {
    await userField.click({ timeout: 3000 }).catch(() => {});
    await userField.fill("");
    await userField.pressSequentially(auth.username, { delay: 15 });
    await passField.click({ timeout: 3000 }).catch(() => {});
    await passField.fill("");
    await passField.pressSequentially(auth.password, { delay: 15 });
  } catch {
    return { ok: false, reason: "couldn't type into the login fields" };
  }

  // Submit via the plain submit button — an exact-ish "Sign in"/"Log in" that is
  // NOT an SSO button — else press Enter inside the password field.
  const submit = page
    .getByRole("button", { name: /^\s*(sign ?in|log ?in|continue|submit|next)\s*$/i })
    .filter({ hasNotText: SSO })
    .first();
  try {
    if (await submit.isVisible({ timeout: 1000 }).catch(() => false)) {
      await submit.click({ timeout: 5000 });
    } else {
      await passField.press("Enter");
    }
  } catch {
    await passField.press("Enter").catch(() => {});
  }

  // Give the auth round-trip time to complete and cookies to land.
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  return { ok: true };
}
