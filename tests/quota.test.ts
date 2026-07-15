import { describe, it, expect, vi } from "vitest";
import { think } from "@/lib/llm";
import type { Provider } from "@/lib/llm/providers";

describe("think provider rotation", () => {
  it("falls through to the next provider on 429", async () => {
    const dead: Provider = {
      name: "dead",
      run: vi.fn(async () => {
        throw Object.assign(new Error("dead 429"), { status: 429 });
      }),
    };
    const alive: Provider = {
      name: "alive",
      run: vi.fn(async () => '{"kind":"stop","reason":"ok"}'),
    };

    const out = await think<{ kind: string }>({
      prompt: "go",
      providers: [dead, alive],
    });

    expect(out.kind).toBe("stop");
    expect(dead.run).toHaveBeenCalledOnce();
    expect(alive.run).toHaveBeenCalledOnce();
  });

  it("throws when every provider fails", async () => {
    const dead: Provider = { name: "d", run: async () => { throw new Error("boom"); } };
    await expect(think({ prompt: "go", providers: [dead] })).rejects.toThrow(/all LLM providers/);
  });

  it("throws when no providers are configured", async () => {
    await expect(think({ prompt: "go", providers: [] })).rejects.toThrow(/no LLM providers/);
  });
});
