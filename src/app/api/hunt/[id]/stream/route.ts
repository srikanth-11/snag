import { createClient } from "@/lib/supabase/server";
import { getJob, getSteps, getFindings } from "@/lib/db";
import { subscribe } from "@/lib/bus";
import { signShot } from "@/lib/storage";
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
  const replay = new URL(req.url).searchParams.get("replay") === "1";

  const stream = new ReadableStream({
    async start(controller) {
      const send = async (e: StreamEvent) => {
        // Screenshots live in a private bucket; sign step shots just before send.
        const out = e.type === "step" && e.shot ? { ...e, shot: await signShot(e.shot) } : e;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(out)}\n\n`));
        } catch {
          // stream already closed
        }
      };

      const terminal =
        job.status === "done" || job.status === "error" || job.status === "stopped";
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Cached demo: replay a finished hunt with cinematic pacing so visitors see
      // the product working instantly (no wait, no LLM cost). Findings are dripped
      // in proportionally as the steps play.
      if (replay && terminal) {
        await send({ type: "status", status: "running" });
        const stepsToShow = steps.slice(0, 18);
        const findsToShow = findings.slice(0, 20);
        let fi = 0;
        for (let i = 0; i < stepsToShow.length; i++) {
          if (req.signal.aborted) return;
          const s = stepsToShow[i];
          await send({ type: "step", n: s.n, thought: s.thought, action: s.action, url: s.url, shot: s.screenshotPath });
          await sleep(750);
          const target = Math.floor(((i + 1) / stepsToShow.length) * findsToShow.length);
          while (fi < target) {
            if (req.signal.aborted) return;
            await send({ type: "finding", finding: findsToShow[fi++] });
            await sleep(320);
          }
        }
        while (fi < findsToShow.length) {
          if (req.signal.aborted) return;
          await send({ type: "finding", finding: findsToShow[fi++] });
          await sleep(320);
        }
        await sleep(500);
        await send({ type: "status", status: "done" });
        controller.close();
        return;
      }

      // Replay what already happened so a reconnecting client catches up.
      for (const s of steps) {
        await send({ type: "step", n: s.n, thought: s.thought, action: s.action, url: s.url, shot: s.screenshotPath });
      }
      for (const f of findings) await send({ type: "finding", finding: f });

      if (terminal) {
        await send({ type: "status", status: job.status as "done" | "error" | "stopped" });
        controller.close();
        return;
      }

      await send({ type: "status", status: "running" });

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
      // Serialize sends so signed-shot awaits can't reorder the feed, and so the
      // terminal event flushes before we close.
      let chain: Promise<void> = Promise.resolve();
      const unsub = subscribe(id, (e) => {
        chain = chain.then(() => send(e));
        if (
          e.type === "status" &&
          (e.status === "done" || e.status === "error" || e.status === "stopped")
        ) {
          void chain.then(cleanup);
        }
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
