import net from "node:net";
import { lookup } from "node:dns/promises";

export type SafeTarget = { ok: true; url: string } | { ok: false; reason: string };

function v4ToInt(ip: string): number {
  const p = ip.split(".").map(Number);
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}

function isPrivateV4(ip: string): boolean {
  const n = v4ToInt(ip);
  const inRange = (base: string, bits: number) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (n & mask) === (v4ToInt(base) & mask);
  };
  return (
    inRange("0.0.0.0", 8) || // "this" network
    inRange("10.0.0.0", 8) || // private
    inRange("100.64.0.0", 10) || // carrier-grade NAT
    inRange("127.0.0.0", 8) || // loopback
    inRange("169.254.0.0", 16) || // link-local (incl. 169.254.169.254 metadata)
    inRange("172.16.0.0", 12) || // private
    inRange("192.0.0.0", 24) || // IETF protocol assignments
    inRange("192.168.0.0", 16) || // private
    n === 0xffffffff // broadcast
  );
}

// Expand an IPv6 string (including "::" compression and embedded IPv4) to a
// 128-bit BigInt. Returns null on anything malformed.
function v6ToBig(input: string): bigint | null {
  let ip = input.split("%")[0]; // drop zone id
  const embedded = ip.match(/^(.*:)((\d{1,3}\.){3}\d{1,3})$/);
  if (embedded) {
    const v4 = embedded[2].split(".").map(Number);
    if (v4.some((o) => o > 255)) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    ip = `${embedded[1]}${hi}:${lo}`;
  }
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(":") : []) : null;
  let groups: string[];
  if (tail === null) {
    groups = head;
    if (groups.length !== 8) return null;
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 1) return null;
    groups = [...head, ...Array(missing).fill("0"), ...tail];
  }
  let big = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(g)) return null;
    big = (big << 16n) + BigInt(parseInt(g, 16));
  }
  return big;
}

function isPrivateV6(ip: string): boolean {
  const b = v6ToBig(ip);
  if (b === null) return true; // unparseable → treat as unsafe
  if (b === 0n || b === 1n) return true; // :: (unspecified), ::1 (loopback)
  // IPv4-mapped ::ffff:a.b.c.d — unwrap and apply IPv4 rules
  if (b >> 32n === 0xffffn) {
    const v4 = Number(b & 0xffffffffn);
    return isPrivateV4([(v4 >>> 24) & 255, (v4 >>> 16) & 255, (v4 >>> 8) & 255, v4 & 255].join("."));
  }
  if ((b >> 120n) & 0xfen) {
    if (((b >> 120n) & 0xfen) === 0xfcn) return true; // fc00::/7 unique-local
  }
  if (((b >> 112n) & 0xffc0n) === 0xfe80n) return true; // fe80::/10 link-local
  return false;
}

function isPrivateIp(addr: string): boolean {
  const fam = net.isIP(addr);
  if (fam === 4) return isPrivateV4(addr);
  if (fam === 6) return isPrivateV6(addr);
  return true; // not a valid IP where one was expected → unsafe
}

// Guard the hunt target against SSRF. Only public http(s) hosts pass. Blocks
// localhost, every private/loopback/link-local range (v4 and v6, including
// IPv4-mapped v6 and numeric-encoded hosts), the cloud metadata IP, and
// hostnames that *resolve* to any private address.
//
// ponytail: residual DNS-rebinding TOCTOU — Chromium re-resolves at navigation,
// so a domain that flips its A record between this check and the fetch could
// still slip through. Full fix = pin the validated IP via Chromium
// --host-resolver-rules per hunt. Deferred; the direct-address vectors below
// are the exploitable ones and are all closed.
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

  // Dev-only escape hatch so the agent can hunt the local seed targets.
  // Never set in production — the private-range checks below stay in force there.
  if (process.env.SNAG_ALLOW_LOCAL_TARGETS === "1") {
    return { ok: true, url: u.toString() };
  }

  const host = u.hostname.toLowerCase();
  const block: SafeTarget = {
    ok: false,
    reason: "That's a private or local address Snag can't hunt",
  };

  // IP literal (v4 or v6, brackets already stripped by URL) — check directly.
  if (net.isIP(host)) {
    return isPrivateIp(host) ? block : { ok: true, url: u.toString() };
  }

  if (host === "localhost" || host.endsWith(".localhost")) return block;
  // Reject numeric/hex/octal-encoded IPv4 tricks (e.g. 2130706433, 0x7f000001, 127.1).
  if (/^[0-9.]+$/.test(host) || /^0x/i.test(host)) return block;
  if (!/^[a-z0-9.-]+$/.test(host) || !host.includes(".")) {
    return { ok: false, reason: "That doesn't look like a public host" };
  }

  try {
    const results = await lookup(host, { all: true });
    if (results.length === 0) return { ok: false, reason: "Couldn't resolve that host" };
    for (const r of results) {
      if (isPrivateIp(r.address)) return block;
    }
  } catch {
    return { ok: false, reason: "Couldn't resolve that host" };
  }

  return { ok: true, url: u.toString() };
}
