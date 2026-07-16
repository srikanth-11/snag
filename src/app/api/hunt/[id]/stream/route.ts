import { createClient } from "@/lib/supabase/server";
import { getJob, getSteps, getFindings } from "@/lib/db";
import { subscribe } from "@/lib/bus";
import type { StreamEvent } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: RouteContext<"/api/hunt/[id]/stream">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const job = await getJob(supabase, id);
  if (!job) return new Response("not found", { status: 404 });

  const steps = await getSteps(supabase, id);
  const findings = await getFindings(supabase, id);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (e: StreamEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));

      // Replay what already happened so a reconnecting client catches up.
      for (const s of steps) {
        send({ type: "step", n: s.n, thought: s.thought, action: s.action, url: s.url, shot: s.screenshotPath });
      }
      for (const f of findings) send({ type: "finding", finding: f });

      if (job.status === "done" || job.status === "error") {
        send({ type: "status", status: job.status });
        controller.close();
        return;
      }

      send({ type: "status", status: "running" });

      let closed = false;
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsub();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      const unsub = subscribe(id, (e) => {
        send(e);
        if (e.type === "status" && (e.status === "done" || e.status === "error")) cleanup();
      });
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 15_000);
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
