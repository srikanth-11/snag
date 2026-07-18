import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getJob, setJobStatus } from "@/lib/db";
import { requestCancel } from "@/lib/control";
import { publish } from "@/lib/bus";

export const runtime = "nodejs";

// Stop a running hunt. Authorized by the RLS-scoped read: getJob only returns a
// job the caller owns (or an anonymous demo job).
export async function POST(_req: Request, ctx: RouteContext<"/api/hunt/[id]/cancel">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const job = await getJob(supabase, id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  requestCancel(id);
  if (job.status === "running" || job.status === "queued") {
    await setJobStatus(id, "stopped");
    publish(id, { type: "status", status: "stopped", note: "stopped by user" });
  }
  return NextResponse.json({ ok: true });
}
