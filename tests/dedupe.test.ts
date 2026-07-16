import { describe, it, expect } from "vitest";
import { dedupe, maxSeverity } from "@/lib/agent/dedupe";
import type { Finding } from "@/lib/types";

function f(over: Partial<Finding>): Finding {
  return {
    kind: "hard",
    severity: "medium",
    title: "Server error",
    detail: "",
    evidence: [],
    repro: [],
    verified: true,
    ...over,
  };
}

describe("maxSeverity", () => {
  it("returns the higher rank", () => {
    expect(maxSeverity("low", "high")).toBe("high");
    expect(maxSeverity("critical", "high")).toBe("critical");
  });
});

describe("dedupe", () => {
  it("merges findings with the same normalized key and keeps highest severity", () => {
    const out = dedupe([
      f({ severity: "medium", evidence: ["500 GET /cart?id=1"] }),
      f({ severity: "high", evidence: ["500 GET /cart?id=2"] }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe("high");
    expect(out[0].evidence).toHaveLength(2);
  });

  it("keeps genuinely different findings apart", () => {
    const out = dedupe([
      f({ title: "Server error", evidence: ["500 GET /cart"] }),
      f({ title: "Console error", kind: "soft", evidence: ["console.error: x"] }),
    ]);
    expect(out).toHaveLength(2);
  });
});
