import { describe, it, expect } from "vitest";
import { isSafeTarget } from "@/lib/ssrf";

// Only the pre-DNS blocking cases here (no network): localhost, private ranges,
// bad scheme, malformed. These are the security-critical rejections.
describe("isSafeTarget", () => {
  it("rejects non-URLs", async () => {
    expect((await isSafeTarget("not a url")).ok).toBe(false);
  });

  it("rejects non-http schemes", async () => {
    expect((await isSafeTarget("ftp://example.com")).ok).toBe(false);
    expect((await isSafeTarget("file:///etc/passwd")).ok).toBe(false);
  });

  it("rejects localhost and loopback", async () => {
    expect((await isSafeTarget("http://localhost:3000")).ok).toBe(false);
    expect((await isSafeTarget("http://127.0.0.1")).ok).toBe(false);
  });

  it("rejects private ranges and cloud metadata", async () => {
    expect((await isSafeTarget("http://10.0.0.1")).ok).toBe(false);
    expect((await isSafeTarget("http://192.168.1.10")).ok).toBe(false);
    expect((await isSafeTarget("http://172.16.5.5")).ok).toBe(false);
    expect((await isSafeTarget("http://169.254.169.254/latest/meta-data")).ok).toBe(false);
  });

  it("rejects bare hosts with no dot", async () => {
    expect((await isSafeTarget("http://intranet")).ok).toBe(false);
  });
});
