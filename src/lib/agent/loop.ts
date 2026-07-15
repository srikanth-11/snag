import type { Action, Finding, StreamEvent } from "@/lib/types";
import { buildPrompt, pickPersona, type PersonaKey } from "@/lib/agent/persona";
import { buildRepro } from "@/lib/agent/repro";
import { classifySeverity, type Evidence } from "@/lib/agent/observers";

// The loop drives an abstract Driver so its orchestration logic is testable
// without launching a real browser. browser.ts provides the Playwright driver.
export interface Driver {
  currentUrl(): string;
  screenshot(): Promise<string>;
  digest(): Promise<string>;
  act(action: Action): Promise<void>;
  drain(): Evidence[];
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

function hardFinding(ev: Evidence, actions: Action[], shotPath?: string): Finding {
  return {
    kind: "hard",
    severity: classifySeverity(ev),
    title: titleFor(ev),
    detail: ev.text,
    evidence: [ev.text],
    repro: buildRepro(actions),
    screenshotPath: shotPath || undefined,
    // Hard findings come from the browser itself — objectively real.
    verified: true,
  };
}

export async function runHunt(opts: HuntOptions): Promise<Finding[]> {
  const { url, driver, emit, think, persona } = opts;
  const maxSteps = opts.maxSteps ?? 25;
  const saveShot = opts.saveShot ?? (async () => "");
  const p = pickPersona(persona);

  const visited = new Set<string>([driver.currentUrl()]);
  const actions: Action[] = [];
  const findings: Finding[] = [];
  const seenEvidence = new Set<string>();
  let idle = 0;

  await emit({ type: "status", status: "running", note: url });

  for (let n = 1; n <= maxSteps; n++) {
    const imageB64 = await driver.screenshot();
    const shotPath = await saveShot(n, imageB64);
    const digest = await driver.digest();
    const prompt = buildPrompt(p, driver.currentUrl(), visited, actions, digest);

    let action: Action;
    try {
      action = await think({ prompt, imageB64 });
    } catch {
      break; // every LLM provider failed — end the hunt cleanly
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

    const beforeUrls = visited.size;
    visited.add(driver.currentUrl());

    let fresh = 0;
    for (const ev of driver.drain()) {
      if (seenEvidence.has(ev.text)) continue;
      seenEvidence.add(ev.text);
      fresh++;
      const finding = hardFinding(ev, actions, shotPath);
      findings.push(finding);
      await emit({ type: "finding", finding });
    }

    if (fresh === 0 && visited.size === beforeUrls) idle++;
    else idle = 0;
    if (idle >= 3) break; // three steps with nothing new — stop wasting calls
  }

  await driver.dispose();
  await emit({ type: "status", status: "done" });
  return findings;
}
