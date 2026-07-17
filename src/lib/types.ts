// Single source of truth for shapes shared across the agent, API, and UI.

export type ActionKind = "click" | "type" | "navigate" | "scroll" | "back" | "stop";

export interface Action {
  kind: ActionKind;
  /** Accessible name / visible text / URL the action targets. */
  target?: string;
  /** Text to type, or URL to navigate to. */
  value?: string;
  /** One short sentence: why the agent chose this. */
  reason: string;
}

export type Severity = "critical" | "high" | "medium" | "low";

// What kind of problem a finding is — lets the report group and prioritize.
export type FindingCategory =
  | "accessibility"
  | "error"
  | "network"
  | "visual"
  | "ux"
  | "performance";

export interface Finding {
  kind: "hard" | "soft";
  category: FindingCategory;
  severity: Severity;
  title: string;
  detail: string;
  evidence: string[];
  repro: string[];
  /** CSS selector / element the issue is on (a11y + visual findings). */
  selector?: string;
  /** Link to guidance (e.g. the axe/WCAG rule help page). */
  docsUrl?: string;
  screenshotPath?: string;
  verified: boolean;
}

export interface Verdict {
  real: boolean;
  severity: Severity;
  reason: string;
}

// Optional login credentials for hunting behind an auth wall. Used in-memory
// only — never stored in the database, never sent to the LLM.
export interface HuntAuth {
  loginUrl?: string;
  username: string;
  password: string;
}

export type JobStatus = "queued" | "running" | "done" | "error";

export interface Job {
  id: string;
  url: string;
  status: JobStatus;
  persona?: string;
  error?: string;
  createdAt: string;
  finishedAt?: string;
}

export type StreamEvent =
  | {
      type: "step";
      n: number;
      thought: string;
      action: Action;
      url: string;
      shot: string;
    }
  | { type: "finding"; finding: Finding }
  | { type: "status"; status: "running" | "done" | "error"; note?: string };
