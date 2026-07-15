import type { Page, ConsoleMessage, Response } from "playwright";
import type { Severity } from "@/lib/types";

// Objective, model-free evidence collected straight from the browser.
export interface Evidence {
  type: "console" | "pageerror" | "http";
  text: string;
}

export function attachObservers(page: Page) {
  const buffer: Evidence[] = [];

  const onConsole = (m: ConsoleMessage) => {
    const t = m.type();
    if (t === "error" || t === "warning") {
      buffer.push({ type: "console", text: `console.${t}: ${m.text()}`.slice(0, 300) });
    }
  };
  const onPageError = (e: Error) => {
    buffer.push({ type: "pageerror", text: `uncaught: ${e.message}`.slice(0, 300) });
  };
  const onResponse = (r: Response) => {
    const s = r.status();
    if (s >= 400) {
      buffer.push({ type: "http", text: `${s} ${r.request().method()} ${r.url()}`.slice(0, 300) });
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  return {
    drain(): Evidence[] {
      return buffer.splice(0, buffer.length);
    },
    dispose() {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("response", onResponse);
    },
  };
}

export function classifySeverity(ev: Evidence): Severity {
  if (ev.type === "pageerror") return "high";
  if (ev.type === "http") {
    const status = parseInt(ev.text, 10);
    if (status >= 500) return "high";
    if (status === 404) return "low";
    return "medium";
  }
  // console
  return ev.text.startsWith("console.error") ? "medium" : "low";
}
