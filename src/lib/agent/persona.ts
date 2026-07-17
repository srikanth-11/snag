import type { Action } from "@/lib/types";
import { ACTION_SHAPE } from "@/lib/llm/schemas";

export type PersonaKey = "impatient" | "edge-cases" | "explorer" | "thorough";

export interface Persona {
  title: string;
  tactics: string;
}

// Framed as legitimate functional QA (not security/attack) so the model plays
// along on real sites — the behaviours still surface real bugs.
const PERSONAS: Record<PersonaKey, Persona> = {
  "edge-cases": {
    title: "an edge-case tester",
    tactics:
      "Enter unusual but realistic values into fields: very long text, special characters, emoji, numbers where words are expected, leading and trailing spaces. Leave required fields empty and submit, to check whether the form validates and reports errors properly.",
  },
  impatient: {
    title: "a hurried user",
    tactics:
      "Behave like someone in a rush: click buttons twice, submit forms quickly, click the same control repeatedly, and move on before a page has finished loading.",
  },
  explorer: {
    title: "a curious user",
    tactics:
      "Explore the app broadly: open menus, follow links, visit different pages, use the back button, and go through flows in an unexpected order.",
  },
  thorough: {
    title: "a thorough tester",
    tactics:
      "Work through every form and control on the page. Submit forms both fully and partially filled to check validation, error messages, and whether the app handles missing or unexpected input gracefully.",
  },
};

export function pickPersona(key?: PersonaKey): Persona {
  return PERSONAS[key ?? "edge-cases"];
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

  return `You are ${persona.title} doing authorized quality-assurance testing of this web application. You have permission to test it. Your goal is to find real bugs — JavaScript errors, server errors, broken links, crashes, or forms that mishandle input — so they can be fixed before real users hit them. This is ordinary functional testing of the app's own behaviour, not security testing.

Current URL: ${url}
Pages already tested: ${seen}
Recent actions: ${recent}

Interactive elements visible on the page:
${digest || "(none detected — use the screenshot)"}

How you test: ${persona.tactics}

Look at the screenshot and the elements, then choose ONE next action that best exercises the page and is most likely to reveal a bug. Prefer realistic user actions and edge-case inputs. Avoid repeating actions that led nowhere. Do not log out or click sign-out links — stay logged in so you can keep testing. Use "stop" only once you have thoroughly exercised this page.

Respond with ONLY a JSON object in exactly this shape, no prose:
${ACTION_SHAPE}`;
}
