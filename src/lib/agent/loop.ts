import type { Action, Finding, StreamEvent } from "@/lib/types";
import type { ThinkJson } from "@/lib/llm";
import { buildPrompt, pickPersona, type PersonaKey } from "@/lib/agent/persona";
import { buildRepro } from "@/lib/agent/repro";
import { classifySeverity, type Evidence } from "@/lib/agent/observers";
import { runFlow } from "@/lib/agent/flow";

// The loop drives an abstract Driver so its orchestration logic is testable
// without launching a real browser. browser.ts provides the Playwright driver.
export interface Driver {
  currentUrl(): string;
  screenshot(): Promise<string>;
  digest(): Promise<string>;
  act(action: Action): Promise<void>;
  drain(): Evidence[];
  /** Optional accessibility scan (axe-core) of the current page. */
  scanA11y?(uploadCrop?: (b64: string) => Promise<string>): Promise<Finding[]>;
  /** Optional one-time performance scan (LCP/CLS/TTFB). */
  scanPerf?(): Promise<Finding[]>;
  /** Optional one-time responsive scan (mobile/tablet layout). */
  scanResponsive?(): Promise<Finding[]>;
  dispose(): Promise<void>;
}

export type ThinkFn = (args: { prompt: string; imageB64?: string }) => Promise<Action>;

export interface HuntOptions {
  url: string;
  persona?: PersonaKey;
  driver: Driver;
  emit: (event: StreamEvent) => void | Promise<void>;
  think: ThinkFn;
  maxSteps?: number;
  saveShot?: (step: number, imageB64: string) => Promise<string>;
  /** Uploads a cropped element screenshot, returns its URL. */
  uploadCrop?: (b64: string) => Promise<string>;
  /** Named user flows to drive to completion after exploration. */
  flows?: string[];
  /** Think fn for the flow runner (returns {action,status,reason}). */
  flowThink?: ThinkJson;
  /**
   * Optional soft-failure pass, run every 5 steps. Should return findings that
   * are already skeptic-screened (the orchestrator wires detect + skeptic here).
   */
  inspect?: (args: {
    imageB64: string;
    url: string;
    actions: Action[];
  }) => Promise<Finding[]>;
}

function titleFor(ev: Evidence): string {
  switch (ev.type) {
    case "http":
      return `Server error — ${ev.text}`;
    case "pageerror":
      return "Uncaught exception on the page";
    case "console":
      return "Console error";
  }
}

function suggestionFor(ev: Evidence): string {
  switch (ev.type) {
    case "http":
      return "Check the server logs for this endpoint and handle the error response in the UI.";
    case "pageerror":
      return "Guard against the null/undefined value that threw, and add error handling.";
    case "console":
      return "Open the browser console, trace this error to its source, and fix it.";
  }
}

function hardFinding(ev: Evidence, actions: Action[], shotPath?: string): Finding {
  return {
    kind: "hard",
    category: ev.type === "http" ? "network" : "error",
    severity: classifySeverity(ev),
    title: titleFor(ev),
    detail: ev.text,
    evidence: [ev.text],
    repro: buildRepro(actions),
    suggestion: suggestionFor(ev),
    screenshotPath: shotPath || undefined,
    // Hard findings come from the browser itself — objectively real.
    verified: true,
  };
}

export async function runHunt(opts: HuntOptions): Promise<Finding[]> {
  const { url, driver, emit, think, persona } = opts;
  // Generous budget for full-coverage exploration; tunable via env.
  const maxSteps = opts.maxSteps ?? (Number(process.env.SNAG_MAX_STEPS) || 45);
  const saveShot = opts.saveShot ?? (async () => "");
  const p = pickPersona(persona);

  const visited = new Set<string>([driver.currentUrl()]);
  const actions: Action[] = [];
  const findings: Finding[] = [];
  const seenEvidence = new Set<string>();
  let idle = 0;
  let thinkFails = 0;
  const a11yScanned = new Set<string>();
  // Per-page record of actions already tried, so the agent stops repeating them.
  const triedByPage = new Map<string, Set<string>>();
  const normUrl = (u: string) => {
    try {
      const x = new URL(u);
      return x.origin + x.pathname;
    } catch {
      return u;
    }
  };
  const actionSig = (a: Action) => `${a.kind} ${a.target ?? a.value ?? ""}`.trim();

  // Run the accessibility scan once per unique page (no repeats).
  const scanA11y = async () => {
    const current = driver.currentUrl();
    if (a11yScanned.has(current) || !driver.scanA11y) return;
    a11yScanned.add(current);
    for (const f of await driver.scanA11y(opts.uploadCrop)) {
      const key = `a11y:${f.title}:${f.selector ?? ""}`;
      if (seenEvidence.has(key)) continue;
      seenEvidence.add(key);
      findings.push(f);
      await emit({ type: "finding", finding: f });
    }
  };

  await emit({ type: "status", status: "running", note: url });
  await scanA11y();

  // One-time performance pass on the landing page.
  if (driver.scanPerf) {
    for (const f of await driver.scanPerf()) {
      findings.push(f);
      await emit({ type: "finding", finding: f });
    }
  }

  // One-time responsive pass (mobile/tablet layout).
  if (driver.scanResponsive) {
    for (const f of await driver.scanResponsive()) {
      findings.push(f);
      await emit({ type: "finding", finding: f });
    }
  }

  for (let n = 1; n <= maxSteps; n++) {
    const imageB64 = await driver.screenshot();
    const shotPath = await saveShot(n, imageB64);
    const digest = await driver.digest();
    const triedHere = [...(triedByPage.get(normUrl(driver.currentUrl())) ?? [])];
    const prompt = buildPrompt(p, driver.currentUrl(), visited, actions, digest, triedHere);

    let action: Action;
    try {
      action = await think({ prompt, imageB64 });
      thinkFails = 0;
    } catch {
      // Tolerate transient LLM failures (e.g. free-tier per-minute rate limits)
      // so throttling doesn't cut a long full-coverage hunt short.
      thinkFails++;
      if (thinkFails >= 6) break;
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    await emit({
      type: "step",
      n,
      thought: action.reason ?? "",
      action,
      url: driver.currentUrl(),
      shot: shotPath,
    });

    if (action.kind === "stop") break;

    try {
      await driver.act(action);
    } catch {
      // broken selector / nav — the observers will report any resulting error
    }
    actions.push(action);
    // Record this action against the page it was taken on.
    const pageKey = normUrl(driver.currentUrl());
    if (!triedByPage.has(pageKey)) triedByPage.set(pageKey, new Set());
    triedByPage.get(pageKey)!.add(actionSig(action));

    const beforeUrls = visited.size;
    visited.add(driver.currentUrl());
    // New page reached → scan it for accessibility issues.
    if (visited.size > beforeUrls) await scanA11y();

    let fresh = 0;
    for (const ev of driver.drain()) {
      if (seenEvidence.has(ev.text)) continue;
      seenEvidence.add(ev.text);
      fresh++;
      const finding = hardFinding(ev, actions, shotPath);
      findings.push(finding);
      await emit({ type: "finding", finding });
    }

    if (opts.inspect && n % 5 === 0) {
      const soft = await opts.inspect({
        imageB64,
        url: driver.currentUrl(),
        actions,
      });
      for (const sf of soft) {
        const seenKey = `soft:${sf.title}`;
        if (seenEvidence.has(seenKey)) continue;
        seenEvidence.add(seenKey);
        findings.push(sf);
        await emit({ type: "finding", finding: sf });
      }
    }

    if (fresh === 0 && visited.size === beforeUrls) idle++;
    else idle = 0;
    // Stop only after a long stretch with no new page and no new finding — by
    // then the agent has genuinely run out of places to go.
    if (idle >= 10) break;
  }

  // After exploration, drive each named flow to completion.
  if (opts.flows?.length && opts.flowThink) {
    let flowIdx = 0;
    for (const goal of opts.flows.slice(0, 4)) {
      const f = await runFlow({
        goal,
        driver,
        think: opts.flowThink,
        emit,
        saveShot: (n, b64) => saveShot(10000 + flowIdx * 100 + n, b64),
      });
      flowIdx++;
      if (f) {
        findings.push(f);
        await emit({ type: "finding", finding: f });
      }
    }
  }

  await driver.dispose();
  await emit({ type: "status", status: "done" });
  return findings;
}
