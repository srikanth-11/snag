"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function NameForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await createClient().auth.updateUser({ data: { name } });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved.");
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <label htmlFor="name" className="text-sm text-bone">
        Display name
      </label>
      <div className="flex gap-2">
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="min-w-0 flex-1 rounded-lg border border-edge bg-ash px-4 py-2.5 text-sm text-bone placeholder:text-smoke/70 focus:border-proof/60"
        />
        <button
          type="submit"
          disabled={saving}
          className="shrink-0 rounded-lg bg-ember px-4 py-2.5 text-sm font-medium text-void transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "…" : "Save"}
        </button>
      </div>
    </form>
  );
}

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
