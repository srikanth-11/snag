"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { StreamEvent } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SnaggedStamp } from "@/components/SnaggedStamp";

export function Theater({ jobId, initialStatus }: { jobId: string; initialStatus: string }) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [status, setStatus] = useState(initialStatus);
  const [shot, setShot] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/hunt/${jobId}/stream`);
    es.onmessage = (ev) => {
      const e = JSON.parse(ev.data) as StreamEvent;
      if (e.type === "step" && e.shot) setShot(e.shot);
      if (e.type === "status") {
        setStatus(e.status);
        if (e.status === "done" || e.status === "error") es.close();
        return;
      }
      setEvents((prev) => [...prev, e]);
    };
    return () => es.close();
  }, [jobId]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [events]);

  const findingCount = events.filter((e) => e.type === "finding").length;
  const done = status === "done" || status === "error";

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 text-sm">
        <span
          className={`inline-flex items-center gap-2 font-mono ${done ? "text-smoke" : "text-proof"}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${done ? "bg-smoke" : "animate-pulse bg-proof"}`}
          />
          {status === "error" ? "hunt failed" : done ? "hunt complete" : "hunting…"}
        </span>
        <span className="text-smoke">
          {findingCount} {findingCount === 1 ? "snag" : "snags"} so far
        </span>
        {done && (
          <Link
            href={`/report/${jobId}`}
            className="ml-auto rounded-lg bg-ember px-4 py-1.5 font-medium text-void transition-opacity hover:opacity-90"
          >
            View report
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* Stage */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-edge bg-ash">
          <span className="pointer-events-none absolute left-3 top-3 z-10 h-4 w-4 border-l-2 border-t-2 border-proof/70" />
          <span className="pointer-events-none absolute right-3 top-3 z-10 h-4 w-4 border-r-2 border-t-2 border-proof/70" />
          <span className="pointer-events-none absolute bottom-3 left-3 z-10 h-4 w-4 border-b-2 border-l-2 border-proof/70" />
          <span className="pointer-events-none absolute bottom-3 right-3 z-10 h-4 w-4 border-b-2 border-r-2 border-proof/70" />
          {shot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot} alt="What the agent currently sees" className="h-full w-full object-cover object-top" />
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-sm text-smoke">
              opening the target…
            </div>
          )}
        </div>

        {/* Field notes */}
        <div
          ref={feedRef}
          className="flex h-[360px] flex-col gap-2 overflow-y-auto rounded-xl border border-edge bg-ash/50 p-4"
        >
          {events.length === 0 && (
            <p className="font-mono text-sm text-smoke">waiting for the agent…</p>
          )}
          {events.map((e, i) =>
            e.type === "step" ? (
              <div key={i} className="font-mono text-[13px] leading-relaxed">
                <span className="text-ember">
                  ⚑ {e.action.kind}
                  {e.action.target ? ` “${e.action.target}”` : ""}
                </span>
                {e.thought && <span className="text-smoke"> · {e.thought}</span>}
              </div>
            ) : e.type === "finding" ? (
              <div
                key={i}
                className="rounded-lg border border-proof/30 bg-proof/5 p-2.5 font-mono text-[13px]"
              >
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={e.finding.severity} />
                  {e.finding.verified && <SnaggedStamp />}
                </div>
                <div className="mt-1.5 text-proof">{e.finding.title}</div>
              </div>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
