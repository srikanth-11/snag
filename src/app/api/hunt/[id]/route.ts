import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getJob, getFindings } from "@/lib/db";
import { dedupe } from "@/lib/agent/dedupe";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/hunt/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const job = await getJob(supabase, id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  const findings = dedupe(await getFindings(supabase, id));
  return NextResponse.json({ job, findings });
}
