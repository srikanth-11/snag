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

  it("rejects IPv6 loopback and unspecified", async () => {
    expect((await isSafeTarget("http://[::1]")).ok).toBe(false);
    expect((await isSafeTarget("http://[::]")).ok).toBe(false);
  });

  it("rejects IPv4-mapped IPv6 pointing at loopback", async () => {
    expect((await isSafeTarget("http://[::ffff:127.0.0.1]")).ok).toBe(false);
  });

  it("rejects IPv6 unique-local and link-local", async () => {
    expect((await isSafeTarget("http://[fd00::1]")).ok).toBe(false);
    expect((await isSafeTarget("http://[fe80::1]")).ok).toBe(false);
  });

  it("rejects numeric/hex/short-form IPv4 encodings", async () => {
    expect((await isSafeTarget("http://2130706433")).ok).toBe(false); // 127.0.0.1
    expect((await isSafeTarget("http://0x7f000001")).ok).toBe(false);
    expect((await isSafeTarget("http://127.1")).ok).toBe(false);
  });
});
