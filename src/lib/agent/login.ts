import type { Page, Locator } from "playwright";
import type { HuntAuth } from "@/lib/types";

const PASS_SELECTORS = [
  'input[type="password"]',
  'input[autocomplete="current-password"]',
  'input[name*="pass" i]',
  'input[placeholder*="password" i]',
];

const SSO_SRC = "with|google|clever|apple|microsoft|facebook|okta|saml|sso";

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

// Deterministic login before the hunt. Waits for the (often heavy) React login
// form to hydrate, submits email/password, and retries — a click landed before
// hydration does a native form reload instead of a real sign-in. Success is
// detected when the password field disappears (we navigated into the app).
// Credentials never touch the LLM.
export async function attemptLogin(
  page: Page,
  auth: HuntAuth,
): Promise<{ ok: boolean; reason?: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(attempt === 0 ? 1500 : 1200);

    // Reveal a hidden email/password form (SSO-first pages) if needed.
    let passField = await firstVisible(page, PASS_SELECTORS);
    if (!passField) {
      const reveal = page
        .getByRole("button", {
          name: /e-?mail|use email|sign ?in with email|continue with email|use password|log ?in with email/i,
        })
        .filter({ hasNotText: new RegExp(SSO_SRC, "i") })
        .first();
      if (await reveal.isVisible({ timeout: 800 }).catch(() => false)) {
        await reveal.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(600);
        passField = await firstVisible(page, PASS_SELECTORS);
      }
    }
    if (!passField) {
      return { ok: false, reason: "couldn't find the email/password fields on that page" };
    }

    const outcome = await page.evaluate(
      ({ u, p, ssoSrc }) => {
        const sso = new RegExp(ssoSrc, "i");
        const submitRe = /^\s*(sign ?in|log ?in|continue|submit|next)\s*$/i;
        const setValue = (el: Element, v: string) => {
          const input = el as HTMLInputElement;
          const setter = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(input),
            "value",
          )?.set;
          setter?.call(input, v);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        };
        const email =
          document.querySelector<HTMLInputElement>(
            'input[type="email"], input[autocomplete="username"], input[name*="email" i], input[name*="user" i], input[id*="email" i], input[placeholder*="email" i]',
          ) || document.querySelector<HTMLInputElement>('input[type="text"]');
        const pass = document.querySelector<HTMLInputElement>('input[type="password"]');
        if (!email || !pass) return "nofields";
        setValue(email, u);
        setValue(pass, p);
        const btn = [
          ...document.querySelectorAll<HTMLElement>('button, input[type="submit"]'),
        ].find((b) => {
          const t = (b.textContent || (b as HTMLInputElement).value || "").trim();
          return submitRe.test(t) && !sso.test(t);
        });
        if (btn) {
          btn.click();
          return "clicked";
        }
        if (pass.form) {
          pass.form.requestSubmit();
          return "submitted";
        }
        return "nobutton";
      },
      { u: auth.username, p: auth.password, ssoSrc: SSO_SRC },
    );

    if (outcome === "nofields" || outcome === "nobutton") {
      // give hydration another attempt
      continue;
    }

    // Wait for the auth round-trip / navigation, then check for success.
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const stillHasPassword = await firstVisible(page, PASS_SELECTORS);
    if (!stillHasPassword) return { ok: true };
  }

  return { ok: false, reason: "login didn't take after retries" };
}
