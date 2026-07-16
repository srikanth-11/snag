import { lookup } from "node:dns/promises";

export type SafeTarget = { ok: true; url: string } | { ok: false; reason: string };

function isPrivateIp(ip: string): boolean {
  return (
    /^(10\.|127\.|0\.|192\.168\.|169\.254\.)/.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip === "::1" ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("fe80")
  );
}

// Guard the hunt target against SSRF: only public http(s) hosts. Blocks
// localhost, private ranges, and the cloud metadata IP — including hostnames
// that *resolve* to a private address (DNS-rebinding defense).
export async function isSafeTarget(raw: string): Promise<SafeTarget> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: "Enter a full URL, like https://example.com" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, reason: "Only http and https URLs are supported" };
  }

  const host = u.hostname.toLowerCase();
  const block: SafeTarget = {
    ok: false,
    reason: "That's a private or local address Snag can't hunt",
  };

  if (host === "localhost" || host.endsWith(".localhost")) return block;
  if (host === "169.254.169.254") return block;
  if (isPrivateIp(host)) return block;
  if (!host.includes(".")) return { ok: false, reason: "That doesn't look like a public host" };

  try {
    const { address } = await lookup(host);
    if (isPrivateIp(address)) return block;
  } catch {
    return { ok: false, reason: "Couldn't resolve that host" };
  }

  return { ok: true, url: u.toString() };
}
