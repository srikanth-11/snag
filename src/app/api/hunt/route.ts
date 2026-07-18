import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase, hasAnyLlm } from "@/lib/env";
import { isSafeTarget } from "@/lib/ssrf";
import { remainingQuota } from "@/lib/quota";
import { createJob } from "@/lib/db";
import { startHunt } from "@/lib/hunt";
import { PERSONA_KEYS } from "@/lib/agent/persona";
import { isDemoUrl } from "@/lib/demos";
import type { HuntAuth } from "@/lib/types";

// Playwright + dns need the Node runtime.
export const runtime = "nodejs";

const DEMO_COOKIE = "snag_demo";

export async function POST(req: Request) {
  if (!hasSupabase || !hasAnyLlm) {
    return NextResponse.json({ error: "Snag isn't configured on the server yet" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    url?: string;
    auth?: { loginUrl?: string; username?: string; password?: string };
    flows?: string[];
  } | null;

  const safe = await isSafeTarget(typeof body?.url === "string" ? body.url.trim() : "");
  if (!safe.ok) {
    return NextResponse.json({ error: safe.reason }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Guest demo: one hunt against a pre-approved public app, no signup ---
  if (!user) {
    if (!isDemoUrl(safe.url)) {
      return NextResponse.json(
        { error: "Sign up to test your own app.", needSignup: true },
        { status: 401 },
      );
    }
    const jar = await cookies();
    if (jar.get(DEMO_COOKIE)) {
      return NextResponse.json(
        { error: "You've used your free demo. Sign up to run more.", demoUsed: true },
        { status: 403 },
      );
    }
    const persona = PERSONA_KEYS[0];
    const jobId = await createJob({ userId: null, url: safe.url, persona });
    void startHunt({ jobId, url: safe.url, persona });
    const res = NextResponse.json({ id: jobId });
    res.cookies.set(DEMO_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  // --- Signed-in user: any safe URL, with quota, optional creds + flows ---
  const flows = Array.isArray(body?.flows)
    ? body.flows.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()).slice(0, 4)
    : undefined;

  let auth: HuntAuth | undefined;
  const rawAuth = body?.auth;
  if (rawAuth?.username && rawAuth.password) {
    let loginUrl: string | undefined;
    if (rawAuth.loginUrl?.trim()) {
      const safeLogin = await isSafeTarget(rawAuth.loginUrl.trim());
      if (!safeLogin.ok) {
        return NextResponse.json({ error: `Login URL: ${safeLogin.reason}` }, { status: 400 });
      }
      loginUrl = safeLogin.url;
    }
    auth = { loginUrl, username: rawAuth.username, password: rawAuth.password };
  }

  const quota = await remainingQuota(user.id);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: `You've used all ${quota.limit} hunts for today. Try again tomorrow.` },
      { status: 429 },
    );
  }

  const persona = PERSONA_KEYS[quota.used % PERSONA_KEYS.length];
  const jobId = await createJob({ userId: user.id, url: safe.url, persona });
  void startHunt({ jobId, url: safe.url, persona, auth, flows });

  return NextResponse.json({ id: jobId });
}
