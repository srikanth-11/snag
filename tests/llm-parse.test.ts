import { describe, it, expect } from "vitest";
import { repairJson } from "@/lib/llm";
import type { Action } from "@/lib/types";

describe("repairJson", () => {
  it("parses clean JSON", () => {
    const out = repairJson<Action>('{"kind":"click","target":"Submit","reason":"try it"}');
    expect(out.kind).toBe("click");
  });

  it("strips ```json fences", () => {
    const out = repairJson<Action>(
      '```json\n{"kind":"type","target":"Email","value":"x","reason":"garbage"}\n```',
    );
    expect(out.kind).toBe("type");
    expect(out.value).toBe("x");
  });

  it("extracts the object from surrounding prose", () => {
    const out = repairJson<Action>(
      'Sure! Here is my move: {"kind":"stop","reason":"nothing left"} — hope that helps.',
    );
    expect(out.kind).toBe("stop");
  });

  it("throws on genuinely unparseable text", () => {
    expect(() => repairJson("no json here at all")).toThrow();
  });
});
