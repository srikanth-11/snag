import type { Page, Locator } from "playwright";
import type { HuntAuth } from "@/lib/types";

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
// submit. Credentials never touch the LLM — this is plain browser automation.
export async function attemptLogin(
  page: Page,
  auth: HuntAuth,
): Promise<{ ok: boolean; reason?: string }> {
  const userField = await firstVisible(page, [
    'input[type="email"]',
    'input[autocomplete="username"]',
    'input[name*="email" i]',
    'input[name*="user" i]',
    'input[id*="email" i]',
    'input[id*="user" i]',
    'input[type="text"]',
  ]);
  const passField = await firstVisible(page, [
    'input[type="password"]',
    'input[autocomplete="current-password"]',
    'input[name*="pass" i]',
  ]);

  if (!userField || !passField) {
    return { ok: false, reason: "couldn't find the login fields on that page" };
  }

  // Type key-by-key (not fill) so controlled React/Vue inputs fire their change
  // handlers and update state — otherwise the form submits with empty values.
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

  const submit =
    (await firstVisible(page, ['button[type="submit"]', 'input[type="submit"]'])) ??
    page.getByRole("button", { name: /log ?in|sign ?in|continue|submit|next/i }).first();

  try {
    if (submit) await submit.click({ timeout: 5000 });
    else await passField.press("Enter");
  } catch {
    await passField.press("Enter").catch(() => {});
  }

  // Give the auth round-trip time to complete and cookies to land.
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  return { ok: true };
}
