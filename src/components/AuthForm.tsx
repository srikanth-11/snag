"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/env";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!hasSupabase) {
    return (
      <p className="text-sm text-smoke">
        Auth isn’t configured yet. Add your Supabase keys to <code>.env.local</code> and restart.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setMessage({ tone: "error", text: error.message });
      toast.error(error.message);
      return;
    }
    if (mode === "signup") {
      setMessage({
        tone: "info",
        text: "Account created. Check your email to confirm, then log in.",
      });
      toast.success("Account created. Check your email to confirm.");
      return;
    }
    toast.success("Welcome back.");
    router.push(next);
    router.refresh();
  }

  const label = "text-sm text-bone";
  const field =
    "w-full rounded-lg border border-edge bg-ash px-4 py-2.5 text-sm text-bone placeholder:text-smoke/70 focus:border-proof/60";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={label}>
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@work.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={label}>
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="8+ characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-1 rounded-lg bg-ember px-4 py-2.5 font-medium text-void transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "…" : mode === "login" ? "Log in" : "Create account"}
      </button>

      {message && (
        <p
          role={message.tone === "error" ? "alert" : undefined}
          className={`text-sm ${message.tone === "error" ? "text-ember" : "text-proof"}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
