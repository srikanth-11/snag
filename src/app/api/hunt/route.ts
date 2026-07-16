import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase, hasAnyLlm } from "@/lib/env";
import { isSafeTarget } from "@/lib/ssrf";
import { remainingQuota } from "@/lib/quota";
import { createJob } from "@/lib/db";
import { startHunt } from "@/lib/hunt";
import { PERSONA_KEYS } from "@/lib/agent/persona";

// Playwright + dns need the Node runtime.
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasSupabase || !hasAnyLlm) {
    return NextResponse.json({ error: "Snag isn't configured on the server yet" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Log in to run a hunt" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { url?: string } | null;
  const safe = await isSafeTarget(typeof body?.url === "string" ? body.url.trim() : "");
  if (!safe.ok) {
    return NextResponse.json({ error: safe.reason }, { status: 400 });
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

  // Fire and forget — the client follows progress over SSE.
  void startHunt({ jobId, url: safe.url, persona });

  return NextResponse.json({ id: jobId });
}
