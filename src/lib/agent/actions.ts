import type { Page, Locator } from "playwright";
import type { Action } from "@/lib/types";

// Resolve a target string to a visible element, tolerant of how the model names it.
async function locate(page: Page, target?: string): Promise<Locator | null> {
  if (!target) return null;
  const attempts = [
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

// Execute one action. Failures are intentionally swallowed — a broken selector
// is an observation for the loop, not a crash.
export async function execute(page: Page, action: Action): Promise<void> {
  switch (action.kind) {
    case "navigate":
      if (action.value)
        await page.goto(action.value, { waitUntil: "domcontentloaded", timeout: 15000 });
      break;
    case "click": {
      const el = await locate(page, action.target);
      if (!el) throw new Error(`no element for "${action.target}"`);
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
