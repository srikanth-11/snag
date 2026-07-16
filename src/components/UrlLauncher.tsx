"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMOS = [
  { label: "demo-shop", path: "/seed/buggy-site" },
  { label: "demo-docs", path: "/seed/demo-docs" },
  { label: "demo-dash", path: "/seed/demo-dash" },
];

export default function UrlLauncher() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(target: string) {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/hunt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      if (res.status === 401) {
        router.push("/signup?next=/");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "Something went wrong. Try again.");
        setBusy(false);
        return;
      }
      router.push(`/hunt/${data.id}`);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setBusy(false);
    }
  }

  return (
    <div id="try" className="mx-auto mt-10 w-full max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(url.trim());
        }}
        className="flex gap-2"
      >
        <input
          name="url"
          inputMode="url"
          placeholder="https://your-app.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-edge bg-ash px-4 py-3 font-mono text-sm text-bone placeholder:text-smoke/70 focus:border-proof/60"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-lg bg-ember px-5 py-3 font-medium text-void transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Releasing…" : "Run Snag"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-ember">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-smoke">
        <span>try:</span>
        {DEMOS.map((d) => (
          <button
            key={d.label}
            onClick={() => run(`${location.origin}${d.path}`)}
            disabled={busy}
            className="rounded-full border border-edge px-3 py-1 font-mono text-xs text-bone transition-colors hover:border-proof/50 hover:text-proof disabled:opacity-60"
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
