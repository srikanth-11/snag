import { describe, it, expect } from "vitest";
import { runHunt, type Driver, type ThinkFn } from "@/lib/agent/loop";
import type { Action, StreamEvent } from "@/lib/types";
import type { Evidence } from "@/lib/agent/observers";

// A scripted driver: clicking "Apply" surfaces one uncaught error, exactly once.
class FakeDriver implements Driver {
  private pending: Evidence[] = [];
  currentUrl() {
    return "https://demo.test/checkout";
  }
  async screenshot() {
    return "";
  }
  async digest() {
    return "textbox: Coupon\nbutton: Apply";
  }
  async act(action: Action) {
    if (action.kind === "click") {
      this.pending.push({ type: "pageerror", text: "uncaught: cannot read 'total' of undefined" });
    }
  }
  drain() {
    return this.pending.splice(0, this.pending.length);
  }
  async dispose() {}
}

describe("runHunt", () => {
  it("catches a hard finding and terminates", async () => {
    const script: Action[] = [
      { kind: "type", target: "Coupon", value: "x".repeat(10000), reason: "overflow it" },
      { kind: "click", target: "Apply", reason: "trigger the crash" },
      { kind: "stop", reason: "done" },
    ];
    let i = 0;
    const think: ThinkFn = async () => script[Math.min(i++, script.length - 1)];

    const events: StreamEvent[] = [];
    const findings = await runHunt({
      url: "https://demo.test/checkout",
      driver: new FakeDriver(),
      think,
      emit: (e) => {
        events.push(e);
      },
      maxSteps: 25,
    });

    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].kind).toBe("hard");
    expect(findings[0].severity).toBe("high");
    expect(findings[0].repro).toContain("2. Click “Apply”.");
    expect(events.some((e) => e.type === "finding")).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: "status", status: "done" });
  });

  it("stops early after three idle steps with no findings", async () => {
    const think: ThinkFn = async () => ({ kind: "scroll", reason: "look around" });
    const idleDriver: Driver = {
      currentUrl: () => "https://demo.test/",
      screenshot: async () => "",
      digest: async () => "",
      act: async () => {},
      drain: () => [],
      dispose: async () => {},
    };
    const steps: number[] = [];
    await runHunt({
      url: "https://demo.test/",
      driver: idleDriver,
      think,
      emit: (e) => {
        if (e.type === "step") steps.push(e.n);
      },
      maxSteps: 25,
    });
    // 3 idle steps → loop breaks well before maxSteps
    expect(steps.length).toBeLessThanOrEqual(4);
  });
});
