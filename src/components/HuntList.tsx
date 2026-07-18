"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Job } from "@/lib/types";

type Row = Job & { findingCount: number };
type Filter = "all" | "running" | "done";

function statusTone(status: string) {
  if (status === "done") return "text-proof";
  if (status === "error") return "text-ember";
  return "text-smoke";
}

export default function HuntList({ jobs }: { jobs: Row[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(
    () =>
      jobs.filter((j) => {
        const running = j.status === "running" || j.status === "queued";
        if (filter === "running" && !running) return false;
        if (filter === "done" && j.status !== "done") return false;
        if (q && !j.url.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [jobs, q, filter],
  );

  const chip = (f: Filter, label: string) => (
    <button
      onClick={() => setFilter(f)}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        filter === f ? "bg-ember/15 text-ember" : "border border-edge text-smoke hover:text-bone"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by URL…"
          aria-label="Search hunts"
          className="min-w-0 flex-1 rounded-lg border border-edge bg-ash px-4 py-2 text-sm text-bone placeholder:text-smoke/70 focus:border-proof/60"
        />
        <div className="flex gap-2">
          {chip("all", "All")}
          {chip("running", "Running")}
          {chip("done", "Done")}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-smoke">No hunts match.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[color:var(--edge)] overflow-hidden rounded-xl border border-edge bg-ash/40">
          {rows.map((j) => {
            const running = j.status === "running" || j.status === "queued";
            return (
              <li key={j.id}>
                <Link
                  href={running ? `/hunt/${j.id}` : `/report/${j.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ash/60"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-bone">{j.url}</span>
                  <span className="hidden text-xs text-smoke sm:inline">
                    {new Date(j.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-smoke">
                    {j.findingCount} {j.findingCount === 1 ? "snag" : "snags"}
                  </span>
                  <span className={`font-mono text-xs ${statusTone(j.status)}`}>{j.status}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
