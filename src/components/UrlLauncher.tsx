"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_TARGETS } from "@/lib/demos";

export default function UrlLauncher() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAuth, setShowAuth] = useState(false);
  const [loginUrl, setLoginUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [flows, setFlows] = useState("");

  async function run(target: string, withAuth = false) {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload: {
        url: string;
        auth?: { loginUrl?: string; username: string; password: string };
        flows?: string[];
      } = { url: target };
      if (withAuth && username && password) {
        payload.auth = { loginUrl: loginUrl.trim() || undefined, username, password };
      }
      const flowList = flows
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (flowList.length) payload.flows = flowList;
      const res = await fetch("/api/hunt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
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

  const field =
    "min-w-0 flex-1 rounded-lg border border-edge bg-ash px-4 py-2.5 font-mono text-sm text-bone placeholder:text-smoke/70 focus:border-proof/60";

  return (
    <div id="try" className="mx-auto mt-10 w-full max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(url.trim(), showAuth);
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

      <button
        type="button"
        onClick={() => setShowAuth((s) => !s)}
        className="mt-3 text-sm text-smoke transition-colors hover:text-bone"
      >
        {showAuth ? "− Hide login" : "+ Behind a login?"}
      </button>

      {showAuth && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl border border-edge bg-ash/40 p-4">
          <input
            inputMode="url"
            placeholder="Login page URL (optional, defaults to the target)"
            value={loginUrl}
            onChange={(e) => setLoginUrl(e.target.value)}
            className={field}
          />
          <input
            autoComplete="off"
            placeholder="Email or username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={field}
          />
          <input
            type="password"
            autoComplete="off"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
          <p className="text-xs text-smoke">
            We use it once for this hunt. It is never saved and never sent to the AI.
            Only the browser uses it to log in.
          </p>
        </div>
      )}

      <div className="mt-2">
        <textarea
          value={flows}
          onChange={(e) => setFlows(e.target.value)}
          rows={2}
          placeholder="Flows to test end-to-end (optional, one per line). For example, sign up for an account"
          className="w-full resize-none rounded-lg border border-edge bg-ash px-4 py-2.5 text-sm text-bone placeholder:text-smoke/70 focus:border-proof/60"
        />
        <p className="mt-1 text-xs text-smoke">
          Snag also auto-detects a couple of key flows.
        </p>
      </div>

      {error && <p className="mt-2 text-sm text-ember">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-smoke">
        <span>try one free, no signup:</span>
        {DEMO_TARGETS.map((d) => (
          <button
            key={d.url}
            onClick={() => run(d.url)}
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
