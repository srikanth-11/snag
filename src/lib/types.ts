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

export interface Finding {
  kind: "hard" | "soft";
  severity: Severity;
  title: string;
  detail: string;
  evidence: string[];
  repro: string[];
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
