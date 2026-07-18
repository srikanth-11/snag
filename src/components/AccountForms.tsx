"use client";

import { useState } from "react";

export function DeleteAccount() {
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!confirm("Delete your account and all your hunts? This can't be undone.")) return;
    setBusy(true);
    await fetch("/api/account/delete", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  }
  return (
    <button
      onClick={del}
      disabled={busy}
      className="rounded-lg border border-ember/50 px-4 py-2 text-sm text-ember transition-colors hover:bg-ember/10 disabled:opacity-60"
    >
      {busy ? "Deleting…" : "Delete account"}
    </button>
  );
}
