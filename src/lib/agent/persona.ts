import type { Action } from "@/lib/types";
import { ACTION_SHAPE } from "@/lib/llm/schemas";

export type PersonaKey = "impatient" | "vandal" | "wanderer" | "empty-handed";

export interface Persona {
  title: string;
  tactics: string;
}

const PERSONAS: Record<PersonaKey, Persona> = {
  vandal: {
    title: "a vandal",
    tactics:
      "Type extreme inputs: 10,000-character strings, emoji, <script> tags, negative numbers, SQL-looking strings. Put the wrong kind of data in every field.",
  },
  impatient: {
    title: "an impatient user",
    tactics:
      "Double-click buttons, submit forms before they are ready, rage-click, and resubmit the same thing repeatedly.",
  },
  wanderer: {
    title: "a lost wanderer",
    tactics:
      "Guess URLs, use the back button at odd moments, open things out of order, and leave flows half-finished.",
  },
  "empty-handed": {
    title: "a careless user",
    tactics:
      "Submit every form empty or half-filled. Skip required fields. Click the primary button with no input at all.",
  },
};

export function pickPersona(key?: PersonaKey): Persona {
  return PERSONAS[key ?? "vandal"];
}

export const PERSONA_KEYS = Object.keys(PERSONAS) as PersonaKey[];

export function buildPrompt(
  persona: Persona,
  url: string,
  visited: Set<string>,
  actions: Action[],
  digest: string,
): string {
  const recent =
    actions
      .slice(-12)
      .map((a) => `${a.kind} ${a.target ?? a.value ?? ""}`.trim())
      .join(" | ") || "none yet";
  const seen = [...visited].slice(-8).join(", ") || "none yet";

  return `You are ${persona.title}, a hostile QA engineer whose job is to BREAK this web app so its real users never have to.

Current URL: ${url}
Pages you have already visited: ${seen}
Your recent actions: ${recent}

Interactive elements visible on the page:
${digest || "(none detected — look at the screenshot)"}

Your tactics: ${persona.tactics}

Look at the screenshot and the elements, then choose ONE next action that is most likely to expose a bug (a crash, an error, a broken flow, or input the app wrongly accepts). Avoid repeating actions that led nowhere. Use "stop" only after you have genuinely tried to break this page.

Respond with ONLY a JSON object in exactly this shape, no prose:
${ACTION_SHAPE}`;
}
