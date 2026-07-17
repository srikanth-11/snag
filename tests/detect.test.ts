import { describe, it, expect } from "vitest";
import { classifySeverity } from "@/lib/agent/observers";
import { detectSoft } from "@/lib/agent/detect";
import { screenFindings } from "@/lib/agent/skeptic";
import type { Finding } from "@/lib/types";

describe("classifySeverity", () => {
  it("ranks evidence by type and status", () => {
    expect(classifySeverity({ type: "http", text: "500 GET /x" })).toBe("high");
    expect(classifySeverity({ type: "http", text: "404 GET /y" })).toBe("low");
    expect(classifySeverity({ type: "http", text: "403 GET /z" })).toBe("medium");
    expect(classifySeverity({ type: "pageerror", text: "uncaught: boom" })).toBe("high");
    expect(classifySeverity({ type: "console", text: "console.error: x" })).toBe("medium");
    expect(classifySeverity({ type: "console", text: "console.warning: x" })).toBe("low");
  });
});

describe("detectSoft", () => {
  it("maps model output to soft findings with repro", async () => {
    const think = async () => ({
      findings: [{ title: "Dead button", detail: "Apply does nothing", severity: "medium" }],
    });
    const out = await detectSoft({
      imageB64: "",
      url: "http://x",
      actions: [{ kind: "click", target: "Apply", reason: "r" }],
      think,
    });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("soft");
    expect(out[0].verified).toBe(false);
    expect(out[0].repro).toContain("1. Click “Apply”.");
  });

  it("returns [] when the model errors", async () => {
    const think = async () => {
      throw new Error("boom");
    };
    expect(await detectSoft({ imageB64: "", url: "http://x", actions: [], think })).toEqual([]);
  });
});

describe("screenFindings (skeptic)", () => {
  const soft: Finding = {
    kind: "soft",
    category: "ux",
    severity: "medium",
    title: "Maybe broken",
    detail: "",
    evidence: [],
    repro: [],
    verified: false,
  };
  const hard: Finding = { ...soft, kind: "hard", title: "500", verified: true };

  it("keeps hard findings untouched and drops refuted soft ones", async () => {
    const refute = async () => ({ real: false, severity: "low", reason: "false alarm" });
    const out = await screenFindings([hard, soft], refute);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("hard");
  });

  it("keeps confirmed soft findings and marks them verified", async () => {
    const confirm = async () => ({ real: true, severity: "high", reason: "reproduced" });
    const out = await screenFindings([soft], confirm);
    expect(out).toHaveLength(1);
    expect(out[0].verified).toBe(true);
    expect(out[0].severity).toBe("high");
  });
});
