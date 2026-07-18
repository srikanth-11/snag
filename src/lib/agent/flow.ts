import type { Action, Finding, StreamEvent } from "@/lib/types";
import type { Driver } from "@/lib/agent/loop";
import type { ThinkJson } from "@/lib/llm";
import { ACTION_SHAPE } from "@/lib/llm/schemas";
import { buildRepro } from "@/lib/agent/repro";

interface FlowStep {
  action?: Action;
  status?: "continue" | "done" | "blocked";
  reason?: string;
}

function flowPrompt(goal: string, url: string, digest: string, actions: Action[]): string {
  const recent =
    actions
      .slice(-8)
      .map((a) => `${a.kind} ${a.target ?? a.value ?? ""}`.trim())
      .join(" | ") || "none yet";
  return `You are a QA tester completing one specific user flow end-to-end and checking that it works.

FLOW TO COMPLETE: "${goal}"

Current URL: ${url}
Steps you've taken so far: ${recent}

Interactive elements on the page:
${digest || "(use the screenshot)"}

Choose the ONE next action that moves this flow forward, and set "status":
- "continue" — more steps are needed;
- "done" — the flow is complete and worked (the goal is achieved);
- "blocked" — you cannot proceed (a required control is broken/missing, or an error blocks the flow).
Do not click third-party sign-in buttons or navigate off this site.

Respond with ONLY a JSON object:
{ "action": ${ACTION_SHAPE}, "status": "continue"|"done"|"blocked", "reason": string }`;
}

// One LLM look at the landing page → up to 2 key flows worth verifying.
export async function discoverFlows(
  screenshot: string,
  digest: string,
  think: ThinkJson,
): Promise<string[]> {
  try {
    const prompt = `Look at this web app. List up to 2 important user flows a QA tester should verify end-to-end (e.g. "log in", "search for something and open a result", "create and save an item"). Keep each under 12 words.

Interactive elements:
${digest || "(use the screenshot)"}

Respond with ONLY JSON: { "flows": string[] }`;
    const r = (await think({ prompt, imageB64: screenshot })) as { flows?: string[] };
    return (r.flows ?? [])
      .filter((s) => typeof s === "string" && s.length > 2 && s.length < 120)
      .slice(0, 2);
  } catch {
    return [];
  }
}

function blocked(goal: string, reason: string, actions: Action[]): Finding {
  return {
    kind: "soft",
    category: "ux",
    severity: "high",
    title: `Couldn't complete the flow: “${goal}”`,
    detail: `The tester could not finish this flow: ${reason}`.slice(0, 400),
    evidence: [],
    repro: buildRepro(actions),
    suggestion: "Walk this flow manually and fix the step where it breaks.",
    verified: true,
  };
}

// Drive one named flow to completion. Returns a high-severity finding if the
// flow can't be completed, or null if it succeeded.
export async function runFlow(opts: {
  goal: string;
  driver: Driver;
  think: ThinkJson;
  emit: (e: StreamEvent) => void | Promise<void>;
  saveShot?: (n: number, b64: string) => Promise<string>;
  maxSteps?: number;
}): Promise<Finding | null> {
  const { goal, driver, think, emit } = opts;
  const maxSteps = opts.maxSteps ?? 12;
  const saveShot = opts.saveShot ?? (async () => "");
  const actions: Action[] = [];

  for (let n = 1; n <= maxSteps; n++) {
    const img = await driver.screenshot();
    const shot = await saveShot(n, img);
    const digest = await driver.digest();
    const prompt = flowPrompt(goal, driver.currentUrl(), digest, actions);

    let r: FlowStep;
    try {
      r = (await think({ prompt, imageB64: img })) as FlowStep;
    } catch {
      break;
    }

    await emit({
      type: "step",
      n,
      thought: `[flow: ${goal}] ${r.reason ?? ""}`,
      action: r.action ?? { kind: "stop", reason: r.reason ?? "" },
      url: driver.currentUrl(),
      shot,
    });

    if (r.status === "done") return null;
    if (r.status === "blocked") return blocked(goal, r.reason || "blocked", actions);
    if (!r.action || r.action.kind === "stop") return blocked(goal, r.reason || "no next action", actions);

    try {
      await driver.act(r.action);
    } catch {
      // broken control — observers report any error; keep trying
    }
    actions.push(r.action);
  }

  return blocked(goal, "ran out of steps without completing the flow", actions);
}
