"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { StreamEvent } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SnaggedStamp } from "@/components/SnaggedStamp";

function shortUrl(u: string): string {
  try {
    const x = new URL(u);
    return (x.host + x.pathname).replace(/\/$/, "") || x.host;
  } catch {
    return u;
  }
}

export function Theater({ jobId, initialStatus }: { jobId: string; initialStatus: string }) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [status, setStatus] = useState(initialStatus);
  const [shot, setShot] = useState("");
  const [stepN, setStepN] = useState(0);
  const [page, setPage] = useState("");
  const [stopping, setStopping] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/hunt/${jobId}/stream`);
    es.onmessage = (ev) => {
      const e = JSON.parse(ev.data) as StreamEvent;
      if (e.type === "step") {
        if (e.shot) setShot(e.shot);
        setStepN(e.n);
        if (e.url) setPage(e.url);
      }
      if (e.type === "status") {
        setStatus(e.status);
        if (e.status === "done" || e.status === "error" || e.status === "stopped") es.close();
        return;
      }
      setEvents((prev) => [...prev, e]);
    };
    return () => es.close();
  }, [jobId]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [events]);

  async function stop() {
    setStopping(true);
    try {
      await fetch(`/api/hunt/${jobId}/cancel`, { method: "POST" });
    } catch {
      setStopping(false);
    }
  }

  const findingCount = events.filter((e) => e.type === "finding").length;
  const done = status === "done" || status === "error" || status === "stopped";
  const label =
    status === "error"
      ? "hunt failed"
      : status === "stopped"
        ? "hunt stopped"
        : done
          ? "hunt complete"
          : "hunting…";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span
          className={`inline-flex items-center gap-2 font-mono ${done ? "text-smoke" : "text-proof"}`}
        >
          <span className={`h-2 w-2 rounded-full ${done ? "bg-smoke" : "animate-pulse bg-proof"}`} />
          {label}
        </span>
        {!done && stepN > 0 && <span className="font-mono text-smoke">step {stepN}</span>}
        {!done && page && (
          <span className="max-w-[46%] truncate rounded-full border border-edge px-2.5 py-0.5 font-mono text-xs text-smoke">
            {shortUrl(page)}
          </span>
        )}
        <span className="text-smoke">
          {findingCount} {findingCount === 1 ? "snag" : "snags"} so far
        </span>

        <div className="ml-auto flex items-center gap-2">
          {!done && (
            <button
              onClick={stop}
              disabled={stopping}
              className="rounded-lg border border-edge px-3 py-1.5 text-sm text-smoke transition-colors hover:border-ember/50 hover:text-ember disabled:opacity-60"
            >
              {stopping ? "stopping…" : "Stop hunt"}
            </button>
          )}
          {done && (
            <Link
              href={`/report/${jobId}`}
              className="rounded-lg bg-ember px-4 py-1.5 font-medium text-void transition-opacity hover:opacity-90"
            >
              View report
            </Link>
          )}
        </div>
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
            <img
              src={shot}
              alt="What the agent currently sees"
              className="h-full w-full object-cover object-top"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
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
              <div key={i} className="rise font-mono text-[13px] leading-relaxed">
                <span className="text-ember">
                  ⚑ {e.action.kind}
                  {e.action.target ? ` “${e.action.target}”` : ""}
                </span>
                {e.thought && <span className="text-smoke"> · {e.thought}</span>}
              </div>
            ) : e.type === "finding" ? (
              <div
                key={i}
                className="rise rounded-lg border border-proof/30 bg-proof/5 p-2.5 font-mono text-[13px]"
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
