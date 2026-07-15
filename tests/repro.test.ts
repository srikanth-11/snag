import { describe, it, expect } from "vitest";
import { buildRepro } from "@/lib/agent/repro";
import type { Action } from "@/lib/types";

describe("buildRepro", () => {
  it("renders each action kind as a numbered human step", () => {
    const actions: Action[] = [
      { kind: "navigate", value: "https://shop.test/checkout", reason: "start" },
      { kind: "type", target: "Coupon", value: "x".repeat(9000), reason: "overflow" },
      { kind: "click", target: "Apply", reason: "trigger" },
      { kind: "stop", reason: "done" },
    ];
    expect(buildRepro(actions)).toEqual([
      "1. Go to https://shop.test/checkout.",
      "2. Type a 9000-character string into “Coupon”.",
      "3. Click “Apply”.",
    ]);
  });

  it("describes short typed values verbatim", () => {
    const actions: Action[] = [{ kind: "type", target: "Email", value: "a@b", reason: "x" }];
    expect(buildRepro(actions)).toEqual(['1. Type “a@b” into “Email”.']);
  });
});
