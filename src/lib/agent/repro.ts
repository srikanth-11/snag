import type { Action } from "@/lib/types";

// Turn the agent's action log into human repro steps for a bug report.
export function buildRepro(actions: Action[]): string[] {
  return actions
    .filter((a) => a.kind !== "stop")
    .map((a, i) => {
      const n = i + 1;
      switch (a.kind) {
        case "navigate":
          return `${n}. Go to ${a.value ?? a.target ?? "the page"}.`;
        case "click":
          return `${n}. Click “${a.target ?? "the element"}”.`;
        case "type":
          return `${n}. Type ${describeValue(a.value)} into “${a.target ?? "the field"}”.`;
        case "scroll":
          return `${n}. Scroll down.`;
        case "back":
          return `${n}. Go back.`;
        default:
          return `${n}. ${a.kind}.`;
      }
    });
}

function describeValue(v?: string): string {
  if (!v) return "nothing";
  if (v.length > 40) return `a ${v.length}-character string`;
  return `“${v}”`;
}
